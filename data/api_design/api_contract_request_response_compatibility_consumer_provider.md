### API Contract

**What an API contract includes:**
- Endpoint shape: method + path + path params + query params
- Request body schema, required headers, auth requirements
- Response schema, status codes, pagination, error format
- Behavioral guarantees: idempotency, ordering, timeouts, rate limits
- Lifecycle rules: versioning, deprecation, backward compatibility

**Producer vs consumer:**
- Producer owns the implementation and published contract
- Consumer depends on the contract, not internal implementation details
- Breaking a contract can fail clients even when server tests still pass

**Breaking vs non-breaking changes:**
- Breaking: remove field, rename field, change type, tighten validation, change auth, remove endpoint
- Usually safe: add optional field, add new endpoint, add new enum value only if consumers are tolerant
- Sneaky breakage: changing pagination defaults, error shape, sort order, or nullability

**Example contract surface:**
```http
POST /v1/orders
Authorization: Bearer <token>
Content-Type: application/json
Idempotency-Key: 8f4f...
```

```json
{
  "customer_id": "cus_123",
  "items": [
    {"sku": "book-1", "quantity": 2}
  ]
}
```

```json
{
  "id": "ord_456",
  "status": "pending",
  "created_at": "2026-04-23T09:00:00Z"
}
```

**Good contract habits:**
- Publish examples for happy path and failure path
- Keep error codes stable and machine-readable
- Document which fields are nullable, optional, or deprecated
- Define retry behavior for 429 and 5xx responses
- Add contract tests for critical producer-consumer integrations

**Gotcha:** "It is backwards compatible because the JSON still parses" is not enough. Clients also depend on semantics, required fields, ordering, headers, and timing expectations.

**Rule of thumb:** Treat the API contract like a product interface, not an implementation detail. If a client would need code changes, assume it is a breaking contract change.
