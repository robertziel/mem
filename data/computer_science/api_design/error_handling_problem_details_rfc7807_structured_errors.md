### API Error Handling — Problem Details (RFC 7807 / 9457), Structured Errors

**The four goals every error format must satisfy:**

| Goal | What it means |
|---|---|
| Human-readable | Engineers can debug from the response |
| Machine-readable | Clients can branch on stable codes |
| Consistent | Same shape across every endpoint |
| Safe | No internal stack traces / secrets leaked |

**Problem Details for HTTP APIs (RFC 7807, updated as RFC 9457):**

The standardized error envelope. Content type: **`application/problem+json`** (or `+xml`).

| Field | Required | Purpose |
|---|---|---|
| `type` | recommended | URI identifier for this problem class (often a docs URL). Default `about:blank`. |
| `title` | recommended | Short human summary — should not change between occurrences |
| `status` | recommended | HTTP status code (mirrors response line) |
| `detail` | optional | Human explanation specific to this occurrence |
| `instance` | optional | URI/identifier of the specific failure (request ID, resource path) |
| Extension members | optional | Anything else — `code`, `errors[]`, `trace_id`, `retry_after`, ... |

**Canonical example:**

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation failed",
  "status": 422,
  "detail": "One or more fields are invalid",
  "instance": "/orders/req_123",
  "code": "validation_error",
  "request_id": "req_01HV2X8K6Z…",
  "errors": [
    { "field": "email",    "code": "format_invalid", "message": "must be a valid email" },
    { "field": "quantity", "code": "min_value",      "message": "must be >= 1" }
  ]
}
```

**Recommended extension fields (de-facto standard):**

| Field | Purpose |
|---|---|
| `code` (string, snake_case) | **Stable machine-readable** identifier — clients pattern-match on this; never changes |
| `request_id` / `trace_id` | Correlate to logs / traces |
| `errors` (array of field errors) | For validation responses |
| `retry_after` | Seconds — also set as HTTP header for `429` / `503` |
| `documentation_url` | Direct pointer for the developer |
| `correlation_id` / `causation_id` | For event-sourced systems |

**HTTP status codes — map error categories deliberately:**

| Category | Status | When |
|---|---|---|
| Bad input shape | **`400`** | Malformed JSON, missing field, wrong type |
| Validation rule failure | **`422`** | JSON parses but business rules reject (Rails / many APIs default) |
| Unauthenticated | `401` | No / invalid credentials |
| Authenticated but forbidden | `403` | Permission denied |
| Resource not found | `404` | Or hide existence to avoid leakage |
| Method not allowed | `405` | Wrong verb on a path |
| Conflict | `409` | Domain conflict (duplicate, state forbids) |
| Gone | `410` | Resource permanently removed |
| Precondition failed | `412` | `If-Match` failed |
| Payload too large | `413` | Request body too big |
| URI too long | `414` | Rare |
| Unsupported media type | `415` | Wrong `Content-Type` |
| Range not satisfiable | `416` | Range request invalid |
| I'm a teapot | `418` | (don't use) |
| Unprocessable Entity | **`422`** | Validation / business rule failure |
| Locked | `423` | WebDAV / explicit locking |
| Failed dependency | `424` | Upstream dependency failed |
| Precondition required | `428` | Force `If-Match` on protected writes |
| Too many requests | **`429`** | Rate limit hit |
| Internal error | **`500`** | Generic catch-all (don't leak details) |
| Not implemented | `501` | Feature not built |
| Bad gateway | `502` | Upstream returned invalid response |
| Service unavailable | **`503`** | Overloaded / under maintenance |
| Gateway timeout | `504` | Upstream timed out |

> **`400` vs `422`:** classic split — `400` for malformed shape, `422` for valid shape but rule violations. Pick one and document it; consistency beats philosophy.

**Stable `code` taxonomy — design it like an API:**

| Pattern | Examples |
|---|---|
| Snake_case constants | `validation_error`, `not_found`, `rate_limited` |
| Hierarchy via prefix | `payment.declined`, `payment.insufficient_funds`, `payment.expired_card` |
| Field-level codes inside `errors[]` | `min_value`, `format_invalid`, `unique_violation` |
| Domain-specific | `order.already_paid`, `subscription.canceled`, `inventory.exhausted` |
| Document them | Every code listed in API reference with explanation + remediation |

**Field-level error array shape:**

| Field | Purpose |
|---|---|
| `field` (string, dotted path) | `address.zip`, `items[2].quantity` |
| `code` | Machine code (`required`, `format_invalid`, `min_value`, `max_length`) |
| `message` | Human-readable, may be localized |
| `params` (optional) | E.g., `{ "min": 1, "actual": 0 }` |

**What NOT to expose:**

| Don't | Why |
|---|---|
| Raw stack traces | Reveals internals + libs |
| SQL error messages | Hints at schema |
| Internal hostnames / IPs | Recon material |
| Framework exception class names (e.g., `NoMethodError`) | Reveals stack |
| Secrets / tokens accidentally logged into payloads | Catastrophic |
| Different error shapes per error class | Forces special-case parsing |
| Field values that contain PII | Privacy violation |
| Stack of upstream errors verbatim | Cascade leak |
| File paths | Reveals project layout |

**Production-vs-dev error verbosity:**

| Environment | Include |
|---|---|
| Dev / staging | Stack trace, internal cause, debug fields |
| Production | `type`, `title`, `status`, `detail`, `code`, `instance`, `request_id` only |
| Both | Always include `request_id` / `trace_id` |

**Localization (i18n):**

| Field | Locale-handling |
|---|---|
| `title` | Often kept English (acts as a developer-facing identifier) |
| `detail` / `errors[].message` | Localize per `Accept-Language` |
| `code` | **Never localize** — must be stable |
| `Vary: Accept-Language` header if localized | So caches respect it |

**Validation error shape — collect, then return:**

```json
{
  "type": "/problems/validation-error",
  "title": "Validation failed",
  "status": 422,
  "code": "validation_error",
  "request_id": "req_01HV…",
  "errors": [
    { "field": "email",      "code": "required" },
    { "field": "age",        "code": "min_value", "params": { "min": 18 } },
    { "field": "items[3].sku","code": "not_found", "params": { "value": "ABC-999" } }
  ]
}
```

> Return **all** validation errors at once, not first-fail. UIs can render every field-level message in one pass.

**Specific patterns by category:**

| Category | Recommended fields |
|---|---|
| Validation (`422`) | `errors[]` with `field` + `code` + `params` |
| Auth (`401`) | `WWW-Authenticate` header + minimal body |
| Permission (`403`) | `code: "permission_denied"` + the missing scope/role |
| Rate limit (`429`) | `Retry-After` header + `code: "rate_limited"` + `params: { limit, remaining }` |
| Conflict (`409`) | `code: "conflict"` + reference to current state (or current ETag) |
| Not found (`404`) | Don't disambiguate "wrong ID" vs "no permission" — same response in both cases |
| Server error (`5xx`) | `request_id` + generic `title` — log details server-side |

**Error envelope contract — clients must rely on:**

| Field | Stable? |
|---|---|
| HTTP status | Yes |
| `code` | **Yes** — clients pattern-match |
| `errors[].field` + `errors[].code` | **Yes** |
| `title` | Mostly — broad change is breaking |
| `detail` | No — free-form |
| `instance` | No — per-request |
| `request_id` | No — per-request |

**Backward compatibility — evolving errors:**

| Change | Impact |
|---|---|
| Add new `code` value | OK — clients have a default branch |
| Rename a `code` | **Breaking** — alias for one release cycle |
| Add new `errors[]` field | OK — clients ignore unknowns |
| Change HTTP status for the same condition | **Breaking** |
| Switch envelope shape | **Breaking** — version the API |

**Operational concerns:**

| Concern | Detail |
|---|---|
| Log every 5xx with full context server-side | Even if client only sees `request_id` |
| Inject `request_id` into all logs / traces / spans | Single search term |
| Rate-limit error responses | Don't let an attacker use error pages as load |
| Consistent response time | Don't leak via timing whether resource exists |
| Sentry / error-tracker uses stable `code` | Group by code, not by message |
| Prometheus alert on rising 5xx rate | Per-route |
| Watch for new error codes appearing | Drift detection |

**Cross-references:**

- Schema validation that *produces* these errors: [schemas_validation_json_schema_*.md](schemas_validation_json_schema_request_response.md)
- Conditional requests + 412: [conditional_requests_etag_*.md](conditional_requests_etag_if_match_optimistic_concurrency.md)
- API versioning + breaking changes: [api_versioning_*.md](../microservices/api_versioning_backward_compatibility_evolution.md)

**Implementation hints by stack:**

| Stack | Pattern |
|---|---|
| Rails | Rescue from `ActiveRecord::RecordNotFound`, `ActionController::ParameterMissing`, etc. into a single error renderer |
| FastAPI | Pydantic validators auto-generate 422 with field details |
| NestJS | Exception filters convert to standard envelope |
| Spring Boot | `@ControllerAdvice` + `@ExceptionHandler` |
| Go (chi/echo/gin) | Middleware that maps domain errors to status + envelope |
| GraphQL | Use `extensions.code` for stable codes (different shape, same idea) |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Different envelope per status | Clients can't parse uniformly |
| `200 OK` with `error: {...}` in body | Defeats HTTP semantics; hard to monitor |
| Stack trace in `detail` | Internal leak |
| Same error across all 4xx | Useless for clients |
| Renaming codes between releases | Breaks consumer logic |
| Localizing `code` | Breaks consumer logic |
| `errors[]` with one item per call (instead of all) | Bad UX; multiple round-trips |
| `request_id` set only sometimes | No reliable correlation |
| 5xx without alerting | Silent regressions |
| Auth errors leaking which step failed | Username vs password disambiguation = enumeration |

**Quick checklist:**

| Check | Pass? |
|---|---|
| One envelope shape across all errors | ✅ |
| `Content-Type: application/problem+json` for errors | ✅ |
| Stable `code` taxonomy documented | ✅ |
| `request_id` in every error | ✅ |
| Field-level errors for `422` | ✅ |
| `Retry-After` on `429` / `503` | ✅ |
| `WWW-Authenticate` on `401` | ✅ |
| No stack traces in production | ✅ |
| Status codes mapped consistently | ✅ |
| Alerts on rising 5xx + new error codes | ✅ |
| Localization for `detail` / messages, not `code` | ✅ |
| Errors covered by API tests + contract tests | ✅ |

**Rule of thumb:** **one error envelope (RFC 7807 Problem Details)** across the entire API. **Stable `code`** is the contract — never change it. **Field-level errors for validation** (return all at once, not first-fail). **`request_id` always**, **stack traces never** in production. **Map status codes deliberately** (`400` shape vs `422` rules; `409` conflict vs `412` precondition vs `428` precondition required) and document the taxonomy.
