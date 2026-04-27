### OWASP Top 10 (2021, current official) Overview

**What OWASP Top 10 is:**
- Industry-standard awareness document for web application security
- Updated periodically based on real-world vulnerability data
- Every backend engineer should know these categories
- The 2021 edition is the current official release. A 2025 edition was planned but check https://owasp.org/Top10/ for the latest — do not rely on unofficial previews.

**OWASP Top 10 — 2021 Edition (current official):**

| # | Category | Description |
|---|----------|-------------|
| A01 | **Broken Access Control** | Users act outside intended permissions |
| A02 | **Cryptographic Failures** | Weak encryption, plaintext secrets, broken TLS |
| A03 | **Injection** | SQL, XSS, command injection via untrusted input |
| A04 | **Insecure Design** | Flawed business logic, missing threat modeling |
| A05 | **Security Misconfiguration** | Default configs, open cloud storage, verbose errors |
| A06 | **Vulnerable and Outdated Components** | Known CVEs in libraries/frameworks |
| A07 | **Identification and Authentication Failures** | Broken auth, credential stuffing, weak passwords |
| A08 | **Software and Data Integrity Failures** | Insecure deserialization, unsigned updates, supply-chain attacks |
| A09 | **Security Logging and Monitoring Failures** | No audit trail, no alerting on attacks |
| A10 | **Server-Side Request Forgery (SSRF)** | Server makes unvalidated outbound requests |

**A01: Broken Access Control (most critical):**
- User accesses another user's data by changing ID in URL
- Regular user accesses admin endpoints
- IDOR (Insecure Direct Object Reference): `/api/users/123/orders` → change to `/api/users/456/orders`
- Prevention: server-side authorization on every request, deny by default

**A02: Security Misconfiguration:**
- Default credentials left in place
- Unnecessary features enabled (directory listing, debug mode)
- Missing security headers
- Overly permissive CORS
- Stack traces exposed in error responses
- Prevention: hardened defaults, automated security scanning, minimal permissions

**A05: Injection:**
- SQL: `SELECT * FROM users WHERE id = '${user_input}'` → `' OR 1=1 --`
- XSS: rendering user input as HTML without escaping
- Command: passing user input to `system()` or `exec()`
- Prevention: parameterized queries, input validation, output encoding, CSP

**A07: Authentication Failures:**
- No rate limiting on login (brute force)
- Weak password policies
- Session tokens in URL
- No MFA option
- Credential stuffing (reused passwords from breaches)
- Prevention: rate limiting, strong passwords + MFA, secure session management

**Security headers checklist:**
```
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

**Rule of thumb:** Broken Access Control is #1 — always check authorization server-side. Never trust client input. Use parameterized queries. Set security headers. Keep dependencies updated. Log security events. Every endpoint needs authentication + authorization checks.
