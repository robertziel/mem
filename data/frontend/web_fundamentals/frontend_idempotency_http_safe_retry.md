### Idempotency

An idempotent request can be repeated without changing the result.

- **Key point** -> GET, PUT, DELETE are idempotent (by definition).
- **Key point** -> POST is usually not idempotent.
- **Gotcha** -> Idempotent APIs simplify retries.

Example:
```text
PUT /users/123 with same body -> same result
```
