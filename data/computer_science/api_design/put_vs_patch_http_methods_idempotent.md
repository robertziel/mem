### PUT vs PATCH (short)

- **PUT** replaces a resource (full update, idempotent).
- **PATCH** partially updates a resource (idempotent in practice, but can be implemented non-idempotently).

**Rule of thumb:**
- Use PUT when the client sends the full representation.
- Use PATCH when sending only changed fields.
