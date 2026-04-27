### Mongoid Relations (Embedded vs Referenced)

**Two kinds of relations — pick by query pattern, not entity model:**

| Relation type | Stored as | Read shape | Use when |
|---|---|---|---|
| `embeds_one` / `embeds_many` | Subdocument(s) inside parent | One read fetches everything | Always-read-together, bounded, no independent lifecycle |
| `has_one` / `has_many` / `belongs_to` | Separate collection + foreign key | Two reads (or `$lookup`) | Independent lifecycle, queried alone, unbounded growth |
| `has_and_belongs_to_many` | Array of IDs in **both** docs | Two reads | Many-to-many without a join model |

**Embedded — DSL:**

| Macro | Direction | Example |
|---|---|---|
| `embeds_one :profile` | Parent → child (1:1) | User has one Profile inside it |
| `embeds_many :addresses` | Parent → children (1:many) | User has Address[] inside it |
| `embedded_in :user` | Child → parent (required on child class) | `class Address; embedded_in :user; end` |
| `embeds_many :addresses, store_as: "addrs"` | Custom array field name | |
| `cyclic: true` (option) | Allow self-embedding | Tree of comments inside comments |

**Referenced — DSL (mirrors ActiveRecord):**

| Macro | Direction | Stores |
|---|---|---|
| `belongs_to :user` | Child → parent | `user_id` field on this doc |
| `has_one :subscription` | Parent → child (1:1) | Nothing here; `user_id` lives on `Subscription` |
| `has_many :posts` | Parent → children | Nothing here; `user_id` lives on each `Post` |
| `has_and_belongs_to_many :roles` | Many-to-many | `role_ids` array on this AND `user_ids` array on Role |
| `has_many :posts, dependent: :destroy` | Cascade delete | Same options as AR (`:destroy`, `:delete_all`, `:nullify`, `:restrict_with_*`) |

**Embed-vs-reference decision:**

| Signal | Embed | Reference |
|---|---|---|
| Always read with parent | ✅ | |
| Queried independently of parent | | ✅ |
| Bounded array (≤ ~100, no growth) | ✅ | |
| Unbounded array (logs, comments stream) | | ✅ |
| 1:1 or 1:few | ✅ | |
| Many-to-many | | ✅ |
| Has its own lifecycle (own CRUD endpoints) | | ✅ |
| Atomic write across parent + child needed | ✅ | |
| Doc would exceed ~1 MB total | | ✅ |
| Field changes often, embedded in many docs | | ✅ |

**Operating on embedded children:**

| Operation | Code |
|---|---|
| Build + persist | `user.addresses.create!(city: "Warsaw")` |
| Atomic update across embedded docs | `user.addresses.where(city: "Warsaw").update_all(zip: "00-002")` |
| Replace whole subdoc | `user.create_profile(bio: "Dev")` |
| Drop one | `user.addresses.where(...).destroy` |

**Operating on referenced children:**

| Operation | Code |
|---|---|
| Eager-load to avoid N+1 | `User.includes(:posts)` |
| Mongo `$lookup` aggregation | `User.collection.aggregate([{ '$lookup' => {...} }, ...])` |
| Counter cache | Not built-in like AR — increment manually with `user.inc(posts_count: 1)` in callback |

**Pitfalls:**

| Pitfall | Why it bites | Fix |
|---|---|---|
| Embedding unbounded arrays (log entries, comments forever) | Doc grows to 16 MB cap, slows reads | Switch to a referenced collection with TTL index |
| Deeply nested embeds (3+ levels) | Hard to query, harder to update partially | Flatten or break out |
| `has_many` without an index on the FK | `belongs_to` lookups full-scan | `index({ user_id: 1 })` on the child |
| Expecting FK constraints | Mongo doesn't enforce them | Validate `presence: true` in app + snapshot critical fields onto the parent |
| Using HABTM and forgetting both sides update | Doc-level inconsistency | Prefer `has_many :through`-style explicit join model |

**Rule of thumb:** **Embed what's read together, reference what's queried independently.** If the array can grow without bound, reference it. If atomicity across parent + children matters, embed. Always index the `*_id` field on the referenced side (Mongoid won't add it automatically) — and remember Mongo doesn't enforce FKs, so embed a snapshot of fields you can't lose.
