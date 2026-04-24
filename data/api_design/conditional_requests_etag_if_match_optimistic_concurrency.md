### Conditional Requests and Optimistic Concurrency

**What conditional requests solve:**
- Cache revalidation without sending full payloads again
- Lost updates when two clients edit the same resource concurrently

**Core headers:**
- `ETag` - version fingerprint for a representation
- `If-None-Match` - "send body only if changed"
- `If-Match` - "apply write only if version still matches"
- `Last-Modified` and `If-Modified-Since` - time-based alternative

**Cache revalidation flow:**
```http
GET /articles/123
ETag: "v7"

GET /articles/123
If-None-Match: "v7"

304 Not Modified
```

**Optimistic concurrency flow:**
```http
GET /orders/123
ETag: "v12"

PATCH /orders/123
If-Match: "v12"
Content-Type: application/json

{"status": "confirmed"}
```

- If version still matches: apply update
- If resource changed first: return `412 Precondition Failed`

**Status codes you will see:**
- `304 Not Modified` - cache still valid
- `412 Precondition Failed` - write condition failed
- `428 Precondition Required` - server requires conditional write
- `409 Conflict` - often used for broader state conflicts

**Why this matters:**
- Prevent "last write wins" data loss
- Reduce bandwidth for read-heavy APIs
- Make concurrent edits explicit instead of silent

**Implementation options:**
- ETag from row version, updated_at, or content hash
- Strong ETag for exact byte equality
- Weak ETag for semantically same representation when exact bytes may differ

**Gotcha:** `If-None-Match` is mainly about caching reads. `If-Match` is the header that protects writes from overwriting someone else's newer version.

**Rule of thumb:** Use ETags on cacheable resources, require `If-Match` on high-value updates, and return `412` when the client must re-fetch before retrying.
