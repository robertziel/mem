### Authentication Attacks & Session Security

**Definition:** authentication is the most-attacked surface of any web app. The five attack classes — **brute force**, **credential stuffing**, **password spraying**, **session hijacking**, **session fixation** — each have specific defenses. Combine **bcrypt password hashing**, **secure cookie flags**, **rate limiting**, and **MFA** for layered defense.

**Five common authentication attacks:**

| Attack | Target | Mechanism | Primary defense |
|---|---|---|---|
| **Brute force** | One account | Try every password | Rate limit + lockout + MFA |
| **Credential stuffing** | Many accounts | Reuse leaked email:password pairs | MFA + breach detection + anomaly |
| **Password spraying** | Many accounts | Try common passwords across many users | Block weak passwords + MFA + distributed-pattern detection |
| **Session hijacking** | Active session | Steal cookie / token | HttpOnly + Secure + SameSite + HTTPS |
| **Session fixation** | Pre-login session | Set known session ID, victim logs in | Regenerate session ID on login |

**1. Brute force — exhaustive password search:**

| Defense | Detail |
|---|---|
| Rate limit per (IP, username) | E.g., 5 attempts / minute |
| Account lockout after N failed | Or progressive backoff |
| CAPTCHA after N | Human check |
| Account-takeover detection | Geo/device anomaly |
| **MFA** | Renders password alone insufficient |
| Strong password policy | Length > complexity |

**2. Credential stuffing — leaked-pair reuse:**

| Defense | Detail |
|---|---|
| **HaveIBeenPwned API check** at registration / login | Refuse known-breached passwords |
| Anomaly detection | Login from new country / device |
| **MFA** | Top defense |
| Captcha/JS challenge for risky logins | Bot defense |
| Password breach alerting | Notify users to rotate |
| Bot-detection (fingerprinting, hCaptcha) | Reduce automation |

**3. Password spraying — common passwords across many accounts:**

| Defense | Detail |
|---|---|
| **Block common passwords** | Top 1M list |
| Login monitoring across whole org | Detect distributed pattern |
| Per-IP attempt limits | Catch obvious cases |
| **Geographic rate limits** | Detect scattered IP usage |
| **MFA** | Mitigates even if password leaked |
| Passwordless / WebAuthn | Eliminates the attack |

**4. Session hijacking — steal the cookie:**

| Defense | Detail |
|---|---|
| **HTTPS everywhere** + HSTS | No clear-text cookies |
| `HttpOnly` cookie | JS can't read it (XSS-resistant) |
| `Secure` cookie | Only sent over HTTPS |
| `SameSite=Strict` or `Lax` | CSRF + cross-site theft mitigation |
| Short session TTL | Reduce window |
| Rotate session ID periodically | Defense in depth |
| Bind session to user-agent / IP (carefully) | Detect theft (false positives possible) |

**5. Session fixation — pre-set session:**

```
T1: Attacker visits /login, gets session ID = ABC
T2: Attacker tricks victim into using session ABC
T3: Victim logs in — server keeps session ABC, now authenticated
T4: Attacker uses session ABC, has victim's account
```

| Defense | Detail |
|---|---|
| **Regenerate session ID on login** | New ID after auth |
| **Regenerate on privilege escalation** | Admin actions |
| Rails: `reset_session` | Built-in |
| Avoid putting session ID in URL | Visible to attackers |

**Secure cookie example:**

```
Set-Cookie: session_id=<256-bit-random>;
            HttpOnly;
            Secure;
            SameSite=Strict;
            Path=/;
            Max-Age=1800;
            Domain=app.example.com
```

| Flag | Purpose |
|---|---|
| `HttpOnly` | Inaccessible to JS — blocks cookie-stealing XSS |
| `Secure` | HTTPS only |
| `SameSite=Strict` | Not sent on cross-origin requests |
| `SameSite=Lax` | Sent on top-level navigation only |
| `SameSite=None` (with `Secure`) | Always sent — for legitimate cross-site cases |
| `Path` | Scope of cookie |
| `Max-Age` | Expiry in seconds |
| `Domain` | Which subdomains see it |

**Password storage — use a real KDF:**

| Algorithm | Use |
|---|---|
| **bcrypt** | Default if you don't know |
| **scrypt** | Memory-hard, good if memory cost matters |
| **Argon2id** | Modern winner of PHC; preferred for new systems |
| **PBKDF2** | NIST-approved; OK if you must |
| ❌ MD5, SHA1, SHA256 | Far too fast — brute-forceable |
| ❌ Plain text | Game over |

