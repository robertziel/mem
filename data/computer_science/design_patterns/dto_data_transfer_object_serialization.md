### DTO — Data Transfer Object & Serialization

**Definition:** a plain data container that **carries values across boundaries** (process, layer, network) — **no behavior**, just shape.

**Why DTOs exist:**

| Reason | Detail |
|---|---|
| **Decouple internal model from external representation** | API doesn't change every time the DB does |
| **Hide internal fields** | `password_digest`, internal IDs, audit columns |
| **Shape for the consumer** | Mobile gets thin payload; admin gets rich payload |
| **Reduce over-fetching** | Don't ship every column |
| **Cross-language interop** | Wire format (JSON / Protobuf) instead of language-specific objects |
| **Versioning** | Multiple DTO versions for the same entity |
| **Validation boundary** | Inputs validated before reaching domain |

**DTO vs related concepts:**

| Concept | Has behavior? | Persisted? | Used for |
|---|---|---|---|
| **DTO** | ❌ no | No (transient) | Cross-boundary transfer |
| **Entity** | ✅ yes | Yes | Domain object with identity |
| **Value Object** | Optional (immutable) | Often embedded | Domain concept without identity (Money, Address) |
| **Form / Command object** | Validation only | No | Inbound write request |
| **View Model** | UI-shaped | No | Specific to a UI screen |
| **Aggregate root** | Behavior-rich | Yes | DDD consistency boundary |
| **Plain old object** (POJO / POCO / PORO) | Free shape | — | Generic term |

> **DTO = data only**. The moment it grows methods that enforce invariants, it's becoming an entity or value object.

**Ruby DTO (struct + Rails serializer):**

```ruby
# Plain DTO — just data
UserDTO = Struct.new(:id, :name, :email, :role, keyword_init: true)

class UsersController < ApplicationController
  def show
    user = User.find(params[:id])
    dto  = UserDTO.new(
      id: user.id, name: user.full_name, email: user.email, role: user.role.name
    )
    render json: dto.to_h
  end
end
```

**More idiomatic Rails — serializers play the DTO role:**

```ruby
# Blueprinter / Alba style
class UserBlueprint < Blueprinter::Base
  identifier :id
  fields :name, :email
  field :role do |user|
    user.role.name
  end
end

render json: UserBlueprint.render(user)
```

| Library | Role |
|---|---|
| **Jbuilder** | Built-in; explicit per-field |
| **Blueprinter** | Fast; declarative |
| **Alba** | Similar; minimal config |
| **panko_serializer** | Highest perf |
| **fast_jsonapi** (Vercel) | JSON:API spec compliance |
| **AMS** (Active Model Serializers) | Older default; less maintained |

**When to keep a DTO vs render directly:**

| Situation | Render directly | Use a DTO |
|---|---|---|
| One-off internal endpoint | ✅ | — |
| Public API | — | ✅ |
| Versioned API (v1 vs v2 shapes) | — | ✅ |
| Different shape per consumer (mobile vs web) | — | ✅ |
| Sensitive fields to hide | — | ✅ |
| Cross-service RPC | — | ✅ |
| Background job payload | — | ✅ (especially for forward compatibility) |
| GraphQL | Schema dictates shape | (schema is your DTO) |

**DTO patterns by direction:**

| Direction | Pattern |
|---|---|
| **Inbound** (controller / service input) | Validate raw params → instantiate input DTO / Form Object |
| **Outbound** (controller / service output) | Map domain object → response DTO via serializer |
| **Service-to-service RPC** | Schema-defined DTO (Protobuf, Avro, JSON Schema) |
| **Background job payload** | Lean DTO with primitive types |
| **Event** | Versioned DTO with stable codes (event sourcing / outbox) |

**Mapping rules — keep them dumb:**

| Rule | Why |
|---|---|
| Only field copies + simple transforms (cast / format) | Domain logic stays out of mappers |
| No DB calls inside a DTO mapper | Eager-load before mapping |
| No control flow that picks fields based on user permissions | Use auth-aware presenters or per-role serializers |
| Pure functions where possible | Easy to test |

**Common patterns:**

