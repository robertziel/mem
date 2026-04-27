### CSP

Content Security Policy restricts which resources the browser can load.

- **Key point** -> Blocks inline scripts unless allowed.
- **Key point** -> Reduces XSS impact.
- **Gotcha** -> Needs careful tuning for third-party scripts.

Example:
```http
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.example.com
```
