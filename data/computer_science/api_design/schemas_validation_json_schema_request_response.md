### API Schemas & Validation (JSON Schema, Request / Response)

**What schemas buy you — beyond "the API works":**

| Win | Detail |
|---|---|
| Single source of truth | Schemas drive code, docs, mocks, tests |
| Boundary safety | Bad data rejected before business logic runs |
| Auto-generated SDKs | Clients aligned with the contract |
| Auto-generated docs | Always-correct reference |
| Contract testing | Provider + consumer can both verify against the same schema |
| Mocking | Generate fixtures from schema for downstream tests |
| Diff for breaking changes | Spot drift in CI |

**Schema languages — what you'll meet:**

| Language | Used in / by |
|---|---|
| **JSON Schema** (Draft 2020-12) | OpenAPI 3.1, AJV, JSV — the lingua franca |
| **OpenAPI** schema (3.0 / 3.1) | REST APIs; 3.1 aligns with JSON Schema |
| **Protobuf** | gRPC, internal RPC |
| **Avro** | Kafka schemas, Hadoop |
| **GraphQL SDL** | GraphQL APIs |
| **Smithy** (AWS) | AWS-flavored IDL |
| **Pydantic / Zod / TypeBox / io-ts** | Code-first, generate JSON Schema on demand |
| **JTD** (JSON Type Definition, RFC 8927) | Simpler / strict alternative to JSON Schema |

**Three layers of validation — match the layer to the cost:**

| Layer | What it checks | Where it lives |
|---|---|---|
| **Transport** | Valid JSON, correct `Content-Type`, body size, required headers | Web framework / gateway |
| **Schema (structural)** | Required fields, types, enums, length, regex, ranges | Schema validator (AJV, Pydantic, etc.) |
| **Business / domain** | "Can't cancel a shipped order", "User must own this resource" | Application code |

> Schema validation is **mechanical**. Business rules require domain context. Don't try to encode "user owns resource" in a schema.

**JSON Schema essentials — the rules you'll actually use:**

| Rule | Example |
|---|---|
| Type | `"type": "string"` (or `"object"`, `"array"`, `"integer"`, `"number"`, `"boolean"`, `"null"`) |
| Required | `"required": ["email", "age"]` |
| Enum (closed set) | `"enum": ["draft", "published", "archived"]` |
| String format | `"format": "email"` / `"uuid"` / `"date-time"` / `"uri"` |
| Length | `"minLength": 1, "maxLength": 100` |
| Pattern | `"pattern": "^[A-Z][0-9]+$"` |
| Number range | `"minimum": 0, "exclusiveMaximum": 100` |
| Multiple-of | `"multipleOf": 0.01` (money two-decimal) |
| Array items | `"items": { ... }` — applies to every item |
| Array length | `"minItems": 1, "maxItems": 10`, `"uniqueItems": true` |
| Object properties | `"properties": { ... }` |
| Strictness | `"additionalProperties": false` (reject unknown fields) |
| Nullable | OpenAPI 3.0: `"nullable": true`; JSON Schema 2020-12 / OpenAPI 3.1: `"type": ["string", "null"]` |
| Defaults | `"default": ...` (informational; some libs apply them) |
| Const | `"const": "v1"` (fixed value) |

**Combinators — modeling unions and inheritance:**

| Combinator | Effect |
|---|---|
| `oneOf` | Match **exactly one** of the schemas (tagged union) |
| `anyOf` | Match **at least one** |
| `allOf` | Must match **all** (composition / inheritance) |
| `not` | Must **not** match |
| `if` / `then` / `else` | Conditional shape |
| `discriminator` (OpenAPI) | Tagged-union dispatch by a field's value |

**Discriminated union pattern (OpenAPI):**

```yaml
oneOf:
  - $ref: '#/components/schemas/CardPayment'
  - $ref: '#/components/schemas/BankTransfer'
discriminator:
  propertyName: type
  mapping:
    card: '#/components/schemas/CardPayment'
    bank: '#/components/schemas/BankTransfer'
```

**The "optional vs nullable" matrix — design it deliberately:**

| Field state | Definition | Example schema |
|---|---|---|
| Required, non-null | Must be present, can't be null | `required: [x]` + `type: string` |
| Required, nullable | Must be present, can be null | `required: [x]` + `type: [string, "null"]` |
| Optional, non-null | Can be absent, but if present can't be null | not in `required`; `type: string` |
| Optional, nullable | Can be absent, can be null when present | not in `required`; `type: [string, "null"]` |

> "Optional" means **the field may be absent**. "Nullable" means **the field may be present with `null`**. They're independent. Decide both per field.

**Empty string vs null — pick a policy and stick with it:**

| Choice | Implication |
|---|---|
| Treat `""` as null | Validators must coerce; common in form handlers |
| Treat `""` and `null` as distinct | More precise; clients must send the right one |
| Reject empty strings (`minLength: 1`) | Cleanest |
| Use `null` only for "explicitly absent" | Common API style |

**Unknown field policy — choose explicitly:**

| Policy | Schema setting | Use |
|---|---|---|
| **Strict** (reject) | `additionalProperties: false` | Public APIs, external partners |
| **Ignore** (drop silently) | `additionalProperties: true` (default) | Loose internal services, evolving fields |
| **Pass through** | Capture into a generic field | Webhook receivers, schema-less data |
| **Validate type but allow new fields** | `additionalProperties: { type: object }` | Limits what unknowns can be |

