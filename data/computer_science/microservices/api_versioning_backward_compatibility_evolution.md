### API Versioning, Backward Compatibility & Evolution

**Why versioning is non-negotiable:**

| Reason | Detail |
|---|---|
| Multiple clients (web, mobile, partners) | Can't deploy them atomically |
| Mobile apps live forever | Old versions in users' pockets for years |
| Public APIs are integration contracts | Partners build long-running pipelines |
| Internal microservices deploy independently | Can't synchronize all consumers |

**Versioning strategies — pick by audience:**

| Strategy | Example | Pros | Cons | Used by |
|---|---|---|---|---|
| **URL path** | `/v1/users`, `/v2/users` | Explicit, cache-friendly, easy to route | URL pollution; full duplicate routes per version | GitHub, Twilio, Plaid |
| **Custom header** | `API-Version: 2024-01-15` | Clean URLs; date-based works well | Less discoverable; sometimes mishandled by middleware | Stripe (date-based), Square |
| **Accept media-type** | `Accept: application/vnd.acme.v2+json` | Spec-compliant; content-negotiation | Hard to test in browser; verbose | Some hypermedia APIs |
| **Query param** | `/users?version=2` | Simplest | Cache key issues; messy | Internal scripts only |
| **GraphQL evolution** | No versions; deprecate fields | Schema introspection drives clients | Works only for GraphQL; needs deprecation discipline | GitHub GraphQL, Shopify |
| **Date-based pinning** | Each request pins an `API-Version: 2024-01-15`; server runs that version's logic | Stable for long-lived integrations; lets server retire old behavior cleanly | Server complexity grows with versions | **Stripe** (the gold standard for this style) |
| **No versioning** | Evolve only with backward-compatible changes | Simplest; smallest surface area | Requires strict discipline; impossible for some changes | Some internal APIs |

> **URL-path is the default for new public APIs** unless you commit to Stripe-style date-based discipline. Internal APIs can often skip versioning if you control all clients.

**Backward-compatible (safe — no version bump needed):**

| Change | Why safe |
|---|---|
| **Adding** new fields to responses | Clients ignore unknown fields (must — see below) |
| **Adding** new endpoints | Old clients don't call them |
| **Adding** new optional request parameters | Defaulted when missing |
| **Adding** new enum values | If clients use a fallback for unknown values |
| **Adding** new HTTP methods on existing resources | New verbs are opt-in |
| **Loosening** validation (allow more inputs) | Existing valid inputs still valid |
| **Adding** new error sub-codes | If clients pattern-match on top-level codes only |

**Breaking changes (require a new version OR an expand-contract migration):**

| Change | Why breaking |
|---|---|
| **Removing** a field | Clients that read it crash / show null |
| **Renaming** a field | Same as removal + addition |
| **Changing** a field's type | Parser breaks |
| **Changing** semantics of an existing field | Hidden breakage |
| **Removing** an endpoint | Calls 404 |
| **Changing** URL structure | Routing breaks |
| **Tightening** validation (reject what was allowed) | Calls suddenly 4xx |
| **Making** an optional field required | Clients that omit it break |
| **Changing** authentication mechanism | Everyone breaks |
| **Changing** pagination contract | Iterators stall or duplicate |
| **Changing** the error envelope shape | Error handling breaks |
| **Changing** ID format / case-sensitivity | URLs fail to resolve |

**Tolerant reader / robustness rules — clients should:**

| Rule | Effect |
|---|---|
| Ignore unknown response fields | Server can add fields safely |
| Provide a default for unknown enum values | Server can add enum values safely |
| Tolerate extra HTTP headers | Server can add `Deprecation`, `Sunset`, etc. |
| Treat missing optional fields as absent (not an error) | Server can add optional inputs |

**Expand-contract — the safe way to do "breaking" changes:**

| Phase | Action | Old client | New client |
|---|---|---|---|
| **Expand** | Add new field/endpoint **alongside** the old | Reads old field — works | Reads new field — works |
| **Migrate** | Update all consumers to the new field | Old clients still work via old field | Already on new field |
| **Soak** | Monitor traffic on old field; ensure it's near zero | Logged for visibility | — |
| **Contract** | Remove the old field | (would break, but no one calls it now) | Unaffected |

> Same pattern works for renames (write to both, read from new), endpoint replacement, and ID format migrations.

**Field deprecation surfaces — communicate everywhere:**

| Channel | Mechanism |
|---|---|
| Response header | `Deprecation: true`, `Sunset: Wed, 11 Nov 2026 23:59:59 GMT`, `Link: <docs>; rel=deprecation` |
| OpenAPI / Swagger | `deprecated: true` on the field/endpoint |
| Documentation | Visible callout with replacement |
| Changelog | Per-release notes with deprecation date |
| Email to API consumers | Identify them by API key; targeted notice |
| Logs / metrics | Per-consumer-key counter on deprecated calls |
| In-app notification (developer dashboard) | If you have one |

