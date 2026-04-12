### Cookies

Cookies store small pieces of data sent with requests to a domain.

- **Key point** -> Use `HttpOnly`, `Secure`, `SameSite` for safety.
- **Key point** -> Cookies are automatic; JS can’t read HttpOnly.
- **Gotcha** -> Missing SameSite can expose CSRF risk.

Example:
```http
Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Lax
```
