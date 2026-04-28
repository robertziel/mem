### OpenAPI Specification (Swagger, Operations, Schemas, Examples)

**What it is:** the standard, machine-readable, language-agnostic description format for HTTP APIs. Formerly tied to Swagger tooling; now an open spec under the OpenAPI Initiative.

**Versions you'll meet:**

| Version | Year | Notes |
|---|---|---|
| Swagger 2.0 | 2014 | Old; many tools still emit it |
| OpenAPI 3.0 | 2017 | Most production usage today |
| OpenAPI 3.1 | 2021 | Aligns with **JSON Schema 2020-12** — strict mode for nullables, `examples` array, webhooks |

**Top-level document structure:**

| Section | Holds |
|---|---|
| `openapi` | Spec version (e.g., `3.1.0`) |
| `info` | Title, version, description, contact, license, terms |
| `servers` | Base URLs (prod, staging, sandbox) with `variables` |
| `paths` | Endpoints — each is a map of operations (`get`, `post`, …) |
| `components` | Reusable schemas, parameters, responses, headers, security schemes, examples, callbacks |
| `security` | Default auth requirement(s) |
| `tags` | Groupings for docs |
| `externalDocs` | Link out to deeper docs |
| `webhooks` (3.1) | Inbound events from your service |

**Operation object — what an endpoint defines:**

| Field | Purpose |
|---|---|
| `summary` / `description` | Human docs |
| `operationId` | Unique ID — drives SDK method names |
| `tags` | Group in Swagger UI / Redoc |
| `parameters` | Path / query / header / cookie params |
| `requestBody` | Payload shape, content types, required flag |
| `responses` | Per-status-code response, including errors |
| `security` | Override default auth for this operation |
| `deprecated` | Marks for sunset |
| `callbacks` | Async callback (webhook-style) |
| `servers` | Per-operation override |

**Parameter `in` values:**

