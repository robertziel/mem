### REST Resource Modeling (Collections, Subresources, Relationships, Nouns)

**Core principle:** model the business **nouns** clients care about, not the database tables underneath. Resources have **identity + state**; expose them through predictable collection/member URLs.

**The CRUD-on-resource skeleton:**

| Endpoint | Method | Use |
|---|---|---|
| `/orders` | `GET` | List (paginated, filterable) |
| `/orders` | `POST` | Create |
| `/orders/{id}` | `GET` | Read |
| `/orders/{id}` | `PUT` | Replace (full update) |
| `/orders/{id}` | `PATCH` | Partial update |
| `/orders/{id}` | `DELETE` | Delete (or soft-delete) |
| `/orders/{id}/items` | `GET` / `POST` | Subresource collection |
| `/orders/{id}/items/{itemId}` | `GET` / `PATCH` / `DELETE` | Subresource member |

**Naming conventions:**

| Convention | Example | Why |
|---|---|---|
| **Plural nouns** for collections | `/users`, `/orders` | Industry convention; consistent |
| Lowercase + hyphens, not underscores | `/payment-methods` | Spec-friendly, more URL-safe |
| Stable identifiers | `/orders/{id}` not `/orders/{order_number}` | IDs don't change; numbers might |
| **No verbs** in CRUD paths | `/orders/{id}` not `/getOrder/{id}` | Method = verb; URL = noun |
| Nested only for strong ownership | `/orders/{id}/items` ✅ vs `/users/{id}/companies/{cid}/orders` ❌ | Avoid deep nesting |
| Query params for filters | `/orders?status=paid&since=2024-01-01` | Don't bake filters into paths |
| Resource ID format | UUID / opaque string preferred over sequential int | Avoid scraping / enumeration |

**Identifier choices:**

| Choice | Pros | Cons |
|---|---|---|
| Sequential integer (`1`, `42`) | Cheap, sortable | Enumerable; reveals scale; not multi-region-safe |
| **UUID v4** | Globally unique, opaque | 16 bytes / 36-char string |
| **UUID v7** (timestamp-prefixed) | Sortable + opaque | Newer; library support varies |
| Snowflake (Twitter-style) | Sortable, distributed | Needs a worker-id allocation |
| Prefixed (Stripe-style: `ord_abc123`) | Self-describing in logs | Slightly bigger URLs |
| Opaque tokens | Hide internal IDs entirely | Need a mapping layer |

> **Stripe-style prefixed IDs** (`ord_…`, `cus_…`, `pi_…`) are the gold standard — debuggable in logs without revealing structure.

**Collection vs member — the two endpoint shapes:**

| Concern | Collection (`/orders`) | Member (`/orders/{id}`) |
|---|---|---|
| GET | Paginated list of summaries | Full single resource |
| POST | Create new (returns 201 + Location header) | Usually 405 |
| PUT | Replace whole collection (rare; usually 405) | Replace this resource |
| PATCH | Bulk update (rare) | Partial update |
| DELETE | Bulk delete (dangerous; usually 405) | Delete this resource |

**Subresources — when nesting earns its place:**

| Pattern | Example | When |
|---|---|---|
| **Owned children** | `/orders/{id}/items` | Items only meaningful within an order |
| **Per-resource view** | `/users/{id}/roles` | Conceptual "roles of this user" (not the global role table) |
| **Strong containment** | `/repos/{org}/{repo}/issues` | GitHub-style; clear ownership |
| Don't nest if... | `/users/{id}/orders` | Orders are independent entities — flat works better with filter `?customer=...` |

**Nesting depth — keep it shallow:**

| Depth | Recommendation |
|---|---|
| 1 level (`/orders`) | ✅ |
| 2 levels (`/orders/{id}/items`) | ✅ when ownership is strict |
| 3 levels | ⚠️ Only if naturally hierarchical |
| 4+ levels | ❌ Almost always wrong; flatten with filters |

> **One-noun-deep is the ideal**, two when warranted, three is a smell, four is a refactor.

**Many-to-many relationships:**

| Approach | Detail |
|---|---|
| **Direct via subresource collection** | `POST /users/{id}/roles` (with `{role_id}`) |
| **Via dedicated relationship endpoint** | `PUT /memberships` (a real resource) |
| **Bulk replace** | `PUT /users/{id}/roles` with `[role_id, ...]` |
| **HATEOAS-style relationship link** | `POST /users/{id}/relationships/roles` |

