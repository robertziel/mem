### HTTP Methods

HTTP methods describe the intent of a request.

- **Key point** -> GET = read, POST = create, PUT = replace, PATCH = update, DELETE = remove.
- **Key point** -> GET should be idempotent.
- **Gotcha** -> Using GET for mutations breaks caching.

Example:
```http
PATCH /users/123
```
