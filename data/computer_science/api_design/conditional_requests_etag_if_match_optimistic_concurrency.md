### Conditional Requests, ETags & Optimistic Concurrency

**Two distinct problems, one mechanism:**

| Problem | Solution | Header pair |
|---|---|---|
| **Cache revalidation** — "did this change since I last fetched?" | Compare ETag, return 304 if unchanged | `ETag` + `If-None-Match` (GET) |
| **Lost-update prevention** — "did someone else edit since I read?" | Reject write if ETag doesn't match | `ETag` + `If-Match` (PUT/PATCH/DELETE) |

> Both ride on the same ETag header, but the **client direction** differs: `If-None-Match` is for **reads**, `If-Match` is for **writes**.

**Core headers:**

| Header | Sent by | Direction | Means |
|---|---|---|---|
| `ETag: "v7"` | Server (response) | → client | Version of this representation |
| `Last-Modified: <date>` | Server (response) | → client | Time-based alternative to ETag |
| `If-None-Match: "v7"` | Client (request) | → server | "Only send body if **not** still v7" |
| `If-Match: "v7"` | Client (request) | → server | "Apply write **only if** still v7" |
| `If-Modified-Since: <date>` | Client (request) | → server | Time-based variant of `If-None-Match` |
| `If-Unmodified-Since: <date>` | Client (request) | → server | Time-based variant of `If-Match` |
| `Vary: …` | Server | → client | Which request headers should affect the cache key |

**Status codes for conditional logic:**

| Code | Meaning | When |
|---|---|---|
| `200 OK` | Body returned | Read with no condition / condition satisfied |
| `304 Not Modified` | No body, just headers | `If-None-Match` matched — client's cache valid |
| `412 Precondition Failed` | Refused | `If-Match` / `If-Unmodified-Since` failed — client must re-fetch |
| `428 Precondition Required` | Server requires the header | Hardened endpoints that refuse unsafe writes |
| `409 Conflict` | Domain conflict | Broader state conflict (resource state forbids the action) |
| `406 Not Acceptable` | Negotiation failed | Tangentially related — different mechanism |

**Cache revalidation flow (read):**

```
client                       server
  ── GET /a/123 ─────────────►
                              [tag = v7]
  ◄─ 200 OK
     ETag: "v7"
     <body>

   (later)

  ── GET /a/123 ─────────────►
     If-None-Match: "v7"
                              [tag still v7]
  ◄─ 304 Not Modified
     ETag: "v7"
     (no body — bandwidth saved)
```

**Optimistic concurrency flow (write):**

```
client                       server
  ── GET /orders/123 ─────────►
                              [version = v12]
  ◄─ 200 OK
     ETag: "v12"
     {status: "draft"}

  ── PATCH /orders/123 ───────►
     If-Match: "v12"
     {status: "confirmed"}

  CASE A: row still at v12        CASE B: someone else updated to v13
                                    in between
  [v12 → v13, status=confirmed]      [reject — version mismatch]
  ◄─ 200 OK                          ◄─ 412 Precondition Failed
     ETag: "v13"                        ETag: "v13"
                                        (client must GET, merge, retry)
```

**ETag generation strategies — pick one and stick with it:**

| Strategy | Pros | Cons |
|---|---|---|
| **Row version / `updated_at` epoch** | Cheap; matches DB optimistic-concurrency pattern | Doesn't reflect computed views |
| **Hash of canonical payload (e.g. SHA-256 of JSON)** | Always correct | Cost per request; need stable ordering |
| **Monotonic version column (`version` int)** | Trivial; perfect for write conflicts | Need a unique value per resource |
| **`xxhash` of selected columns** | Faster than SHA | Picking the right columns is a foot-gun |
| **Aggregate revision** (parent's max child version) | Useful for collections | Compute cost; cache it |
| **Composite** (`"<entity-id>:v<n>"`) | Self-describing | Slightly larger header |

**Strong vs weak ETags:**

| Form | Header | Means |
|---|---|---|
| **Strong** | `ETag: "v7"` | **Byte-exact** equivalence — same bytes if matched |
| **Weak** | `ETag: W/"v7"` | **Semantically equivalent** — same meaning, bytes may differ (gzip, whitespace) |
| Use weak | When negotiated representation may vary cosmetically | Most APIs |
| Use strong | When you need byte-equality (range requests, byte-level dedup) | Rare for JSON APIs |

**Common ETag pitfalls:**

| Pitfall | Effect |
|---|---|
| Forgetting quotes (`ETag: v7` instead of `ETag: "v7"`) | Spec violation — many caches reject |
| ETag changes on every request | No cache hits — defeats the purpose |
| Different ETag for compressed vs uncompressed | Use `Vary: Accept-Encoding` + weak ETag |
| ETag tied to floating field (last access time) | Cache thrashes |
| No ETag on writeable resources | Lost-update bugs |
| Server responds 304 but body changed | Pure correctness bug |

**End-to-end concurrency control patterns:**

| Pattern | Detail |
|---|---|
| **HTTP `If-Match`** | Client-driven; per-request; transparent to DB layer |
| **DB optimistic locking** (`UPDATE … WHERE version = ?`) | Server-driven; protects regardless of caller |
| **Both layered** | API rejects fast (412) without hitting DB; DB acts as backstop |
| **Pessimistic locks** (`SELECT ... FOR UPDATE`) | Different model — rare in REST APIs |
| **Sagas** | For multi-step transactional flows; not single-resource concurrency |

> Best practice: **enforce at both layers.** `If-Match` rejects bad clients fast; the DB UPDATE-WHERE-version is the actual safety net.

**`If-Match: *` — special form:**

| Header | Means |
|---|---|
| `If-Match: *` | "Resource must exist (any version)" |
| `If-None-Match: *` | "Resource must **not** exist" — common for create-if-absent |

| Idiom | Purpose |
|---|---|
| `PUT /users/123` + `If-None-Match: *` | Atomic create — rejects if exists |
| `PUT /users/123` + `If-Match: *` | Atomic update of any version — rejects if not exists |

**Cache headers + ETag — composing them:**

| Header combination | Behavior |
|---|---|
| `ETag` + `Cache-Control: max-age=60` | Cache for 60 s; after that revalidate with `If-None-Match` |
| `ETag` + `Cache-Control: no-cache` | Always revalidate before using cached copy |
| `ETag` + `Cache-Control: must-revalidate` | Once stale, must check before serving |
| `Cache-Control: no-store` | Don't cache at all (overrides ETag's value) |
| `Vary: Accept, Accept-Encoding, Authorization` | Cache key includes these request headers |