**Filters, sorts, pagination — query params:**

| Concern | Param convention |
|---|---|
| Filter | `?status=paid&since=2024-01-01` |
| Multi-value filter | `?tag=red&tag=blue` or `?tags=red,blue` (pick one) |
| Search | `?q=keyword` |
| Sort | `?sort=created_at` (asc), `?sort=-created_at` (desc) |
| Field selection (sparse fieldsets) | `?fields=id,status,total` |
| Pagination | `?page=1&page_size=20` (offset) or `?cursor=…&limit=20` (cursor) |
| Includes (sideload) | `?include=customer,items` |
| Versioning (per-request) | `Header API-Version: 2024-04-15` (Stripe-style) |

**Action endpoints — when CRUD doesn't fit:**

| Pattern | Example | Use when |
|---|---|---|
| `POST /orders/{id}/cancel` | Domain command | The action isn't a normal field update |
| `POST /payments/{id}/capture` | Side-effect-heavy | "Capture" isn't a state-change in isolation |
| `POST /users/{id}/password-reset` | Workflow trigger | Initiates a multi-step flow |
| `POST /accounts/{id}/transfer` | Multi-resource action | Don't try to model as PATCH |

> **Verbs are okay** for true domain commands. Don't twist them into fake resources (`POST /cancellations`) when an action endpoint is clearer.

**Action endpoint conventions:**

| Convention | Detail |
|---|---|
| `POST` for actions | Even when "idempotent-ish" — pair with idempotency key |
| Action name as a verb in the URL | `/cancel`, `/capture`, `/refund`, `/publish` |
| Return the **resource state** after the action | Easier for clients than separate fetch |
| Document side effects | Especially money / state-machine transitions |

**Embedding vs linking — collection responses:**

| Pattern | Example | When |
|---|---|---|
| **Embed** related data | Order with full `items` array | Always-needed-together |
| **Link** related data | Order with `customer_id` only | Optional, paginated, cacheable separately |
| **Sideload** via `include` | `?include=customer,items` returns both | Performance optimization |
| **Relationship object** (JSON:API) | `relationships: { customer: { data: { type: "customer", id: "..." } } }` | When following a hypermedia spec |

**Response shape consistency:**

```json
{
  "id": "ord_123",
  "object": "order",
  "status": "pending",
  "customer_id": "cus_9",
  "items": [
    { "id": "li_1", "sku": "book-1", "quantity": 2, "price_cents": 1999 }
  ],
  "total_cents": 3998,
  "currency": "USD",
  "created_at": "2024-04-15T10:00:00Z",
  "updated_at": "2024-04-15T10:05:00Z"
}
```

| Field | Why |
|---|---|
| `id` | Stable identifier |
| `object` (Stripe convention) | Self-describing type |
| `created_at`, `updated_at` (ISO 8601 UTC) | Always include |
| Money as integers (cents) + currency code | Avoid float precision |
| Snake_case OR camelCase — pick one and never mix | Consistency |

**Collection response shape (pagination envelope):**

```json
{
  "data": [
    { "id": "ord_123", ... },
    { "id": "ord_124", ... }
  ],
  "pagination": {
    "next_cursor": "WzE2…",
    "has_more": true,
    "limit": 20
  }
}
```

| Convention | Why |
|---|---|
| `data` array wrapping items | Allows top-level metadata (pagination, links, totals) |
| Cursor pagination by default | See [api_versioning_*.md](../microservices/api_versioning_backward_compatibility_evolution.md) |
| Don't include `total_count` if expensive | Optional, sometimes approximate |
| Self / next / prev links (HATEOAS-light) | Optional but helpful |

**Resource boundaries — design questions:**

| Question | Heuristic |
|---|---|
| Should X be a sub-resource of Y, or a top-level resource? | Independent lifecycle / queried alone → top-level |
| Should I embed Z or link it? | Always-with-parent → embed; optional / large → link |
| Is this entity a **value object** (no identity) or a **resource**? | Value objects (e.g. `address`) usually embed; resources (e.g. `address_book_entry`) get an ID |
| Should I expose internal IDs? | Use opaque external IDs; map to internal in service layer |
| Is this a "read view" or a real entity? | Read views: nest under the parent (`/orders/{id}/summary`) |

