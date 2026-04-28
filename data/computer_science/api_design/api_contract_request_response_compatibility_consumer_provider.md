### API Contract — Request/Response, Compatibility, Consumer/Provider

**What "the contract" actually covers:**

| Layer | Element | Examples |
|---|---|---|
| **Surface** | Method + path + path/query params | `POST /v1/orders?dry_run=true` |
| **Auth** | Required scheme(s) + scopes | `Bearer <jwt>` with `orders:write` |
| **Headers** | Required + responding | `Idempotency-Key`, `If-Match`, `Content-Type`, `Accept` |
| **Request body** | Schema, required fields, validation rules | JSON Schema / OpenAPI shape |
| **Response body** | Schema by status code | Per-2xx and per-4xx/5xx |
| **Status codes** | Mapping per outcome | `201`, `409`, `422`, `429`... |
| **Error envelope** | Stable shape with `code` | RFC 7807 / Problem Details |
| **Pagination** | Style + params + envelope | Cursor-based with `next_cursor` |
| **Behavioral** | Idempotency, ordering, timeouts, rate limits | "Safe to retry on 5xx with same `Idempotency-Key`" |
| **Lifecycle** | Versioning, deprecation, sunset | "v1 sunsets 2026-01-01" |

**Producer / consumer roles:**

| Side | Owns | Depends on |
|---|---|---|
| **Producer** (API server team) | Implementation + published contract | Honoring its own contract |
| **Consumer** (client / SDK / partner) | Their integration code | Provider's contract being **stable** |
| Spec | Single source of truth | Both sides reference it |
| Tests | Producer: own tests + consumer contract tests | Consumer: contract tests against the spec |

> A test passing on the producer doesn't mean the contract is intact. **Consumer contract tests** (Pact-style) catch the drift the producer's own tests miss.

**Breaking vs non-breaking — the precise list:**

**✅ Non-breaking (additive — safe):**

| Change | Why safe |
|---|---|
| Add a new optional request field | Old clients still send a valid request |
| Add a new field to a response | Tolerant clients ignore unknowns |
| Add a new endpoint | Old clients don't call it |
| Add a new enum value (if clients have a default branch) | Forward-compatible only with tolerant readers |
| Add a new HTTP method on existing path | Existing methods unchanged |
| Loosen validation (accept what was rejected) | Existing valid inputs still valid |
| Add a new response status code in a category | Clients pattern-match on category (4xx vs 5xx) |
| Add a new error sub-code under existing category | If clients fall back gracefully on unknown sub-code |
| Add new optional headers | Clients ignore unknown response headers |

**❌ Breaking (subtract / change semantics):**

| Change | Why breaking |
|---|---|
| Remove a field from response | Clients that read it crash / show null |
| Rename a field (response or request) | Same as add+remove |
| Change a field's type (`string` → `int`) | Parser breaks |
| Change a field from optional → required | Clients that omit it break |
| Make a request field required that was optional | Same |
| Tighten validation (reject what was allowed) | Now-rejected inputs break |
| Change semantics of an existing field | Hidden breakage |
| Change an enum value spelling / casing | String compares break |
| Remove an endpoint | Calls 404 |
| Change URL structure | Routing breaks |
| Change pagination contract (offset → cursor) | Iterators stall or duplicate |
| Change error envelope shape | Error handling breaks |
| Change authentication mechanism | Everyone breaks |
| Change ID format (int → UUID) | URLs / lookups break |
| Change default sort order | Pagination state inconsistent |

