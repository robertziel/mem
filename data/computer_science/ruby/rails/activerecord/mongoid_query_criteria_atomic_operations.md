### Mongoid Querying (Criteria API, Atomic Operations, Scopes)

**Criteria API — chainable, lazy, hits Mongo only on terminal call:**

| Operation | Code |
|---|---|
| Simple where | `User.where(active: true)` |
| Comparison | `User.where(:age.gte => 18, :age.lte => 65)` |
| Negation | `User.not(role: "banned")` |
| `$in` (array of options) | `User.in(role: ["admin", "moderator"])` |
| Array contains any | `User.where(:tags.in => ["ruby", "rails"])` |
| Array contains all | `User.where(:tags.all => ["ruby", "rails"])` |
| OR | `User.or({ role: "admin" }, { role: "moderator" })` |
| Regex | `User.where(name: /^Jan/i)` |
| Nested hash field | `User.where("metadata.source" => "api")` |
| Sort + limit + skip | `User.order_by(created_at: :desc).limit(20).skip(40)` |
| Project (include only) | `User.only(:name, :email)` |
| Project (exclude) | `User.without(:metadata)` |
| Pluck | `User.pluck(:email)` |
| Count | `User.where(active: true).count` |
| Existence check | `User.where(...).exists?` |
| Distinct values | `User.distinct(:role)` |

**Mongo operator → Mongoid symbol-method mapping:**

| Mongo | Mongoid |
|---|---|
| `$eq` | `where(field: x)` |
| `$ne` | `where(:field.ne => x)` or `not(field: x)` |
| `$gt` / `$gte` | `:field.gt` / `:field.gte` |
| `$lt` / `:lte` | `:field.lt` / `:field.lte` |
| `$in` | `:field.in` |
| `$nin` | `:field.nin` |
| `$exists` | `:field.exists => true/false` |
| `$type` | `:field.type` |
| `$regex` | `where(field: /pattern/)` |
| `$elemMatch` | `:field.elem_match` |
| `$size` | `:field.with_size` |

**Find-style methods:**

| Method | Returns | Misses → |
|---|---|---|
| `User.first` / `.last` | doc or nil | nil |
| `User.find(id)` | doc | raises `Mongoid::Errors::DocumentNotFound` |
| `User.find_by(email: x)` | first match | raises `DocumentNotFound` |
| `User.find_or_create_by(email: x)` | doc | creates one |
| `User.where(...).first_or_create(defaults)` | doc | creates one |

**Aggregation pipeline (escape hatch into raw Mongo):**

```ruby
User.collection.aggregate([
  { '$match' => { active: true } },
  { '$group' => { '_id' => '$role', 'count' => { '$sum' => 1 } } },
  { '$sort'  => { 'count' => -1 } }
])
```

**Atomic operations (skip load-modify-save, race-safe):**

| Operation | Code | Mongo op |
|---|---|---|
| Increment | `user.inc(login_count: 1)` | `$inc` |
| Push to array | `user.push(tags: "x")` | `$push` |
| Add to array (only if absent) | `user.add_to_set(tags: "x")` | `$addToSet` |
| Pull from array | `user.pull(tags: "old")` | `$pull` |
| Set fields | `user.set(last_login: Time.current)` | `$set` |
| Unset field | `user.unset(:deprecated)` | `$unset` |
| Bitwise | `user.bit(flags: { and: 0xff })` | `$bit` |
| Bulk update many | `User.where(active: false).update_all('$set' => { archived: true })` | `$set` |

> **Why atomic ops matter:** `user.update(login_count: user.login_count + 1)` is a read-modify-write that races. `user.inc(login_count: 1)` is one server-side op — race-free.

**Scopes — same shape as AR:**

```ruby
class Post
  include Mongoid::Document
  scope :published, -> { where(status: "published") }
  scope :recent,    -> { order_by(created_at: :desc).limit(10) }
  scope :tagged,    ->(tag) { where(:tags.in => [tag]) }
end

Post.published.recent.tagged("mongodb")
```

**Pitfalls:**

| Pitfall | Why it bites | Fix |
|---|---|---|
| `update` (load-modify-save) on hot counter | Race between read and write | Use `inc` / `set` |
| `pluck` on a huge collection | Loads all values into memory | Use `each_slice` or batch with `no_timeout` |
| Missing index on `where` field | Full collection scan | Add `index({ field: 1 })`, then `db:mongoid:create_indexes` |
| `count` for existence | Counts whole match | `exists?` is much cheaper |
| Forgetting that `or` needs criteria hashes | `User.or(:role => "x")` ignored | `User.or({ role: "x" }, { role: "y" })` |

**Rule of thumb:** the Criteria API mirrors AR — `.where`, `.order_by`, `.limit`, scopes, all chainable, all lazy. For mutations on shared rows (counters, arrays) **always** use atomic ops (`inc`, `push`, `add_to_set`, `set`) instead of load-modify-save — Mongoid's atomic ops map 1:1 to Mongo update operators. Drop into `Model.collection.aggregate(...)` when the Criteria API can't express what you need.
