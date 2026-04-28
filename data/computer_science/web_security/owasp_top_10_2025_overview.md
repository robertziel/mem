### OWASP Top 10 (2021) — Web App Security Overview

**Definition:** the **OWASP Top 10** is the industry-standard awareness list of the most critical web application security risks. The **2021 edition is the current official release** — a 2025 edition has been discussed but check **owasp.org/Top10/** for the latest official version. **Don't rely on unofficial previews.**

**The 2021 Top 10 — at a glance:**

| # | Category | One-line summary |
|---|---|---|
| **A01** | Broken Access Control | Users act outside intended permissions |
| **A02** | Cryptographic Failures | Weak/missing crypto, plaintext secrets, broken TLS |
| **A03** | Injection | SQL, XSS, command injection via untrusted input |
| **A04** | Insecure Design | Flawed business logic; missing threat modeling |
| **A05** | Security Misconfiguration | Default configs, open buckets, verbose errors |
| **A06** | Vulnerable & Outdated Components | Known CVEs in libs / frameworks / containers |
| **A07** | Identification & Authentication Failures | Broken auth, credential stuffing, weak passwords |
| **A08** | Software & Data Integrity Failures | Insecure deserialization, supply-chain compromise |
| **A09** | Security Logging & Monitoring Failures | No audit trail, no alerts on attacks |
| **A10** | Server-Side Request Forgery (SSRF) | Server makes unvalidated outbound requests |

**A01 — Broken Access Control (the #1 risk):**

| Sub-issue | Example |
|---|---|
| **IDOR** (Insecure Direct Object Reference) | `/users/123/orders` → change to `/users/456/orders` |
| Vertical privilege escalation | Regular user accesses admin endpoint |
| Horizontal privilege escalation | One user accesses another user's data |
| Forced browsing | Access pages you weren't navigated to |
| Method tampering | Change PUT to DELETE |
| Token / cookie tampering | Modify role claim |

**A01 defenses:**

| Defense | Detail |
|---|---|
| **Authorize on every request** | Don't trust the client |
| **Default deny** | Whitelist what's allowed |
| **Server-side checks** | Never UI-only |
| **Use a policy framework** | CASL, Pundit, OPA |
| **Object-level checks** | "Does THIS user own THIS resource?" |
| **Audit log access** | Detect IDOR attempts |

**A02 — Cryptographic Failures:**

| Issue | Detail |
|---|---|
| Storing passwords with MD5/SHA1/SHA256 | Use bcrypt/Argon2 |
| HTTP instead of HTTPS | Man-in-the-middle |
| Weak ciphers (TLS 1.0/1.1) | TLS 1.2+ only |
| Missing HSTS | Browsers can downgrade |
| Hardcoded secrets in code/repo | Use Secrets Manager |
| Plaintext PII in logs | Filter / redact |
| Same key for multiple uses | Per-purpose keys |
| Predictable random for tokens | Use CSPRNG |

**A03 — Injection (still critical):**

| Type | Defense |
|---|---|
| **SQL injection** | Parameterized queries / prepared statements |
| **NoSQL injection** | Same — escape user input |
| **Command injection** | Avoid `system()` / `exec()` with user input |
| **XSS** (rendering as HTML) | Output encoding + CSP |
| **LDAP injection** | Parameterized queries |
| **XPath / XML injection** | Parse safely |
| **OS command injection** | Use proper APIs, never shell-out |

```ruby
# ❌ VULNERABLE
User.where("name = '#{params[:name]}'")

# ✅ SAFE — parameterized
User.where("name = ?", params[:name])
User.where(name: params[:name])
```

**A04 — Insecure Design:**

| Issue | Detail |
|---|---|
| No rate limiting | Brute force, abuse |
| No threat modeling | Missing attack vectors |
| Trust boundaries unclear | Internal vs external assumptions |
| Race conditions in business logic | TOCTOU bugs |
| Missing reauthentication for sensitive ops | "Change password" without prompt |
| Defense | Threat modeling, secure design patterns |

**A05 — Security Misconfiguration:**

| Issue | Detail |
|---|---|
| Default credentials in place | `admin/admin` |
| Unnecessary services enabled | Directory listing, debug pages |
| Stack traces in error responses | Reveal internals |
| Missing security headers | See checklist below |
| Overly permissive CORS | `Access-Control-Allow-Origin: *` |
| Open S3 buckets | Public read by accident |
| Outdated software with known issues | Patch / update |
| Defense | Hardened defaults, automated scanning |

**Security headers checklist:**

```
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

**A06 — Vulnerable & Outdated Components:**

| Defense | Detail |
|---|---|
| Lock files committed | Pin versions |
| Dependency scanning in CI | npm audit, bundle audit, Snyk, Trivy |
| Auto-update bots | Dependabot, Renovate |
| SBOM generation | Know what's in production |
| Lock internal scopes | Prevent dep confusion |
| Patch management process | Track and ship |

**A07 — Identification & Authentication Failures:**

| Issue | Defense |
|---|---|
| No rate limit on login | Per-IP + per-user limits |
| Weak password policy | Min 8+, block common passwords |
| Session token in URL | Use cookies (HttpOnly + Secure) |
| Reused passwords | Block leaked passwords (HIBP) |
| No MFA option | Strongly recommended |
| Predictable session IDs | Use CSPRNG |
| Session fixation | Regenerate on login |

**A08 — Software & Data Integrity Failures:**

| Issue | Defense |
|---|---|
| Insecure deserialization | Whitelist, sign, validate |
| Unsigned package updates | Verify signatures |
| Compromised CI / build | Sigstore / Cosign attestations |
| Untrusted CDN scripts | SRI (Subresource Integrity) |
| No code signing | Sign artifacts |

**A09 — Security Logging & Monitoring Failures:**

| Issue | Detail |
|---|---|
| No audit log | Can't trace attacks |
| Logs not centralized | Hard to query |
| No alerting on suspicious patterns | Attacks unnoticed |
| Logs deletable by attacker | Immutable storage |
| Sensitive data in logs | Filter PII / secrets |
| Defense | SIEM, alerting, retention, immutability |

**A10 — Server-Side Request Forgery (SSRF):**

| Pattern | Risk |
|---|---|
| Image fetcher with user-supplied URL | Hit internal services (`169.254.169.254` = AWS metadata) |
| Webhook receiver | Send to internal `localhost:6379` (Redis) |
| Document parser | Hit `file://` URIs |
| URL preview / unfurl | Probe internal network |

**SSRF defenses:**

| Defense | Detail |
|---|---|
| Whitelist allowed destinations | Specific domains only |
| Block private/internal IPs | RFC 1918, link-local |
| Block metadata endpoints | `169.254.169.254`, `metadata.google.internal` |
| Use IMDSv2 (AWS) | Token-based, harder to SSRF |
| Network segmentation | App subnet can't reach internal services it shouldn't |
| Timeouts | Reduce probe success |

**Defense priorities — in order:**

| Priority | Action |
|---|---|
| 1 | **Authorize every request** (A01) |
| 2 | **Parameterized queries** (A03 SQL) |
| 3 | **Output encoding + CSP** (A03 XSS) |
| 4 | **Rate limit auth endpoints** (A07) |
| 5 | **Use bcrypt/Argon2 + MFA** (A07) |
| 6 | **Set security headers** (A05) |
| 7 | **Scan dependencies in CI** (A06) |
| 8 | **HTTPS everywhere + HSTS** (A02) |
| 9 | **Secrets manager** (A02) |
| 10 | **Logging + alerting** (A09) |

**OWASP Top 10 over time:**

| Edition | Notable changes |
|---|---|
| 2017 | Injection #1, broken auth #2 |
| 2021 (current) | **Broken Access Control rose to #1** |
| 2025 (planned) | Verify on owasp.org/Top10/ |

**Cross-references:**

- Authentication attacks: [authentication_attacks_*.md](authentication_attacks_brute_force_session.md)
- XSS prevention: [xss_*.md](xss_input_sanitization_csp_dom_purification.md)
- CSRF prevention: [csrf_*.md](csrf_origin_referer_token_samesite.md)
- SQL injection: [sql_injection_*.md](sql_injection_orm_safe_queries_parameterized.md)
- Supply chain security: [supply_chain_*.md](supply_chain_dependency_scanning_sbom.md)

**Rule of thumb:** **Broken Access Control is #1** — always check authorization server-side, default-deny, scope to the object. **Never trust client input** — parameterize queries, escape output, set a CSP. **Use bcrypt/Argon2 + MFA + rate limiting** on auth endpoints. **Set security headers**, **scan dependencies in CI**, **HTTPS everywhere**, **log security events** with alerting. The Top 10 is awareness — defense in depth is the real answer.
