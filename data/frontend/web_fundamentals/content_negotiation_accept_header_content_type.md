### Content Negotiation

Clients and servers agree on response format via headers.

- **Key point** -> Use `Accept` header to request types.
- **Key point** -> Server responds with `Content-Type`.
- **Gotcha** -> Mismatched headers lead to wrong formats.

Example:
```http
Accept: application/json
Content-Type: application/json
```
