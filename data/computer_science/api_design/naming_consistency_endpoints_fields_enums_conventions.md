### API Naming Consistency (Endpoints, Fields, Enums, Conventions)

**Why naming matters:** the public surface of every API is its names. Inconsistency here multiplies cost across SDKs, docs, dashboards, support tickets, and onboarding. Pick a style **once**, document it, lint for it.

**Decisions to make exactly once:**

| Concern | Pick |
|---|---|
| Path style | `kebab-case` (lowercase + hyphens) |
| Field style | `snake_case` **or** `camelCase` — never both |
| Enum value style | `lower_snake_case` strings (or `SCREAMING_SNAKE` if your stack expects it) |
| Timestamp suffix | `_at` (`created_at`, `updated_at`, `deleted_at`) |
| Date suffix | `_on` (`due_on`, `birth_on`) when no time component |
| Boolean prefix | `is_*` / `has_*` (`is_active`, `has_more`) |
| Foreign-key suffix | `_id` (`customer_id`, `order_id`) |
| Count suffix | `_count` (`unread_count`) |
| Cursor field | `next_cursor` / `prev_cursor` |
| Error field | `code` (machine), `message` (human) |
| Money | Integer minor units (`amount_cents`) + `currency` (ISO 4217) |
| ID format | UUID / opaque (`ord_…` Stripe-style) — not int |
| Method-on-resource | Verb-less paths + HTTP methods |

**Path naming — the rules:**

| Rule | Good | Bad |
|---|---|---|
| Lowercase + hyphens | `/order-items` | `/OrderItems`, `/order_items` |
| Plural collections | `/users`, `/orders` | `/user`, `/order` |
| Stable IDs | `/orders/{id}` | `/orders/{order_number}` |
| Verb-less | `/orders/{id}` | `/getOrder/{id}` |
| Action endpoints OK for non-CRUD | `/orders/{id}/cancel` | `/cancelOrder?id=` |
| One canonical noun | `/customers` everywhere | sometimes `/clients` |
| ASCII only | `/products` | `/produits` |

**Field naming — the rules:**

| Rule | Detail |
|---|---|
| Pick `snake_case` **or** `camelCase` per API | Don't mix |
| Stable fully-spelled names | `customer_id`, not `custId` |
| Suffix patterns are strong signals | `_at`, `_on`, `_id`, `_count`, `_url`, `_token` |
| Boolean: `is_*` / `has_*` / `can_*` / `should_*` | Read as questions |
| Avoid negatives | `is_active` ✅; `is_not_disabled` ❌ |
| Match domain language | What customer support calls it |
| Avoid type names | `email_string` ❌ — type is in the schema |

**Pattern dictionary:**

| Suffix / prefix | Means | Examples |
|---|---|---|
| `_id` | Foreign key / opaque identifier | `user_id`, `team_id` |
| `_at` | Timestamp (with time) | `created_at`, `paid_at` |
| `_on` | Date only | `due_on`, `birth_on` |
| `_count` | Integer count | `retry_count`, `seat_count` |
| `_url` | Absolute URL | `avatar_url`, `next_url` |
| `_token` | Opaque token | `session_token`, `next_cursor` (token-style) |
| `_amount` | Numeric quantity | `tip_amount`, `discount_amount` |
| `_cents` / `_minor_units` | Integer money | `amount_cents`, `price_cents` |
| `_size_bytes` | Integer size | `file_size_bytes` |
| `_duration_ms` / `_seconds` | Time span | `latency_ms`, `lock_seconds` |
| `is_*` / `has_*` / `can_*` | Boolean | `is_active`, `has_more`, `can_edit` |
| `*_count` not `count_*` | Suffix | `error_count`, not `count_errors` |
| `next_*` / `prev_*` | Pagination | `next_cursor`, `prev_page_url` |
| `_total` | Aggregate | `subtotal`, `tax_total`, `grand_total` |

**Enum naming — pick a style and lock it:**

| Style | Example | When |
|---|---|---|
| `lower_snake_case` strings | `pending`, `active`, `cancelled` | **Default** — wire-friendly |
| `SCREAMING_SNAKE` strings | `PENDING`, `ACTIVE` | Some legacy stacks |
| Numeric codes | `1`, `2`, `3` | Avoid — opaque |
| Mixed | `Active`, `cancelled`, `IN_PROGRESS` | **Never** |

> **Don't reuse enum values with new meaning** — that's the worst kind of breaking change. Always add a new value.

**Money handling (every team gets this wrong at some point):**

| Field | Type | Example |
|---|---|---|
| `amount_cents` (integer minor units) | int64 | `1999` (= $19.99) |
| `currency` (ISO 4217) | string(3) | `"USD"`, `"EUR"`, `"JPY"` |
| Float for money | ❌ | Lossy; no — never |
| Currency in field name | ❌ | Don't bake currency into the API surface |

> Some currencies don't have minor units (JPY, CLP) — use `amount_minor_units` per ISO 4217 if you want to be pedantic; most APIs name it `_cents` and document the exception.

**ID conventions:**

| Choice | Pros | Cons |
|---|---|---|
| Sequential int (`1`, `42`) | Cheap, sortable | Enumerable; reveals scale |
| **UUID v4 / v7** | Globally unique, opaque, sortable (v7) | 36-char string |
| Snowflake | Sortable, distributed | Worker-id allocation |
| **Prefixed (Stripe-style)** | Self-describing in logs (`ord_…`, `cus_…`, `pi_…`) | Slightly larger URLs |
| Composite | Multi-key resources | Complexity in routing |