> **Strict on input** (catch typos, version mismatches) and **lenient on output** (don't break clients when you add a field). The classic Postel's law for APIs.

**Validation libraries — pick by stack:**

| Stack | Library |
|---|---|
| Node / TS | **Zod**, AJV, TypeBox, Yup, Valibot, io-ts |
| Python | **Pydantic v2**, marshmallow, jsonschema, fastjsonschema |
| Java | **Jakarta Bean Validation** (Hibernate Validator), `everit-org/json-schema` |
| Go | **go-playground/validator**, `xeipuuv/gojsonschema`, ozzo-validation |
| Ruby | dry-validation, dry-schema, ActiveModel validations |
| Rust | **serde** + derive validators (`validator`), `jsonschema` crate |
| .NET | DataAnnotations, FluentValidation, NJsonSchema |
| PHP | Symfony Validator, opis/json-schema |

**Code-first vs schema-first:**

| | Code-first | Schema-first |
|---|---|---|
| Source of truth | Code (Pydantic / Zod / classes) | YAML / JSON schema file |
| Generates schema for OpenAPI | Yes (auto) | (you write the schema) |
| Best for | Internal APIs, fast iteration | Public APIs, multi-team |
| Risk | Drift if you also hand-edit OpenAPI | Schema dialect mistakes |

**Request validation — minimum gates:**

| Gate | Detail |
|---|---|
| Body size limit | Reject huge payloads at the gateway |
| Content-Type allowlist | `application/json` only (or per route) |
| JSON parse | Fail with a clean error on malformed JSON |
| Schema validate | Reject with field-level errors |
| Authn / authz | Identity + permission checks |
| Rate limit | Per IP / per principal |
| Idempotency key | If mutating |

**Response validation — often skipped, very valuable:**

| Reason | Detail |
|---|---|
| Catch contract drift | Refactor accidentally changes shape |
| Validate examples in CI | Docs stay correct |
| Fixture generation | Mock responses match real shape |
| When to enable | At least in tests + staging; in production behind a flag (perf) |

**Error envelope — make it predictable:**

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "request_id": "req_01HV2…",
    "documentation_url": "https://api.example.com/docs/errors#validation",
    "details": [
      { "field": "email", "code": "format_invalid", "message": "must be a valid email" },
      { "field": "age",   "code": "min_value",      "message": "must be >= 18" }
    ]
  }
}
```

| Field | Why |
|---|---|
| `code` (machine) | Stable; clients pattern-match |
| `message` (human) | Free-form, can change |
| `details[].field` | Field-level path (`a.b[2].c`) for forms |
| `request_id` | Trace correlation |
| `documentation_url` | Help link |

**Complex / numeric formats — declare precisely:**

| Type | Pick |
|---|---|
| Money | `string` with `pattern` like `^-?\d+\.\d{2}$` (decimal precision); never `number` (binary float) |
| Date | `format: date` (ISO 8601 `YYYY-MM-DD`) |
| Date-time | `format: date-time` (RFC 3339) |
| Duration | ISO 8601 (`PT2H`) or seconds (integer) — pick one |
| Big integer | `string` (JS loses precision over 2⁵³) |
| Binary | `format: byte` (base64) or `binary` (raw bytes; multipart) |

**Versioning concerns — schema-aware:**

| Strategy | Detail |
|---|---|
| Stable schema with additive changes only | Most consumers stay compatible; see [api_versioning_*.md](api_versioning_backward_compatibility_evolution.md) |
| Per-version schemas (`UserV1`, `UserV2`) | Explicit; lots of duplication |
| Date-based pinning | Stripe-style — server runs the right schema per request header |
| Deprecate fields with `deprecated: true` | OpenAPI / JSON Schema |
| Tolerant reader on clients | Ignore unknown fields, default missing |

**Code-generation pipeline:**

| Stage | Tool |
|---|---|
| Spec | OpenAPI / JSON Schema in repo |
| SDK generation | OpenAPI Generator, Stainless, Speakeasy, Fern |
| Mock server | Prism, Microcks |
| Validation in framework | Pydantic / Zod / FastValidator |
| Contract test | Pact, Schemathesis, Dredd |
| Diff in CI | `oasdiff`, Optic |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Schema drift between server and OpenAPI | Docs / SDKs lie |
| `additionalProperties: true` everywhere | Typos pass silently |
| Implicit nullable / optional | Clients can't tell which field can be missing |
| Validation only at one layer | Schema catches bad input, but business path lets it through later |
| Free-text instead of enum | Garbage values; harder to evolve |
| Loose response schema | Refactor breaks clients quietly |
| Hand-written validation in controllers | Inconsistent across endpoints |
| One mega-schema for everything | Hard to evolve, hard to reuse |
| `format: email` doesn't validate per RFC 5321 | Use a real email lib for hard cases |
| Allowing huge arrays / strings | DoS surface — set `maxItems` / `maxLength` |

**Spec health checklist:**

| Check | Pass? |
|---|---|
| All endpoints schema-validate input | ✅ |
| Schemas reuse via `$ref`, not inlined | ✅ |
| `additionalProperties: false` on inbound | ✅ |
| Nullable + optional designed deliberately per field | ✅ |
| Field-level error envelope used everywhere | ✅ |
| Schemas in version control alongside the code | ✅ |
| Schemas tested with adversarial inputs | ✅ |
| Sizes capped (`maxLength`, `maxItems`) | ✅ |
| Diff for breaking changes runs in CI | ✅ |
| Examples kept in sync with schemas | ✅ |

**Rule of thumb:** **schema-validate at the boundary**, with **field-level error responses**. Be **strict on input** (`additionalProperties: false`) and **lenient on output** (clients tolerate new fields). **Decide nullable vs optional explicitly** per field. **One schema source** drives validation, docs, SDKs, and mocks — stop hand-rolling validators in controllers. For numeric precision (money, big IDs), use **strings** in the wire schema, not floats.