| Pattern | Detail |
|---|---|
| **Slim DTO** | Only what the consumer needs |
| **Fat DTO** | All shareable fields; consumer picks |
| **Versioned DTO** | `UserV1`, `UserV2` for breaking changes |
| **Polymorphic DTO** | Discriminator field + `oneOf` schema |
| **Nested vs flat** | Embed sub-DTOs vs ID references |
| **Sparse fieldsets** | `?fields=id,name` (JSON:API style) |
| **Includes / sideload** | `?include=customer,items` |
| **Pagination envelope** | `{ data: [...], pagination: {...} }` |

**Wire formats — pick by use case:**

| Format | Strengths | Weaknesses |
|---|---|---|
| **JSON** | Universal, human-readable | Verbose, no schema enforcement |
| **MessagePack** | Smaller, faster than JSON | Binary; less debug-friendly |
| **CBOR** | RFC standard; binary JSON | Niche |
| **Protocol Buffers** | Strict schema, codegen, fast, small | Tooling required |
| **Avro** | Schema-evolution-friendly | Common in Kafka, Hadoop |
| **Thrift** | Older Apache spec | Less popular than Protobuf |
| **GraphQL** | Schema = contract; client picks fields | Different model |
| **JSON Schema** | Layered on top of JSON | Validation, not codegen by default |

**Validation at the boundary:**

| Concern | Detail |
|---|---|
| Input DTOs validated before domain layer | Bad data never reaches business logic |
| Validators: Pydantic / Zod / Yup / dry-validation / FluentValidation | One per stack |
| Field-level errors mapped to API error envelope | See [error_handling_*.md](../api_design/error_handling_problem_details_rfc7807_structured_errors.md) |
| Nullable vs optional matrix | Designed deliberately per field |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Returning DB models directly | Internal columns leak; refactor breaks API |
| Renaming fields without versioning | Breaking change |
| Putting business logic in DTOs | They become entities; pollutes the layer |
| Different DTO per endpoint with no naming convention | Inconsistent contracts |
| Including `password` / `token` / PII fields | Privacy / compliance breach |
| Re-using DTOs across read + write | Field shape mismatch (e.g., write-only `password` field on read DTO) |
| Inflating DTOs to "future-proof" | Bigger payloads, slower |
| Ignoring nullability rules | Silent breaks on consumers |

**DTOs in microservices / RPC:**

| Concern | Detail |
|---|---|
| **Shared schema** | Distribute via Protobuf / OpenAPI to all callers |
| **Schema registry** | Confluent, Apicurio for Avro/Protobuf compatibility checks |
| **Backward / forward compatibility** | Add fields, never remove; versioned wire types |
| **Generated clients** | Each service consumes generated DTOs from shared schema |
| **Tolerant readers** | Ignore unknown fields; default missing |

**Per-language idioms:**

| Stack | DTO style |
|---|---|
| Java / Kotlin | `record` (Java 14+) / `data class` (Kotlin) |
| C# | `record` (C# 9+) |
| TypeScript | `interface` / `type` / Zod schema |
| Go | `struct` with JSON tags |
| Rust | `#[derive(Serialize, Deserialize)]` structs (serde) |
| Python | `dataclass` / Pydantic model |
| Ruby | Plain Struct / Hash / serializer |
| Swift | `Codable` struct |

**Test patterns:**

| Test | What |
|---|---|
| Round-trip JSON | `to_json → from_json` produces equivalent value |
| Field-level encoding | One DTO field at a time |
| Schema regression | OpenAPI / Protobuf diff catches break |
| Contract test | Pact-style consumer expectations |

**Cross-references:**

- Schema validation: [schemas_validation_json_schema_*.md](../api_design/schemas_validation_json_schema_request_response.md)
- API contract evolution: [api_contract_*.md](../api_design/api_contract_request_response_compatibility_consumer_provider.md)
- API error envelope: [error_handling_*.md](../api_design/error_handling_problem_details_rfc7807_structured_errors.md)
- Service objects / clean architecture: [clean_architecture_*.md](architectural/clean_architecture_layers_dependency_rule.md)

**Rule of thumb:** **DTO to control what data crosses boundaries** — never expose your DB model directly. **In Rails, serializers play the DTO role**. Keep DTOs **dumb (data only)**, map them with **simple field-copy transforms**, and validate **at the input boundary** before the domain layer sees the data. Versioned DTOs + tolerant readers = backward-compatible APIs.
