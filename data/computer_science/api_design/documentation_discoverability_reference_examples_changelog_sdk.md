### API Documentation, Discoverability, Reference, Examples, Changelog, SDKs

**Documentation is part of the API surface.** If support tickets repeat the same question, the docs are incomplete — even if technically accurate.

**Questions every API doc must answer (top of the homepage):**

| Question | Where it lives |
|---|---|
| What does this API do? | Tagline + 2-paragraph overview |
| How do I authenticate? | Auth quickstart |
| What are the base URLs / environments? | Environments page |
| How do request / response shapes look? | Reference + per-endpoint examples |
| How do errors / retries / rate limits / pagination work? | Cross-cutting concerns page |
| Where's the changelog? | Top-nav link |

**Minimum doc set:**

| Section | Purpose |
|---|---|
| **Quickstart** | Copy-paste-and-run example to first successful call |
| **Authentication** | API keys, OAuth flows, scopes, rotation |
| **Reference** | Every endpoint, fully specified |
| **Examples** | Happy path + error path per endpoint |
| **Errors** | Status codes + stable `code` taxonomy |
| **Pagination** | Cursor format, limits, ordering |
| **Rate limits** | Quotas, headers (`X-RateLimit-Remaining`), backoff |
| **Webhooks** | Event types, payload shapes, signature verification |
| **Async patterns** | Long-running operations, polling, callbacks |
| **Idempotency** | Header semantics, retry safety |
| **Versioning** | Path / header / date pinning |
| **Deprecation policy** | Timeline, headers, sunset dates |
| **SDK guides** | Per-language quickstart |
| **Changelog** | Per-version, dated, with breaking-change flags |
| **Status page** | Live + historical incident |
| **Support / contact** | How to reach humans |

**Reference page checklist (per endpoint):**

| Item | Detail |
|---|---|
| Method + templated path | `POST /v1/orders/{id}` |
| Required auth + scopes | "Bearer + `orders:write`" |
| Path params | Type + description |
| Query params | Required vs optional, defaults |
| Request headers | `Idempotency-Key`, `Content-Type`, etc. |
| Request body schema | With required / optional / nullable |
| Example request | Real values, not `<placeholder>` |
| Response 2xx schema + example | All fields explained |
| Response 4xx / 5xx examples | At least one per error class |
| Rate-limit notes | Per-endpoint quotas |
| Idempotency behavior | "Safe to retry within 24h with the same key" |
| Pagination details | If a list endpoint |
| Side effects + audit notes | What changes server-side |

**Discoverability tools:**

| Tool | Use |
|---|---|
| **OpenAPI / Swagger UI / Redoc / Stoplight / Scalar** | Generated reference |
| **Postman / Insomnia / Bruno collections** | Pre-built request library |
| **`Try it`** in-page widgets | Live calls with the user's key |
| **Search** | Full-text + endpoint + field-level |
| **Tagged endpoints** | Group by domain area |
| **Cross-links** between concepts and endpoints | Pagination → "applies to these endpoints" |
| **SDK code samples** per language | Per-endpoint, switchable |

**Examples — what makes them good:**

| Property | Detail |
|---|---|
| Real-looking values, not `<example>` | Faster to copy and adapt |
| Both happy + failure paths | Devs need to handle errors |
| Multiple languages (curl + 2–3 SDKs) | Reach more readers |
| Runnable as-is | Test your examples in CI |
| Show the **return value** | Don't make users guess |
| Highlight headers (auth, idempotency) | Easy to miss |
| Show a follow-up call (pagination, polling) | Demonstrate the workflow |

**SDK ecosystem:**

| Practice | Effect |
|---|---|
| **Generate SDKs from OpenAPI** | Always in sync with spec |
| **One canonical SDK per language** | Don't fragment |
| **Versioned semver** | Predictable updates |
| **Tolerant readers** | Don't break on new fields |
| **Surface deprecation warnings** at compile / lint time | Users see them in IDE |
| **Per-SDK changelogs** | Tied to API changelog |
| **Tools** | Speakeasy, Stainless, Fern, OpenAPI Generator |

**Changelog discipline:**

| Practice | Detail |
|---|---|
| Single canonical changelog | Not per-SDK only |
| Per-release section | Date + version + summary |
| Categorize changes | Added / Changed / Deprecated / Removed / Fixed / Security |
| Breaking changes flagged | `⚠️ Breaking` |
| Migration guide for breaks | Linked from changelog entry |
| RSS / email / dashboard subscription | Active outreach to consumers |
| Generated from spec diffs (oasdiff) | Catches sneaky changes |

**Searchability — what makes docs findable:**