> **Stripe-style prefixed IDs** are the gold standard — debuggable in logs without exposing structure. `ord_abc123def`, `usr_456ghi`, etc.

**Timestamp / date conventions:**

| Field | Format | Notes |
|---|---|---|
| `created_at`, `updated_at` | ISO 8601 / RFC 3339 UTC | Always `Z`-suffixed UTC; never local TZ |
| `due_on` (date only) | `YYYY-MM-DD` | No time component |
| Duration | Integer seconds (`ttl_seconds`) or ISO 8601 (`PT2H`) | Pick one per API |
| Time zone of input | Always parse as the named TZ; store UTC | Document explicitly |
| Epoch seconds vs ms | Pick one (typically ms) | Document |

**Pagination conventions:**

| Param | Use |
|---|---|
| `?cursor=abc&limit=50` | Cursor pagination (preferred) |
| `?page=2&page_size=50` | Offset pagination (avoid for big lists) |
| Response: `next_cursor`, `has_more` | Cursor envelope |
| Response: `data: [...]`, `pagination: {...}` | Envelope shape |

**Boolean field naming gotchas:**

| Bad | Good |
|---|---|
| `delete` (verb collides with HTTP method conceptually) | `is_deleted` |
| `deleted` (past tense — confusing) | `is_deleted` |
| `enabled` (could be a verb) | `is_enabled` |
| `is_not_active` (double-negative) | `is_active` |
| `disabled_status` | `is_disabled` |

**Polymorphism / discriminated unions:**

| Pattern | Detail |
|---|---|
| `type` field with stable string | Common discriminator |
| `object: "order"` (Stripe) | Self-typing every entity |
| `kind` (Kubernetes) | Same idea |
| Avoid varying the schema based on a flag elsewhere | Always discriminate explicitly |

**Cross-cutting consistency:**

| Cross-cut | Same name everywhere |
|---|---|
| Pagination cursor field | `next_cursor` / `prev_cursor` everywhere |
| Error code field | `code` (not sometimes `error_code`, sometimes `errorCode`) |
| Authentication scheme | `Authorization: Bearer <token>` (not custom headers) |
| Rate-limit headers | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` |
| Idempotency header | `Idempotency-Key` |
| Request ID | `X-Request-Id` |

**Per-domain canonical terms — pick one, never alias:**

| Concept | Pick **one** | Don't mix in |
|---|---|---|
| Person who pays | `customer` | `client`, `buyer`, `account` |
| Catalog SKU | `product` or `sku` | both inconsistently |
| Money owed | `invoice` | `bill`, `statement` |
| Shipping unit | `shipment` | `package`, `delivery` (without consistency) |
| Auth principal | `user` | `account`, `member` |

**Lint rules for naming (Spectral):**

```yaml
rules:
  field-snake-case:
    given: "$..*[?(@property && @property.match(/^[a-z][a-zA-Z0-9]*$/))]"
    then: { function: pattern, functionOptions: { match: "^[a-z_][a-z0-9_]*$" } }

  paths-kebab-case:
    given: "$.paths"
    then: { function: pattern, functionOptions: { match: "^/([a-z0-9-]+(/{[a-z_]+})?)+$" } }

  no-version-in-field:
    given: "$..*"
    then: { function: pattern, functionOptions: { notMatch: "^v[0-9]+_" } }
```

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Mixing `snake_case` and `camelCase` in one API | Clients hate it |
| `OrderItems` (PascalCase) in URL paths | Inconsistent with web norms |
| Renaming a field "for clarity" | Breaking change masquerading |
| Inconsistent boolean prefixes (`active`, `is_active`, `enabled`) | Each one a discovery hassle |
| ID type changes (`int` → `string`) | All clients break |
| Currency baked into field (`amount_usd`) | Every multi-currency feature breaks |
| Dates as strings without TZ | Bugs around DST / midnight |
| Magic numbers instead of enums | Reverse-engineering required |
| Verb in URL when method conveys it | `/getOrder` instead of `GET /orders/{id}` |
| Different name in docs vs API vs SDK | Search broken |
| One-letter abbreviations (`dt`, `nm`, `desc`) | Onboarding tax |
| Inconsistent pagination (`limit` vs `pageSize` vs `count`) | Cross-endpoint friction |

**Style-guide checklist:**

| Decision | Documented? |
|---|---|
| Path case | ✅ |
| Field case | ✅ |
| Enum case | ✅ |
| ID format | ✅ |
| Timestamp / date format | ✅ |
| Money format | ✅ |
| Pagination shape | ✅ |
| Error envelope | ✅ |
| Per-domain canonical terms | ✅ |
| Linter / CI enforcement | ✅ |
| One-page summary in `STYLE.md` | ✅ |

**Cross-references:**

- Resource modeling (collections, subresources): [resource_modeling_*.md](resource_modeling_collections_subresources_relationships_nouns.md)
- Schemas + validation: [schemas_validation_json_schema_*.md](schemas_validation_json_schema_request_response.md)
- Error handling: [error_handling_problem_details_*.md](error_handling_problem_details_rfc7807_structured_errors.md)
- Versioning: [api_versioning_*.md](../microservices/api_versioning_backward_compatibility_evolution.md)

**Rule of thumb:** **pick a naming convention early, document it once, and lint it forever**. Predictability beats cleverness. **Suffix patterns (`_id`, `_at`, `_count`, `_cents`)** carry meaning at a glance — use them. **Renaming a field is a breaking change** even if it's "clearer" — add a new field, deprecate the old, follow expand-contract.
