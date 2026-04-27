### Mongoid Setup, Field Types, Indexes

**Setup essentials:**

| Step | Command / file |
|---|---|
| Add gem | `gem 'mongoid', '~> 8.0'` |
| Generate config | `rails g mongoid:config` → `config/mongoid.yml` |
| Apply indexes | `rake db:mongoid:create_indexes` |
| Drop stale indexes | `rake db:mongoid:remove_undefined_indexes` |

**Connection knobs (`config/mongoid.yml`):**

| Key | Meaning |
|---|---|
| `database` | DB name |
| `hosts` | `host:port` list (replica set members for HA) |
| `options.server_selection_timeout` | Seconds to find a primary before raising |
| `options.max_pool_size` | Mongo client connection pool (default 5) |
| `options.read` | `:primary`, `:secondary`, `:secondary_preferred`, ... |

**Model skeleton:**

```ruby
class User
  include Mongoid::Document
  include Mongoid::Timestamps   # adds created_at, updated_at

  field :name,  type: String
  field :age,   type: Integer
  field :tags,  type: Array, default: []
end
```

**Field types (declare every field — schemaless DB, but Mongoid wants types):**

| Type | Stored as | Notes |
|---|---|---|
| `String` | UTF-8 | Default if `type:` omitted |
| `Integer` | int64 | |
| `Float` | double | |
| `BigDecimal` | string | For money — avoid `Float` |
| `Boolean` | bool | |
| `Date` / `DateTime` / `Time` | BSON Date | Stored as UTC |
| `Array` | array | Native; multikey index possible |
| `Hash` | object | Nested; index dotted paths like `"metadata.source"` |
| `BSON::ObjectId` | ObjectId | Default `_id` type |
| `Symbol` | string | Avoid — round-trips lose symbol-ness |
| Custom class | varies | Define `mongoize` / `demongoize` |

**Index syntax (declared in the model):**

| Form | Meaning |
|---|---|
| `index({ email: 1 }, { unique: true })` | Ascending unique index |
| `index({ active: 1, created_at: -1 })` | Compound index, follow ESR (Equality, Sort, Range) |
| `index({ tags: 1 })` | Multikey index on an array field — supports `tags.in` queries |
| `index({ "metadata.source" => 1 })` | Index on a nested hash key |
| `index({ name: "text" })` | Text index for `$text` search |
| `index({ loc: "2dsphere" })` | Geo index |
| `{ background: true }` (option) | Build without blocking (deprecated in 4.2+ — built-in now) |
| `{ partial_filter_expression: { active: true } }` | Partial index — only for matching docs |
| `{ expire_after_seconds: 3600 }` | TTL index — auto-deletes after N seconds |

> **ESR rule** for compound indexes: list **E**quality fields first, then **S**ort, then **R**ange. Wrong order → index not used.

**Validations — same API as ActiveRecord:**

| Validator | Example |
|---|---|
| Presence | `validates :name, presence: true` |
| Uniqueness | `validates :email, uniqueness: true` (also add a unique index!) |
| Format | `validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }` |
| Inclusion | `validates :role, inclusion: { in: %w[user admin] }` |
| Numericality | `validates :age, numericality: { greater_than: 0 }, allow_nil: true` |
| Length | `validates :bio, length: { maximum: 500 }` |
| Custom | `validate :method_name` |

**Common pitfalls:**

| Pitfall | Fix |
|---|---|
| `validates uniqueness` without unique index | Race conditions still allow duplicates — **always** pair with `index({...}, unique: true)` |
| Using `Float` for money | Switch to `BigDecimal` — Mongo stores it as a string, but you avoid floating-point error |
| Forgetting `rake db:mongoid:create_indexes` after adding `index` | Index lines in the model do **nothing** until applied |
| Storing PII in dynamic fields | Hard to enumerate / audit — declare every field explicitly |

**Rule of thumb:** declare every field with a type — even though Mongo is schemaless, Mongoid's casting is what gives you safe queries. Indexes live in the model but only apply when `rake db:mongoid:create_indexes` runs — wire it into your deploy. Pair every `validates :x, uniqueness: true` with a unique index, otherwise concurrent inserts will slip past validation.