**API design: when to require conditional headers:**

| Resource | Requirement |
|---|---|
| Read-only public content (cacheable) | Optional ETag, encouraged |
| User-specific resource | ETag, optional `If-Match` |
| **Money / inventory / orders** | **Required `If-Match`** — return 428 without it |
| Append-only event stream | No ETag needed (immutability) |
| Bulk endpoints | Per-item ETag inside batch response |

**428 Precondition Required pattern:**

```
PATCH /orders/123                        ── request without If-Match
{ "status": "confirmed" }
                                  ◄─ 428 Precondition Required
                                      Content-Type: application/problem+json
                                      { "title": "Conditional update required",
                                        "detail": "Send If-Match with current ETag" }
```

> Use `428` to **force** clients to use optimistic concurrency on sensitive writes.

**Conflict-resolution UX patterns:**

| Strategy | Behavior |
|---|---|
| **Reject + re-fetch** (default) | 412 → client GETs fresh, merges, retries |
| **Last-writer-wins** | Don't use `If-Match`; accept overwrites |
| **Three-way merge** | Show user the diff, let them resolve |
| **Field-level merge** (JSON Patch) | Apply only changed fields atomically |
| **CRDT / OT** | For real-time collaborative editing |

**JSON Patch (RFC 6902) + `If-Match` — the precise-update combo:**

```
PATCH /documents/42
If-Match: "rev-7"
Content-Type: application/json-patch+json

[
  { "op": "replace", "path": "/title", "value": "New" },
  { "op": "add", "path": "/tags/-", "value": "draft" }
]
```

| Win | Detail |
|---|---|
| Field-level changes | Smaller payloads |
| Easier merging | Two clients editing different fields don't conflict |
| Pair with `If-Match` | Still detects concurrent same-field edits |

**Implementation hints:**

| Concern | Recipe |
|---|---|
| Generate ETag from row | `ETag: "${id}-${version}"` or hash of JSON |
| Per-collection ETag | Hash of (max(updated_at), count) |
| Cache the ETag in app memory | Avoid recomputing on every request |
| Bypass ETag for admin actions | Audit log + force flag |
| Handle clock skew | Prefer ETag over `Last-Modified` for write protection |
| Multi-region | Use a globally consistent version source (DB, Spanner, etc.) |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Sending `If-Match: <stale>` after retry | Endless 412 loop without a re-fetch |
| ETag depends on header (e.g. `Authorization`) without `Vary` | Caches mix users |
| `If-None-Match` with non-cacheable response | Gets 200 instead of 304 — wasted bandwidth |
| Client lib that doesn't surface ETag | Caller can't do conditional writes |
| Mixing `If-Match` and `Last-Modified` | Last-Modified is per-second — race within same second slips through |
| Forgetting to update ETag after write | Subsequent reads still see old version cached |
| Returning the body on 304 | Spec violation |

**Test cases worth wiring up:**

| Test | Verifies |
|---|---|
| GET → 200 with ETag | ETag emitted |
| GET with matching `If-None-Match` → 304 | Cache revalidation works |
| PATCH with matching `If-Match` → 200, new ETag | Successful update |
| PATCH with stale `If-Match` → 412 | Concurrency protection |
| PATCH without `If-Match` on protected resource → 428 | Forced precondition |
| Two concurrent PATCH against same `If-Match` | One succeeds, other fails (412) |
| GET → 200 with `Cache-Control: no-cache` and ETag | Revalidation cycle works |

**Rule of thumb:** **`If-None-Match` for reads** (cache revalidation, save bandwidth), **`If-Match` for writes** (optimistic concurrency, prevent lost updates). **ETag from a stable version source** (row version, content hash). **412 on stale write, 428 to force the precondition**, **304 on revalidate**. Combine HTTP-layer enforcement with **DB-level UPDATE-WHERE-version** as the ultimate safety net.