**Common patterns:**

| Pattern | Example |
|---|---|
| Singletons (per-tenant config) | `GET /me/preferences` (no ID needed) |
| `/me` for the authenticated user | `GET /me`, `GET /me/orders` |
| Search endpoint | `POST /orders/search` (when filter complexity exceeds query params) |
| Bulk operations | `POST /orders/bulk` with array body (and per-item idempotency keys) |
| Async actions | `POST /reports` returns 202 + `Location: /reports/{id}` to poll |
| Soft delete | `DELETE` sets `deleted_at`; resource still accessible to admin |
| Versioning embedded | `/v1/orders/...` or `Accept: application/vnd.api.v2+json` |

**HTTP status codes — mapping:**

| Action | Status |
|---|---|
| Create succeeded | `201 Created` + `Location` header |
| Update succeeded | `200 OK` (return resource) or `204 No Content` |
| Delete succeeded | `204 No Content` (or `200 OK` with body) |
| Async action accepted | `202 Accepted` + `Location` to poll |
| Read existing | `200 OK` |
| Read missing | `404 Not Found` |
| Validation failed | `422 Unprocessable Entity` |
| State conflict | `409 Conflict` |
| Precondition (`If-Match`) failed | `412 Precondition Failed` |

**Anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| URLs mirroring DB tables | API leaks internals; refactor breaks clients |
| Verbs in CRUD paths (`/getUser`) | RPC-style — defeats REST; harder to cache |
| Inconsistent pluralization | Pick plural; never mix |
| Over-nesting | `/companies/1/departments/2/teams/3/users/4` — flatten |
| Action endpoints for everything | Looks RPC-ish; CRUD endpoints exist for a reason |
| Mixing snake / camel case across responses | Clients hate this |
| Different error shapes per endpoint | See [error_handling_*.md](error_handling_problem_details_rfc7807_structured_errors.md) |
| Returning `200 OK` with `success: false` | HTTP statuses exist for a reason |
| Path parameters for filters | Use query params |
| Bulk endpoints without per-item status | Can't tell which item failed |
| Idempotent action endpoints without idempotency key | Retries cause double-action |
| Soft delete invisible to API consumers | Items reappear; clients confused |

**HATEOAS vs minimal — pick a posture:**

| Style | Detail |
|---|---|
| **Plain JSON** (most APIs) | Just data, IDs for related resources |
| **HAL** (`_links` field) | Self-describing links |
| **JSON:API** | Strict spec: `data`, `relationships`, `included`, `links` |
| **JSON-LD / Hydra** | Linked-data semantics |
| **GraphQL** | Different model — you describe a graph |

> Plain JSON wins for most REST APIs. Full HATEOAS is rare in practice; pick a pragmatic middle (data + IDs + occasional `_links`).

**Decision shortcuts:**

| Need | Do |
|---|---|
| Standard CRUD entity | Collection + member endpoints |
| Owned children that don't query alone | Subresource (`/orders/{id}/items`) |
| Independent entity with relationship | Top-level resource + filter (`/items?order_id=...`) |
| Domain action that's not CRUD | Action endpoint (`POST /orders/{id}/cancel`) |
| Long-running operation | `202 Accepted` + status URL |
| Bulk write | `POST /things/bulk` with idempotency keys per item |
| Authenticated user shortcut | `/me` endpoints |
| Search beyond simple filters | `POST /resources/search` with body |

**Cross-references:**

- Versioning + breaking changes: [api_versioning_*.md](../microservices/api_versioning_backward_compatibility_evolution.md)
- Schemas + validation: [schemas_validation_json_schema_*.md](schemas_validation_json_schema_request_response.md)
- Error handling: [error_handling_problem_details_*.md](error_handling_problem_details_rfc7807_structured_errors.md)
- Conditional requests: [conditional_requests_etag_*.md](conditional_requests_etag_if_match_optimistic_concurrency.md)

**Rule of thumb:** **plural-noun URLs, stable opaque IDs, shallow nesting, query params for filters/sort/include.** **Action endpoints (`POST /thing/{id}/verb`) are fine for true domain commands**; don't bend CRUD to cover them. **Embed what's always read together, link what's queried independently.** Consistent **case, response envelope, and error shape** across the entire API beats clever per-endpoint design.
