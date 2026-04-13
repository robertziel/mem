### JWT

JWTs are signed tokens that carry claims for stateless authentication.

- **Key point** -> Use `Authorization: Bearer <token>`.
- **Key point** -> Validate signature and expiration on every request.
- **Gotcha** -> Don’t store JWTs in localStorage if XSS is a risk.

Example:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
