### Prevent XSS/CSRF in SPA

XSS is untrusted script execution; CSRF is unwanted authenticated requests.

- **Key point** -> XSS: escape/encode output, use CSP.
- **Key point** -> CSRF: SameSite cookies, CSRF tokens for state changes.
- **Gotcha** -> LocalStorage tokens are vulnerable to XSS.

Example:
```http
Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Strict
```