```ruby
# Rails — has_secure_password (bcrypt under the hood)
class User < ApplicationRecord
  has_secure_password
  # adds password_digest column; getters/setters
end

# Direct
BCrypt::Password.create("hunter2", cost: 12)   # cost ~250ms
```

| Tuning | Detail |
|---|---|
| Bcrypt cost factor | 10–12 typical (~100–500ms) |
| Aim for ~100ms per hash | Slow attackers, tolerable for users |
| Re-hash on cost upgrade | Migrate users gradually on login |
| Pepper (server-side secret) | Optional extra layer |

**MFA (Multi-Factor Authentication):**

| Factor | Examples | Strength |
|---|---|---|
| **Knowledge** | Password, security Q | Weakest alone |
| **Possession** | TOTP, SMS, hardware key | Stronger |
| **Inherence** | Biometric | Strong (devices vary) |
| **Location** | Geo / network | Weak alone, OK as signal |

**MFA methods ranked:**

| Method | Phishing-resistant? | Notes |
|---|---|---|
| **WebAuthn / FIDO2 (hardware key)** | ✅ Yes | Strongest |
| **Platform passkeys** (Apple, Google) | ✅ Yes | Strong + user-friendly |
| **TOTP** (Authy, Google Auth) | ❌ No | Strong against credential reuse |
| **Push notification** (Duo) | Depends | Good UX, "MFA fatigue" risk |
| **SMS** | ❌ No (SIM swap) | Better than nothing |
| **Email codes** | ❌ No | Weakest |

**Token-based auth (JWT, OAuth):**

| Practice | Detail |
|---|---|
| Short access token TTL | 15 min typical |
| Refresh token rotation | One-use, swap on each refresh |
| Refresh token in HttpOnly cookie | Not in JS-accessible storage |
| **Never localStorage for tokens** | XSS readable |
| Sign with RS256 in multi-service | Public key validation |
| Revocation list / introspection | For long-lived tokens |
| Bind token to client (DPoP, mTLS) | Stops stolen-token replay |

**Auth endpoint rate limits (start here):**

| Endpoint | Per IP | Per user/email | Notes |
|---|---|---|---|
| `/login` | 5/min | 5/min | Combine — most aggressive |
| `/register` | 3/hour | n/a | Stop signup floods |
| `/password-reset` | 3/hour | 3/hour per email | Stop email harassment |
| `/mfa-verify` | 5/min | 5/min | Same as login |
| `/api/oauth/token` | Higher | Per client | Different model |

**Logging + alerting:**

| Event | Action |
|---|---|
| 5+ failed logins / minute / IP | Alert / temp ban |
| Login from new country | Email user |
| Login from new device | Step-up MFA |
| Password reset attempt | Audit log |
| MFA disabled | Alert user + admin |
| Session created | Audit (privacy-aware) |
| Privilege change | Re-auth + audit |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Storing tokens in `localStorage` | XSS reads them |
| Not regenerating session on login | Session fixation |
| Using SHA256 for password hashing | Brute force trivial |
| Allowing extremely long passwords without limit | DoS via expensive hashing |
| MFA with SMS only | SIM swap |
| Permitting password "remembered" without rotation | Stale credentials linger |
| Silently truncating bcrypt input >72 bytes | Long passwords collide |
| Checking password before username (timing attack) | Username enumeration |
| Generic error messages but different timing | Username enumeration via latency |
| No rate limit on password reset | Email harassment |

**Username enumeration — subtle but common:**

| Where | Defense |
|---|---|
| Login: "user not found" vs "wrong password" | Same message for both |
| Registration: "email already exists" | "If account exists, we've sent a reset" |
| Password reset: differentiating responses | Always "if the email is on file" |
| Different response timings | Constant-time auth path |

**Cross-references:**

- XSS prevention: [xss_*.md](xss_input_sanitization_csp_dom_purification.md)
- CSRF prevention: [csrf_*.md](csrf_token_double_submit_samesite_origin.md)
- TLS / HTTPS: [tls_*.md](tls_https_cipher_suites_certificate_validation.md)
- OIDC / OAuth: [oidc_*.md](oidc_oauth_authentication_authorization_flows.md)

**Rule of thumb:** **bcrypt (or Argon2id) for password storage**, **regenerate session on login**, **`HttpOnly + Secure + SameSite`** cookies always, **rate limit auth endpoints** per (IP, identity) with low caps, and **MFA — preferably WebAuthn/passkeys** — for any account that matters. Tokens **never** in `localStorage`. Treat **username enumeration** as a leak — make all auth responses indistinguishable.
