### OWASP Top 10 (2025) Overview

**What OWASP Top 10 is:**
- Industry-standard awareness document for web application security
- Updated periodically based on real-world vulnerability data
- Every backend engineer should know these categories

**OWASP Top 10 — 2025 Edition:**

| # | Category | Description |
|---|----------|-------------|
| A01 | **Broken Access Control** | Users act outside intended permissions |
| A02 | **Security Misconfiguration** | Default configs, open cloud storage, verbose errors |
| A03 | **Software Supply Chain Failures** | Vulnerable dependencies, compromised packages |
| A04 | **Cryptographic Failures** | Weak encryption, plaintext secrets, broken TLS |
| A05 | **Injection** | SQL, XSS, command injection via untrusted input |
| A06 | **Vulnerable and Outdated Components** | Known CVEs in libraries/frameworks |
| A07 | **Authentication Failures** | Broken auth, credential stuffing, weak passwords |
| A08 | **Data Integrity Failures** | Insecure deserialization, unsigned updates |
| A09 | **Security Logging & Monitoring Failures** | No audit trail, no alerting on attacks |
| A10 | **Mishandling of Exceptional Conditions** | Improper error handling, logic errors |

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
