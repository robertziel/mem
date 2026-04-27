### REST API Best Practices

**URL design:**
- Nouns, not verbs: `/users/123` not `/getUser?id=123`
- Plural resources: `/users`, `/orders`
- Nested for relationships: `/users/123/orders`
- Keep URLs shallow (max 2 levels of nesting)
- Lowercase, hyphens for multi-word: `/order-items`

**HTTP methods mapping:**
```
GET    /users          List users
GET    /users/123      Get one user
POST   /users          Create user
PUT    /users/123      Full update (replace)
PATCH  /users/123      Partial update
DELETE /users/123      Delete user
```

**Status codes:**
```
200 OK           - Success (GET, PUT, PATCH)
201 Created      - Success (POST), include Location header
204 No Content   - Success (DELETE)
400 Bad Request  - Validation error, malformed request
401 Unauthorized - Not authenticated
403 Forbidden    - Authenticated but not authorized
404 Not Found    - Resource doesn't exist
409 Conflict     - Duplicate, state conflict
422 Unprocessable Entity - Validation error (semantic)
429 Too Many Requests - Rate limited
500 Internal Server Error - Server bug
503 Service Unavailable - Temporary, retry later
```

**Pagination (cursor-based preferred):**
```json
// Request
GET /users?cursor=eyJpZCI6MTAwfQ&limit=20

// Response
{
  "data": [...],
  "meta": {
    "next_cursor": "eyJpZCI6MTIwfQ",
    "has_more": true
  }
}
```
- Cursor-based: consistent with concurrent inserts/deletes
- Offset-based: `?page=3&per_page=20` (simple but skips/duplicates with concurrent changes)

**Filtering, sorting, searching:**
```
GET /orders?status=pending&created_after=2024-01-01
GET /orders?sort=-created_at,total     (- prefix for descending)
GET /users?q=john                       (full-text search)
```

**Error response format:**
```json
{
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "details": [
      {"field": "email", "message": "is not a valid email address"},
      {"field": "age", "message": "must be at least 18"}
    ]
  }
}
```

**Versioning:**
- URL path: `/v1/users` (most common, explicit)
- Header: `Accept: application/vnd.api+json;version=2` (cleaner but less visible)
- Query param: `/users?version=2` (easy but messy)

**HATEOAS (links in responses):**
```json
{
  "id": 123,
  "name": "Alice",
  "links": {
    "self": "/users/123",
    "orders": "/users/123/orders"
  }
}
```

**Rule of thumb:** Use nouns and plural resources. Return appropriate status codes. Cursor-based pagination for large datasets. Version via URL path. Consistent error format. Include rate limit headers.