| `in` | Used for |
|---|---|
| `path` | `/users/{id}` — must be `required: true` |
| `query` | `?limit=20` |
| `header` | `X-Request-ID: ...` (don't redefine `Content-Type`, `Accept`, `Authorization` — they belong elsewhere) |
| `cookie` | Session cookies (rare in modern APIs) |

**Schema (data type) — JSON Schema subset:**

| Construct | Meaning |
|---|---|
| `type: object` + `properties` + `required: [...]` | A typical struct |
| `type: array` + `items: ...` | List |
| `type: string` + `format: date-time` / `uuid` / `email` | Typed string |
| `enum: [a, b, c]` | Closed set |
| `oneOf` / `anyOf` / `allOf` | Union / intersection / inheritance |
| `discriminator: { propertyName }` | Tagged-union dispatch |
| `nullable: true` (3.0) / `type: [string, "null"]` (3.1) | Allow null |
| `readOnly` / `writeOnly` | Field appears only in responses / requests |
| `default` | Used when omitted |
| `additionalProperties: false` | Disallow extra fields |
| `pattern` (regex), `minLength` / `maxLength`, `minimum` / `maximum` | Value constraints |
| `example` / `examples` | Sample values |

**Reusable components — prefer over inline:**

| Reusable type | Use |
|---|---|
| `components/schemas` | Domain types (`User`, `Order`) |
| `components/parameters` | Pagination params, request-id header |
| `components/responses` | Standard error shapes (`UnauthorizedError`, `NotFoundError`) |
| `components/headers` | Rate-limit headers, deprecation headers |
| `components/securitySchemes` | Bearer, OAuth flows, API key |
| `components/examples` | Named example values, referable from many places |
| `components/callbacks` | Webhook contracts |

> **Reference (`$ref: '#/components/schemas/Order'`)** is the single most under-used feature. Stop inlining the same schema 12 times.

**Security schemes — declare auth properly:**

| Scheme | YAML shape |
|---|---|
| `apiKey` | `{ type: apiKey, in: header, name: X-API-Key }` |
| `http: bearer` | `{ type: http, scheme: bearer, bearerFormat: JWT }` |
| `http: basic` | `{ type: http, scheme: basic }` |
| `oauth2` | `flows: { authorizationCode | clientCredentials | password | implicit }` per flow |
| `openIdConnect` | `{ type: openIdConnect, openIdConnectUrl: https://issuer/.well-known/openid-configuration }` |
| `mutualTLS` (3.1) | `{ type: mutualTLS }` |

**Pagination — three shapes, model whichever you use:**

| Shape | Params + response fields |
|---|---|
| Offset / page | `?page=1&page_size=20` + `total_count`, `total_pages` |
| Cursor (opaque) | `?cursor=...&limit=20` + `next_cursor`, `prev_cursor` |
| Keyset | `?after_id=...&limit=20` + last id in response |

**Error envelope — consistency beats cleverness:**

| Field | Purpose |
|---|---|
| `code` (machine) | Stable identifier; clients pattern-match |
| `message` (human) | Free-form |
| `details` | Field-level errors |
| `request_id` | Trace correlation |
| `documentation_url` | Pointer for the developer |
| HTTP status | Aligned with the error class |

> Define `ErrorResponse` once in `components/schemas`, then `$ref` it from every `4xx` / `5xx` response.

**Examples — concrete values pay off:**

| Place | Effect |
|---|---|
| `example` on a property | Shown in docs, used by mock servers |
| `examples` map on a `MediaType` | Multiple named scenarios (`createSuccess`, `createValidationError`) |
| `value` vs `externalValue` | Inline JSON or link to a file |
| Each error response | Show real wire payload — saves consumers from guessing |

**Tooling map (what you can do with a spec):**

| Need | Tool |
|---|---|
| **Render docs** | Swagger UI, Redoc, Stoplight Elements, Scalar |
| **Lint the spec** | Spectral (configurable rule sets), Vacuum, Speccy |
| **Generate SDKs** | OpenAPI Generator, Speakeasy, Stainless, Fern |
| **Mock the API** | Prism, MSW (with codegen), Microcks |
| **Contract tests** | Dredd, Schemathesis, Pact (consumer-driven) |
| **Validate at runtime** | `express-openapi-validator`, `connexion` (Python), `Committee` (Ruby) |
| **Code-first / spec-first scaffolding** | FastAPI, NestJS, ASP.NET, drf-spectacular |
| **Diff for breaking changes** | `oasdiff`, `openapi-diff`, Optic |
| **API gateway integration** | AWS API Gateway, Kong, KrakenD ingest spec for routes |
| **Postman / Insomnia / Bruno** | Import spec for collection generation |

**Spec-first vs code-first — pick a posture:**

| Approach | When |
|---|---|
| **Spec-first** | Multiple consumers, public API, design review matters; spec is the contract; server scaffolded from it |
| **Code-first** | Internal API, team controls all callers; spec auto-generated from annotations / decorators |
| Hybrid | Code-first internally, lint generated spec in CI; expose to consumers only after Spectral passes |

**Workflow integration — prevent drift:**

| Practice | Effect |
|---|---|
| Spec lives in version control with the code | One PR changes both |
| `spectral lint` in CI | Style + correctness |
| `oasdiff` between PR branch and main | Auto-comment breaking-change report |
| Server validates requests / responses against spec | Drift fails fast |
| Mock server in dev | Consumers can integrate before backend ready |
| Generated SDK in monorepo | Updated automatically when spec changes |

**Annotation patterns by stack (code-first):**

| Stack | Annotation source |
|---|---|
| FastAPI (Python) | Pydantic models + path/query types — auto-generates OpenAPI |
| Django + drf-spectacular | DRF serializers → spec |
| Flask + apispec / flask-smorest | Marshmallow / Pydantic schemas |
| NestJS | `@nestjs/swagger` decorators |
| Spring Boot | springdoc-openapi |
| ASP.NET Core | Swashbuckle / NSwag |
| Rails | rswag (RSpec → spec) / committee |
| Go | `swaggo`, oapi-codegen, huma |
| TS / Node | tsoa, NestJS, ts-rest, zod-to-openapi |

**Webhooks (OpenAPI 3.1):**

| Concept | Detail |
|---|---|
| `webhooks` top-level key | Define inbound events your service sends |
| Each entry | Looks like a `paths` operation (request body, signatures) |
| Pair with `security` for signing | Document the HMAC / JWT signature |

**Common spec mistakes:**

| Mistake | Effect |
|---|---|
| Stale spec — implementation drifted | **Worse than no spec** — consumers build against false contracts |
| Missing 4xx / 5xx responses | Clients have no defined error path |
| `additionalProperties: true` (default) | Silently accepts garbage |
| Schemas inlined everywhere | Massive YAML, no SDK reuse, painful diffs |
| `string` everywhere with no `format` | Clients can't pick the right type |
| No examples | Docs unclear; mock servers return defaults |
| Auth defined globally only | Unauthenticated endpoints not flagged |
| Path parameter not marked `required: true` | Spec invalid |
| Security applied per route in random ways | Hard to audit |
| Hand-edited spec + auto-generated spec both exist | Inevitable drift |

**Spec health checklist:**

| Check | Pass? |
|---|---|
| Schemas referenced via `$ref`, not inlined | ✅ |
| Every endpoint documents 200 + at least one error response | ✅ |
| `ErrorResponse` shared across all error responses | ✅ |
| `securitySchemes` declared; per-route override only when public | ✅ |
| Spectral CI lint passing | ✅ |
| Breaking-change diff in PRs (oasdiff / Optic) | ✅ |
| Server runtime-validates against the spec | ✅ |
| Mock server / SDKs regenerated automatically | ✅ |
| Examples for every meaningful response | ✅ |
| Versioning strategy documented (path, header, or date-pinned) | ✅ |

**Rule of thumb:** **the spec is the contract** — keep it in version control, **review it with code changes**, lint it (Spectral), and **diff for breaking changes** (oasdiff) on every PR. **Reuse via `$ref`** (schemas, parameters, responses, examples). **Document errors as carefully as success**. **Spec-first for public APIs, code-first for internal** — but in both cases, **runtime validation against the spec** is what stops drift.
