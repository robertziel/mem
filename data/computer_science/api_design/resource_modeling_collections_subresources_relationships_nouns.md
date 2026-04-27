### API Resource Modeling

**What a resource is:**
- A business thing with identity and state
- Usually modeled as a noun: user, order, invoice, shipment
- Exposed as collection and member endpoints

**Typical shape:**
```http
GET    /orders
POST   /orders
GET    /orders/{id}
PATCH  /orders/{id}
DELETE /orders/{id}
```

**Collections, members, subresources:**
- Collection: `/orders`
- Member: `/orders/{id}`
- Subresource: `/orders/{id}/items`
- Relationship endpoint when useful: `/users/{id}/roles`

**Good modeling habits:**
- Pick stable identifiers
- Use nouns, not RPC-style verbs in paths
- Nest only when the parent-child relationship is strong
- Keep URLs shallow and predictable

**When an action endpoint is acceptable:**
- The domain operation is not a normal CRUD update
- Example: `/payments/{id}/capture` or `/orders/{id}/cancel`
- Prefer a clear domain command over awkward fake resources

**Resource boundaries to think through:**
- Is address embedded under user or a separate resource?
- Is line item updated through order or individually?
- Are filters modeling access patterns the client really needs?

**Example response shape:**
```json
{
  "id": "ord_123",
  "status": "pending",
  "customer_id": "cus_9",
  "items": [
    {"sku": "book-1", "quantity": 2}
  ]
}
```

**Common mistakes:**
- Endpoints mirror database tables instead of business concepts
- Over-nesting: `/companies/1/departments/2/teams/3/users/4`
- Mixing resource and action naming styles randomly

**Rule of thumb:** Model the business nouns clients actually care about. Use CRUD for normal state changes and explicit action endpoints only for true domain commands.