**Endpoint deprecation lifecycle:**

| Step | Detail |
|---|---|
| 1. Announce | Changelog + email + `Deprecation: true` header |
| 2. Document replacement | "Use `/v2/users` instead of `/v1/users`" |
| 3. Instrument | Per-API-key usage counter on deprecated routes |
| 4. Remind | Periodic emails to top callers |
| 5. Brownout (optional) | Briefly return errors at scheduled times to surface lingering callers |
| 6. Remove | After zero (or near-zero) verified usage and the announced sunset date |

> **Public API typical timeline: 6–12 months from deprecation to removal.** Stricter for security fixes, longer for enterprise contracts.

**Pagination contract — pick early, never change:**

| Style | Best for | Stable when... |
|---|---|---|
| **Offset / page number** | Static datasets | Data doesn't change during iteration |
| **Cursor (opaque token)** | Live, growing datasets | Cursor is server-defined and opaque |
| **Keyset** (`since=last_id`) | Time-ordered streams | IDs are monotonic |
| Hybrid (cursor + total count, where cheap) | UIs needing total | Total can be approximate |

> Switching pagination style is a breaking change in everything but name. Decide once.

**Consumer-Driven Contracts (CDC):**

| Concept | Detail |
|---|---|
| Consumer writes | "I expect `GET /users/1` to return `{ id: number, name: string }`" |
| Stored | Pact broker / similar |
| Provider CI | Runs all consumer contracts on each build |
| Outcome | Breaking a contract fails the provider's build *before* it ships |
| Tools | **Pact**, Spring Cloud Contract, Postman Contracts |

**OpenAPI / schema as contract:**

| Practice | Effect |
|---|---|
| OpenAPI spec is **source of truth** | Server + clients generated from it |
| Spec linted in CI | Catches missing required fields, breaking changes |
| `oasdiff` / `openapi-diff` in CI | Auto-detects breaking changes in PRs |
| Schema validation on requests + responses | Wire-level safety net |
| Mock server from spec | Consumers can integrate before provider is live |

**HTTP status code stability:**

| Change | Compatible? |
|---|---|
| New 2xx code where old was 200 | Often breaking — clients pattern-match |
| Returning 200 with error in body (instead of 4xx) | Breaking |
| Adding new specific 4xx for what was a generic 4xx | Borderline; document |
| Changing 500 → 503 | Usually OK if retry semantics are similar |

**Error-envelope consistency — a contract within the contract:**

| Field | Purpose |
|---|---|
| `code` (machine) | Stable identifier; clients pattern-match |
| `message` (human) | Free-form, can change |
| `details` | Field-level errors for forms |
| `request_id` | Trace correlation |
| `documentation_url` | Help for the developer |
| HTTP status | Aligned with the error class |

> Adding fields here is safe; renaming or removing is breaking.

**SDK + client libraries — soften the impact of evolution:**

| Practice | Effect |
|---|---|
| Provide official SDKs | Most clients use them; they handle versioning details |
| Pin SDK version per app | Same as pinning API version |
| SDK tolerates new response fields | Don't generate strictly-typed parsers without forward-compatibility |
| SDK warning on deprecated calls | Surfaces deprecations at compile time |

**Anti-patterns:**

| Pitfall | Effect |
|---|---|
| Two versions diverging into separate codebases | Drift, bug parity issues |
| Using version numbers to fix bugs | Bumping `v2` for a typo fix |
| Removing a field on a Friday afternoon | Production incident on Monday |
| Adding required field without a version bump | All existing callers break |
| Loosening type without a version bump | Strict clients break |
| Versioning everything per route | "We're on v17 of `/users`" — unmanageable |
| No deprecation header / no sunset date | Consumers don't know to migrate |
| No usage telemetry on old endpoints | Can't safely remove |
| Changing pagination cursor format silently | Consumers loop forever / duplicate |

**Per-audience strategy — calibrate to your callers:**

| Audience | Strategy |
|---|---|
| Internal services you fully control | No versioning + tolerant readers + CDC tests |
| Internal where some teams own consumers | Light versioning (path or header) + expand-contract |
| Public partners | Date-based pinning (Stripe-style) **or** path versioning + 12-month deprecation |
| Mobile apps | Long support windows; never make required fields required without server-side fallback for old clients |
| Open marketplaces (e.g. payment partners) | The longest possible support windows; explicit sunset dates |

**Rule of thumb:** **prefer additive changes** (new fields, new endpoints, new optional params) — they don't need a version bump. **Use expand-contract for renames/removals**. **URL path versioning** for most public APIs; **Stripe-style date pinning** if you want to evolve aggressively without breaking anyone. **Consumer-driven contracts (Pact) + OpenAPI diff in CI** catch breaking changes before they ship. **Deprecate with a timeline, telemetry, and a sunset date** — never remove a field without verifying zero usage.