| Factor | Detail |
|---|---|
| Endpoint named like the business concept | Don't hide `pos_terminal` behind `device` |
| Field names match domain language | Avoid internal abbreviations |
| Synonyms in copy ("subscription" + "plan") | Improves search recall |
| Example payloads searchable as text | Devs Ctrl-F for field names |
| URL slugs predictable | `/docs/orders/create-order` |
| Cross-links between related concepts | "see also: webhooks, idempotency" |

**Common doc failures:**

| Failure | Effect |
|---|---|
| Describes fields but not meaning | Devs guess |
| No error payload examples | Devs handle errors poorly |
| Missing changelog | Consumers can't track changes |
| Search broken — endpoint vs business term mismatch | Users land on irrelevant pages |
| Out-of-date examples | Loses trust |
| Quickstart doesn't actually work | Worst possible first impression |
| Auth flow undocumented | Tickets pile up |
| Webhooks have no signature-verification example | Security regressions |

**Doc-quality checks (in CI):**

| Check | Tool |
|---|---|
| Spec-lint | Spectral, Vacuum |
| Spec ↔ implementation drift | runtime validators (`express-openapi-validator`, etc.) |
| Examples actually work | Run examples against staging |
| Broken links | Link-checker |
| Style / voice | Vale, write-good |
| Missing error examples | Custom Spectral rule |
| Dead-code references | Linter |

**Versioning + deprecation surfaces:**

| Surface | Detail |
|---|---|
| `Deprecation: true` header (RFC 8594) | Per-response signal |
| `Sunset: <date>` header | Hard removal date |
| Doc badge (DEPRECATED) | Visible in reference |
| Changelog entry | Permanent record |
| Email to consumers using deprecated route | Targeted outreach |
| API dashboard usage indicator | "67% of your traffic still on v1" |
| Brownouts (scheduled error windows) | Surface lingering callers |

**Workflow integration patterns:**

| Practice | Effect |
|---|---|
| Docs in same repo as the API | Reviewed in same PR |
| `docs/` deployed via the same CI | No drift |
| Pre-merge spec lint + doc lint | Quality gate |
| Generated SDK PRs auto-bump | Versioning aligned |
| `docusaurus` / `mintlify` / `redocly` / `gitbook` | Modern tooling |

**Interactive sandbox / playground:**

| Feature | Why |
|---|---|
| Live "try it" with the user's key | Boost from "look" to "do" |
| Mock server fallback | Doesn't require a real key for first try |
| Pre-filled example payloads | Speeds first call |
| Response shown inline | Immediate feedback |
| Curl / SDK code-gen for the call you just made | Copy-paste-friendly |

**Webhook docs (a separate beast):**

| Section | Detail |
|---|---|
| Event-type catalog | Each event with payload shape |
| Signature verification | Per-language code samples |
| Retry policy | "We retry up to 8 times over 24h with backoff" |
| Idempotency | Use `event.id` to dedupe |
| Ordering | "Per-resource ordered; cross-resource not guaranteed" |
| Test mode | Send sample webhooks to a local URL |
| Replay | UI button to resend a failed delivery |
| Best-practice examples | Proper signature verification, idempotent handler |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Docs describe API "as designed" not "as built" | Drift kills trust |
| Examples that don't compile / run | Worst impression |
| No copy buttons | Friction |
| Mobile-broken docs | Locks out half your users |
| Search that returns Jenkins job names | Bad UX |
| "Coming soon" badges that never resolve | Embarrassing |
| Auth docs split across 5 pages | Devs give up |
| Locale-specific oddities (currency, date formats) buried | Surprise breakage |

**Quick checklist:**

| Check | Pass? |
|---|---|
| Quickstart works in < 5 minutes | ✅ |
| Every endpoint has at least one happy + one error example | ✅ |
| Auth flow documented with code in 3+ languages | ✅ |
| Errors page lists every stable code | ✅ |
| Webhooks have signature-verification example | ✅ |
| Pagination, retries, rate limits, idempotency on a single "Cross-cutting" page | ✅ |
| Changelog updated per release | ✅ |
| SDK auto-generated from spec | ✅ |
| Examples tested in CI | ✅ |
| Deprecation policy + sunset dates documented | ✅ |
| Status page linked from docs | ✅ |
| Spec lint passes (Spectral) | ✅ |

**Rule of thumb:** **optimize docs for first successful call in minutes**, then for **fast lookup during production debugging**. Every important endpoint has both **happy + failure** examples. **Generate the reference from OpenAPI** so docs and implementation can't drift. **Changelog as a first-class artifact** — consumers track it. **Test your examples in CI** — outdated examples are worse than no examples.
