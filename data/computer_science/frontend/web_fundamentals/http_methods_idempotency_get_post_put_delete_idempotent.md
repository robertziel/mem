### HTTP Methods & Idempotency

**Definition:** HTTP methods describe **intent**. **Idempotent** methods can be safely retried — repeated calls produce the same server state. **Safe** methods don't mutate. Picking the right method shapes caching, retries, and middleware behavior.

**The eight standard methods:**

| Method | Purpose | Safe? | Idempotent? | Cacheable? | Has body? |
|---|---|---|---|---|---|
| **GET** | Read | ✅ | ✅ | ✅ | ❌ |
| **HEAD** | Read headers only | ✅ | ✅ | ✅ | ❌ |
| **OPTIONS** | Discover allowed methods / CORS preflight | ✅ | ✅ | Sometimes | Optional |
| **POST** | Create / non-idempotent action | ❌ | **❌** | Sometimes | ✅ |
| **PUT** | Replace whole resource | ❌ | ✅ | ❌ | ✅ |
| **PATCH** | Partial update | ❌ | Often (depends) | ❌ | ✅ |
| **DELETE** | Remove resource | ❌ | ✅ | ❌ | Optional |
| **CONNECT** / **TRACE** | Tunneling / debug | ❌ / ✅ | ✅ / ✅ | ❌ | — |

**Safe vs Idempotent — they're different:**

| Property | Safe | Idempotent |
|---|---|---|
| Definition | No server state change | Same effect when repeated |
| Implication | Can cache, prefetch | Can retry on timeout |
| GET | ✅ | ✅ |
| HEAD | ✅ | ✅ |
| POST | ❌ | ❌ |
| PUT | ❌ | ✅ |
| DELETE | ❌ | ✅ |

> **All safe methods are idempotent. Not all idempotent methods are safe.**

**Idempotency examples:**

```http
PUT /users/123        body={"name":"Alice"}    →  resource always equals {"name":"Alice"}
PUT /users/123        body={"name":"Alice"}    →  same — idempotent

DELETE /users/123     →  user gone (200 or 204)
DELETE /users/123     →  user still gone (404 or 204) — idempotent

POST /orders          body={...}               →  creates Order#1
POST /orders          body={...}               →  creates Order#2 — NOT idempotent
```

**PATCH idempotency — it depends:**

| Patch shape | Idempotent? |
|---|---|
| `PATCH /users/123 {"name": "Alice"}` (set field) | ✅ |
| `PATCH /counters/1 {"op": "increment"}` | ❌ (each call adds 1) |
| JSON Merge Patch (RFC 7396) | Usually ✅ |
| JSON Patch ops (RFC 6902) | Depends on operations |

**Why idempotency matters — retries:**

```
Client → POST /orders             (timeout — did it succeed?)
Client → POST /orders (retry)     ← creates a duplicate!

Client → PUT /orders/abc123       (timeout)
Client → PUT /orders/abc123       ← same result, no duplicate
```

| Without idempotency | With idempotency |
|---|---|
| Retry creates duplicates | Retry produces same state |
| Caller must check before retry | Caller can blindly retry |
| Deduplication burden on server | None |

**Making POST idempotent — `Idempotency-Key`:**

```
POST /payments
Idempotency-Key: 7c2f...e9
Content-Type: application/json

{ "amount": 1000, "currency": "USD" }
```

| Property | Detail |
|---|---|
| Client generates a unique key per logical request | UUID |
| Server stores `(key → result)` for ~24h | Redis / DB table |
| Repeat with same key → same response | No duplicate side effects |
| Different body with same key → 422 conflict | Defensive |

**Caching by method:**

| Method | Cacheable | Notes |
|---|---|---|
| GET | Yes (default) | Use `Cache-Control` to control |
| HEAD | Yes | Often piggybacks on GET cache |
| POST | Only with explicit `Cache-Control` | Almost never in practice |
| PUT / PATCH / DELETE | Not cacheable | Mutations |

**Common anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| GET that mutates ("GET /unsubscribe?id=123") | Email scanners follow links → unsubscribes everyone |
| POST for safe reads | Loses caching, bad for CDN |
| PUT that doesn't replace whole resource | Confusing semantics; use PATCH |
| Non-idempotent PUT | Retries duplicate |
| DELETE returning 500 on already-deleted | Should be 404 or 204 |
| Designing API where DELETE has side effects beyond the resource | "DELETE /users/X also deletes posts" — surprising |

**Status code patterns:**

| Action | Success | Notes |
|---|---|---|
| GET found | 200 | With body |
| GET not found | 404 | |
| POST created | 201 | + `Location` header |
| POST processed (no resource) | 200 / 204 | Webhook acks |
| PUT replaced existing | 200 / 204 | |
| PUT created (idempotent create) | 201 | If your API allows |
| PATCH succeeded | 200 / 204 | |
| DELETE succeeded | 200 / 204 | 200 if returning the deleted body |
| Already absent | 404 / 204 | Pick one and stick with it |

**REST verb rules of thumb:**

| Need | Method |
|---|---|
| Read a resource | GET |
| Read multiple | GET (list endpoint) |
| Create with server-assigned ID | POST |
| Create / replace with client-assigned ID | PUT |
| Update some fields | PATCH |
| Remove a resource | DELETE |
| Action that doesn't fit CRUD | POST `/orders/123/cancel` |
| Bulk operation | POST `/bulk` (with operation list) |

**Idempotency in RPC vs REST:**

| Style | Idempotency posture |
|---|---|
| REST | Method semantics convey it |
| GraphQL | Mutations need explicit idempotency keys |
| gRPC | Service / method discipline |
| Webhooks | Idempotency-Key + dedupe at consumer |
| Message queues | At-least-once → consumer must dedupe |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Email click GET that mutates | Bots / scanners trigger it |
| POST as catch-all for everything | Loses HTTP guarantees |
| Treating PATCH as PUT | Replaces vs updates confusion |
| Idempotency key not scoped per user | Cross-user collisions |
| Idempotency cache TTL too short | Late retries fail |
| Different bodies with same idempotency key | Should reject 422 |
| Idempotent endpoint with non-idempotent side effects (notify, charge) | Hidden duplicates |

**Cross-references:**

- Idempotency keys / dedupe: [idempotency_*.md](../../distributed_systems/idempotency_key_exactly_once_deduplication.md)
- HTTP caching strategies: [http_caching_*.md](http_caching_etag_cache_control_validation.md)
- API versioning + contracts: [api_versioning_*.md](../../api_design/api_versioning_url_header_compatibility.md)
- REST resource modeling: [resource_modeling_*.md](../../api_design/resource_modeling_collections_subresources_relationships_nouns.md)

**Rule of thumb:** **GET = read, POST = create, PUT = replace, PATCH = update, DELETE = remove.** **GET / HEAD / PUT / DELETE are idempotent**; POST is not unless you add an **`Idempotency-Key`**. Idempotent methods are **safe to retry on timeout**, which is why most resilient APIs work hard to make POST idempotent. Never use GET for mutations — caches, prefetchers, and link scanners assume GET is safe.
