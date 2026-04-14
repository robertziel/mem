### Authentication Attacks & Session Security

**Common authentication attacks:**

**1. Brute force:**
- Try every possible password for a known username
- Prevention: rate limiting (5 attempts/min), account lockout after N failures, CAPTCHA, MFA

**2. Credential stuffing:**
- Use leaked email/password pairs from other breaches
- Users reuse passwords across sites
- Prevention: MFA, breach detection (HaveIBeenPwned API), anomaly detection (new IP/device)

**3. Password spraying:**
- Try common passwords against many accounts (reverse brute force)
- Avoids lockout (1 attempt per account)
- Prevention: block common passwords, MFA, detect distributed login patterns

**4. Session hijacking:**
- Steal session token via XSS, network sniffing, or physical access
- Prevention: HttpOnly + Secure + SameSite cookies, HTTPS only, short session TTL

**5. Session fixation:**
- Attacker sets a known session ID before victim logs in
- Victim authenticates → attacker uses the pre-set session
- Prevention: regenerate session ID on login

**Secure session management:**
```
Set-Cookie: session_id=<random_256bit>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1800
```

| Flag | Purpose |
|------|---------|
| `HttpOnly` | Prevents JavaScript access (XSS can't steal cookie) |
| `Secure` | Only sent over HTTPS |
| `SameSite=Strict` | Not sent in cross-site requests (CSRF protection) |
| `Path=/` | Cookie sent for all paths |
| `Max-Age` | Expiry (1800 = 30 min) |

**Password storage:**
```ruby
# NEVER: plain text, MD5, SHA1, SHA256 (too fast to brute force)
# ALWAYS: bcrypt, scrypt, or Argon2 (intentionally slow)

# Rails (bcrypt via has_secure_password)
class User < ApplicationRecord
  has_secure_password  # uses bcrypt, stores password_digest
end

# Cost factor: higher = slower (12 is good default)
BCrypt::Password.create("password", cost: 12)
```

**MFA (Multi-Factor Authentication):**
- Something you know (password) + something you have (TOTP, SMS, hardware key)
- TOTP (Time-based One-Time Password): Google Authenticator, Authy
- WebAuthn/FIDO2: hardware security keys (strongest, phishing-resistant)
- SMS: weakest (SIM swapping attacks), but better than nothing

**Token-based auth security:**
- JWT: short expiry (15 min), signed (RS256 > HS256 for multi-service)
- Refresh tokens: stored securely (HTTP-only cookie), rotated on each use
- Access tokens: never in localStorage (XSS vulnerable), prefer HTTP-only cookie or in-memory

**Rate limiting for auth endpoints:**
```
/login:    5 attempts per minute per IP + per username
/register: 3 accounts per hour per IP
/reset:    3 requests per hour per email
```

**Rule of thumb:** bcrypt for password storage. Regenerate session on login. HttpOnly + Secure + SameSite cookies. Rate limit all auth endpoints. MFA is the strongest defense against credential attacks. Never store tokens in localStorage.