**Sneaky breaking changes (look additive but aren't):**

| Change | Why it bites |
|---|---|
| Default value change for an existing field | Behavior shifts silently |
| Pagination page size default change | Throughput / cost shift |
| Rate limit reduction | Clients suddenly hit 429 |
| Changing nullability of a field | Strict parsers break |
| Re-using an enum value with new meaning | Worst kind — silent semantic break |
| Changing `Cache-Control` defaults | Cached responses stale forever or never cache |
| Changing the timing semantics ("synchronous" → "async") | Polling logic breaks |
| Changing how an idempotency key is interpreted | Possible double-execution |

**Tolerant-reader principle (clients should...):**

| Rule | Effect |
|---|---|
| Ignore unknown response fields | Server can add fields |
| Default unknown enum values to "other" / known fallback | Server can add enum values |
| Tolerate extra HTTP headers | Server can add `Deprecation`, `Sunset`, etc. |
| Don't validate against strict generated types unless the SDK is regenerated | Avoids mass breakage on additive changes |
| Pin to a content-type version when available | `Accept: application/vnd.api.v2+json` |

**Contract testing — pick a layer:**

| Tool | Style |
|---|---|
| **Pact** | Consumer-driven contracts; consumer publishes expectations; provider verifies in CI |
| **Spring Cloud Contract** | Provider-side contracts published; consumers stub from them |
| **OpenAPI + Schemathesis** | Generated property tests against the spec |
| **Dredd** | Verify implementation matches OpenAPI |
| **Postman / Insomnia / Bruno** | Request/response collections in CI |
| **`oasdiff`** | Detect breaking changes in OpenAPI between PR and main |
| **Optic** | Spec-first capture of breaking changes |

**Lifecycle / versioning strategy:**

| Strategy | Detail |
|---|---|
| **Path versioning** (`/v1/orders`) | Most public APIs (GitHub, Twilio) |
| **Date-based pinning** (`API-Version: 2024-04-15`) | Stripe-style — server runs that version's logic |
| **Header media-type versioning** (`Accept: application/vnd.api.v2+json`) | Clean URLs |
| **Tolerant additive evolution** (no version) | Internal microservices |
| **GraphQL** | No versions — deprecate fields with `@deprecated` |

> See [api_versioning_*.md](../microservices/api_versioning_backward_compatibility_evolution.md) for the full playbook.

**Deprecation lifecycle:**

| Step | Detail |
|---|---|
| 1. Announce | Changelog + email + `Deprecation: true` header |
| 2. Document replacement | Pointer in docs |
| 3. Instrument usage | Per-API-key counter on deprecated route |
| 4. Notify top callers | Targeted email |
| 5. Brownout (optional) | Briefly return errors at scheduled times |
| 6. Remove | After verified zero usage and announced sunset |

**HTTP headers that signal contract behavior:**

| Header | Use |
|---|---|
| `API-Version: <date or vN>` | Pin per request (Stripe-style) |
| `Deprecation: true` (RFC 8594) | Endpoint is deprecated |
| `Sunset: <HTTP-date>` (RFC 8594) | Hard removal date |
| `Link: <docs>; rel="deprecation"` | Pointer to migration |
| `Warning` (deprecated) / new alternatives | Generic warnings |

**Behavioral guarantees that belong in the contract:**

| Guarantee | Detail |
|---|---|
| **Idempotency key handling** | "POST with `Idempotency-Key` is safe to retry; same key = same result for 24h" |
| **At-least-once vs exactly-once** | Webhook receivers must dedupe |
| **Ordering** | "Events for one resource arrive in causal order" |
| **Timeouts** | "Server max response time = 30s" |
| **Rate limits** | "100 req/s per API key; respect `X-RateLimit-Remaining`" |
| **Retry guidance** | "Retry on 5xx, 429 (honoring `Retry-After`); don't retry 4xx" |
| **Pagination stability** | "Cursors stable across additions; offset paging is unstable" |
| **Consistency** | "Read-your-writes within 1s; eventually consistent across regions" |
| **Eventual consistency window** | Stated explicitly when strong consistency isn't promised |
| **Webhook retry policy** | "Retry up to 8 times with exponential backoff over 24h" |

**Examples — required for a complete contract:**

| Required example | Why |
|---|---|
| Happy-path request + response | Most users follow examples first |
| Each error class | Validation, auth, conflict, rate-limit |
| Pagination first + middle + end | Edge cases |
| Edge fields (nullable, deprecated) | Surfaces design |
| Each auth flow | OAuth dance, API key, JWT |
| Retry / idempotent re-call | Behavioral demo |

**SDK ↔ contract relationship:**

| Practice | Effect |
|---|---|
| Generate SDKs from spec | Drift impossible if regenerated |
| Pin SDK version per app | Equivalent of version pinning |
| Tolerant-reader SDKs | Don't break on additive responses |
| Surface deprecation warnings at compile time | Helpful for SDK-using consumers |
| One SDK per supported version (or per-method) | Trade-off: more or fewer SDKs |
| Auto-generated changelog from spec diff | Communicates clearly |

**Contract drift — how it sneaks in:**

| Source | Defense |
|---|---|
| Spec hand-edited, code drifts | Generate spec from code OR vice versa |
| Unannounced field rename | Spec lint + diff in CI |
| Quietly tightened validation | Tests using real-world payloads |
| New required header silently enforced | Same |
| Example out of sync with reality | CI runs examples against staging |
| Different team's downstream changes | Spec-first design review process |
| Time-zone semantics shift | Document as ISO-8601 UTC explicitly |

**Producer-side checklist:**

| Check | Pass? |
|---|---|
| Spec in version control alongside code | ✅ |
| `oasdiff` / Optic detects breaking changes in PR | ✅ |
| Spec lint (Spectral) in CI | ✅ |
| Examples kept in sync with implementation | ✅ |
| Consumer contract tests run against spec | ✅ |
| Deprecation timeline documented for any sunset | ✅ |
| Telemetry on per-route + per-version usage | ✅ |
| Public changelog updated per release | ✅ |
| SDKs regenerated when spec changes | ✅ |
| Per-version error catalogue stable | ✅ |

**Consumer-side checklist:**

| Check | Pass? |
|---|---|
| Pin API version (path or header) | ✅ |
| Contract test happy + error paths | ✅ |
| Tolerant of unknown response fields | ✅ |
| Honor `Deprecation` / `Sunset` headers | ✅ |
| Retry policy aligned with provider's | ✅ |
| Idempotency key on every mutation | ✅ |
| Subscribe to provider's changelog | ✅ |
| Use generated SDK if available | ✅ |
| Have a non-prod canary environment hitting prod-like provider | ✅ |

**Anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| "It's backward compatible because JSON parses" | Misses semantics, ordering, defaults |
| Bumping version for a typo fix | Inflates version churn |
| No version, no contract, "we'll communicate" | Doesn't scale |
| Spec auto-generated but never reviewed | Drift hidden |
| Different shape for `400` vs `404` vs `500` | Forces special-case parsing — see [error_handling_*.md](error_handling_problem_details_rfc7807_structured_errors.md) |
| Pagination cursor format leaked into clients | Can't evolve |
| Hand-rolled HTTP retries diverging from contract | Inconsistent client behavior |
| No telemetry on deprecated endpoints | Can't safely remove |

**Rule of thumb:** **treat the contract like a product** — versioned, documented, examples, behavioral guarantees, deprecation policy. Test it from **both sides** (provider's own tests + consumer contract tests). **Additive changes are safe with tolerant readers**; **anything that changes existing behavior is breaking**, including subtle ones (defaults, nullability, sort order, rate limits, timing). The discipline that prevents most outages: **`oasdiff` in every PR + consumer contract tests + a public changelog**.
