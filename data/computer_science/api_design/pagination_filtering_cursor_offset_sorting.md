### API Pagination and Filtering

**Pagination strategies:**

**Offset-based (simplest):**
```
GET /users?page=3&per_page=20
```
```sql
SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 40;
```
- Pros: simple, allows jumping to any page
- Cons: skips/duplicates with concurrent inserts, slow on large offsets (DB scans)

**Cursor-based (recommended):**
```
GET /users?cursor=eyJpZCI6MTAwfQ&limit=20
```
```sql
SELECT * FROM users WHERE id > 100 ORDER BY id LIMIT 20;
```
- Pros: consistent with concurrent changes, fast (index scan)
- Cons: can't jump to arbitrary page, cursor is opaque
- Cursor = Base64-encoded last item's sort key

**Keyset pagination (cursor variant):**
```sql
-- Paginate by created_at (with tie-breaking on id)
SELECT * FROM orders
WHERE (created_at, id) > ('2024-01-15 10:00:00', 500)
ORDER BY created_at, id
LIMIT 20;
```

**Response format:**
```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJjcmVhdGVkX2F0IjoiMjAyNC0wMS0xNVQxMDowMDowMFoiLCJpZCI6NTIwfQ",
    "has_more": true,
    "total_count": 1543     // optional, expensive to compute
  }
}
```

**Filtering patterns:**
```
# Exact match
GET /orders?status=pending

# Multiple values (OR)
GET /orders?status=pending,shipped

# Comparison
GET /orders?created_after=2024-01-01&total_min=100

# Full-text search
GET /users?q=john+doe

# Nested filter (for complex APIs)
GET /orders?filter[status]=pending&filter[total][gte]=100
```

**Sorting:**
```
GET /orders?sort=created_at          # ascending (default)
GET /orders?sort=-created_at         # descending (- prefix)
GET /orders?sort=-created_at,total   # multi-field
```

**Field selection (sparse fieldsets):**
```
GET /users/123?fields=id,name,email
```
- Reduces payload size
- Reduces DB load (select only needed columns)

**Bulk operations:**
```json
// Batch create
POST /users/bulk
{
  "users": [
    {"name": "Alice", "email": "alice@example.com"},
    {"name": "Bob", "email": "bob@example.com"}
  ]
}

// Batch response (partial success)
{
  "results": [
    {"status": "created", "id": 1},
    {"status": "error", "error": "email already exists"}
  ]
}
```

**Rule of thumb:** Cursor-based pagination for anything with concurrent writes or large datasets. Offset-based only for small, static datasets. Always include `has_more` in response. Limit `per_page` maximum (e.g., 100). Support filtering and sorting via query params.
