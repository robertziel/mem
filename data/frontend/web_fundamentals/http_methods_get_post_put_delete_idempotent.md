### HTTP Methods & Idempotency

HTTP methods describe the intent of a request.

- **Key point** -> GET = read, POST = create, PUT = replace, PATCH = update, DELETE = remove.
- **Key point** -> GET, PUT, DELETE are idempotent (repeating them gives the same result).
- **Key point** -> POST is usually not idempotent (repeating may create duplicates).
- **Gotcha** -> Using GET for mutations breaks caching and violates HTTP semantics.
- **Gotcha** -> Idempotent APIs simplify retries — safe to resend on timeout.

Example:
```http
PUT /users/123   -> same body = same result (idempotent)
DELETE /users/123 -> already deleted = still 200/404 (idempotent)
POST /orders     -> creates new order each time (NOT idempotent)
```
