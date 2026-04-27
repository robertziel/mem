### Mongoid vs ActiveRecord (ORM Differences Overview)

Master orientation page. For depth see:

- [mongoid_setup_field_types_indexes.md](mongoid_setup_field_types_indexes.md)
- [mongoid_relations_embedded_vs_referenced.md](mongoid_relations_embedded_vs_referenced.md)
- [mongoid_query_criteria_atomic_operations.md](mongoid_query_criteria_atomic_operations.md)

**Differences at a glance:**

| Concern | ActiveRecord | Mongoid |
|---|---|---|
| Schema | `db/migrate/*.rb` migrations | Declared inside the model with `field :name, type: ...` |
| Primary key | Integer auto-increment (`id`) | `BSON::ObjectId` (string-ish, sortable, has timestamp) |
| Joins | SQL `JOIN` (`includes`, `joins`, `eager_load`) | `$lookup` aggregation, or eager loading with `includes` for refs |
| Transactions | Full ACID, default | Multi-doc txns supported (MongoDB 4.0+) — opt-in, replica set required |
| Embedded docs | Not a thing — use a separate table | First-class: `embeds_one`, `embeds_many` |
| Schemaless / dynamic fields | No | Optional dynamic fields, `store_in`, `Hash` typed fields |
| Array / Hash fields | No (use `serialize` or jsonb on PG) | Native `Array`, `Hash` field types |
| Indexes | Defined in migrations | Defined in the model, applied via `rake db:mongoid:create_indexes` |
| Migrations | Required for every schema change | Only for data-shape backfills (no DDL) |
| Validations API | `validates :x, presence: ...` | **Same** API — Mongoid mimics AR |
| Callbacks API | `before_save`, `after_commit`, ... | **Same** API (no `after_commit` — see below) |

**Callback parity (Mongoid mostly mirrors AR):**

| Callback | AR | Mongoid |
|---|---|---|
| `before_validation` / `after_validation` | ✅ | ✅ |
| `before_save` / `after_save` / `around_save` | ✅ | ✅ |
| `before_create` / `after_create` | ✅ | ✅ |
| `before_update` / `after_update` | ✅ | ✅ |
| `before_destroy` / `after_destroy` | ✅ | ✅ |
| `after_commit` / `after_rollback` | ✅ | ❌ (no transaction lifecycle hook) |

> Mongoid validations look identical to AR (`validates :email, presence: true, uniqueness: true`), so the same cheatsheet applies — see [validations_custom_validator_uniqueness.md](validations_custom_validator_uniqueness.md).

**When to reach for Mongoid (not "MongoDB ↔ Rails", which is the other direction):**

| Use case | Lean toward |
|---|---|
| Heavily nested data always read together | Mongoid (`embeds_many`) |
| Schemaless or rapidly-evolving fields | Mongoid |
| Strict relational integrity, complex joins | ActiveRecord on PostgreSQL |
| Multi-doc / cross-table ACID transactions | ActiveRecord on PostgreSQL |
| Polyglot persistence (Mongo for one model only) | Mongoid alongside AR — both can coexist |

**Rule of thumb:** Mongoid is "AR with embedded documents and no migrations." The API is intentionally familiar — most AR cheatsheets transfer directly. The two real differences that bite: **no `after_commit` hook** (Mongoid has no transaction lifecycle that maps to it), and **indexes live in the model** (apply with `rake db:mongoid:create_indexes` after deploys, like running migrations).
