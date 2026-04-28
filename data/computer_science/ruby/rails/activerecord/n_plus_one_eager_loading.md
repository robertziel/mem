### Rails ActiveRecord — N+1 Queries & Eager Loading

**Definition:** an **N+1 query** problem occurs when you fetch a list of N records, then load an association for each one — resulting in **1 + N** database queries instead of one or two.

**Demonstration:**

```ruby
posts = Post.all                   # 1 query: SELECT * FROM posts
posts.each { |p| p.comments.count } # N queries — one per post
                                    # SELECT COUNT(*) FROM comments WHERE post_id = 1
                                    # SELECT COUNT(*) FROM comments WHERE post_id = 2
                                    # ... (N times)
```

| Property | Detail |
|---|---|
| 1 query loads N parents | Correct |
| Each iteration triggers another query | The N+1 |
| Total: **N+1 queries** | Should be 1 or 2 |

**Three eager-loading methods (in increasing strictness):**

| Method | Strategy | When to use |
|---|---|---|
| **`includes`** | Picks `preload` or `eager_load` based on whether you reference the association in `where` / `order` | **Default** — let Rails decide |
| **`preload`** | **Always separate queries** — one query per association | When you don't filter / order by the association |
| **`eager_load`** | **Always `LEFT OUTER JOIN`** — single query | When you need to filter / order by the association |
| **`joins`** | `INNER JOIN` — does **not** load the records (just allows filtering) | For SQL filtering only, no record access |

**Quick decision tree:**

| Need | Method |
|---|---|
| Just iterate the association | `preload` (or `includes`) |
| Filter / order by the association in SQL | `eager_load` |
| Just filter; not load records | `joins` |
| Mixed; let Rails figure it out | `includes` |

**Examples:**

```ruby
# Simple eager load
Post.includes(:comments).each { |p| p.comments.size }
# 2 queries: posts + comments

# Eager load with filter on the association
Post.includes(:comments).where(comments: { approved: true })
# 1 query with LEFT OUTER JOIN (Rails picks eager_load)

# Force separate queries (e.g., when you don't need the join)
Post.preload(:comments)
# Always 2 queries

# Force a join (e.g., for filtering)
Post.eager_load(:comments).where(comments: { approved: true })
# 1 query, LEFT OUTER JOIN

# Just filter, don't load
Post.joins(:comments).where(comments: { approved: true })
# 1 query, INNER JOIN; comments not preloaded
```

**Nested eager loading:**

```ruby
# Multiple associations
Post.includes(:comments, :author)

# Nested
Post.includes(comments: :author)

# Deeper
Post.includes(comments: [:author, { replies: :author }])
```

**`size` vs `count` vs `length`:**

| Method | Detail |
|---|---|
| **`size`** | Smart — uses cached count if loaded, queries `COUNT(*)` otherwise; **best with eager load** |
| `count` | Always queries `COUNT(*)` — bypasses cache |
| `length` | Loads all records and calls `.length`; expensive |

```ruby
posts = Post.includes(:comments)
posts.each { |p| p.comments.size }    # ✅ uses preloaded comments — 0 extra queries
posts.each { |p| p.comments.count }   # ⚠️ runs COUNT(*) per post — N+1 returns
posts.each { |p| p.comments.length }  # OK — just length on already-loaded array
```

**Counter caches — eliminate count queries entirely:**

```ruby
class Post < ApplicationRecord
  has_many :comments
end

class Comment < ApplicationRecord
  belongs_to :post, counter_cache: true
end
# Add migration: add_column :posts, :comments_count, :integer, default: 0

# Now:
post.comments_count   # zero queries — read from posts.comments_count
```

**Detection tools:**

| Tool | Use |
|---|---|
| **`bullet` gem** | **The standard.** Logs N+1 + unused-eager-loads in dev / test |
| `rack-mini-profiler` | Shows query count + slow queries per request |
| Rails log | Watch for repeated similar queries |
| `prosopite` gem | More accurate N+1 detection than `bullet` for some patterns |
| APM (Datadog / New Relic / Scout) | Production detection |
| `EXPLAIN` / `EXPLAIN ANALYZE` | Verify the join plan |

**Bullet configuration (Rails dev):**

```ruby
# config/environments/development.rb
config.after_initialize do
  Bullet.enable        = true
  Bullet.alert         = true   # browser alert
  Bullet.bullet_logger = true
  Bullet.console       = true
  Bullet.rails_logger  = true
  Bullet.add_footer    = true
end
```

**Common N+1 patterns and fixes:**

| Pattern | Fix |
|---|---|
| `Post.all; posts.each { |p| p.author.name }` | `Post.includes(:author)` |
| Iterating + counting | `includes(:children) + .size`, or `counter_cache` |
| Polymorphic belongs_to | `includes(:owner)` (Rails resolves polymorphism automatically) |
| Has-many-through | `includes(through: :join_model)` |
| Decorators that call associations | Eager load before decorating |
| Serializers that include associations | Eager load before serialization |

**Polymorphic + N+1:**

```ruby
class Comment < ApplicationRecord
  belongs_to :commentable, polymorphic: true
end

# Without eager loading: query per comment for the polymorphic owner
Comment.all.each { |c| c.commentable.name }     # N+1

# With:
Comment.includes(:commentable).each { |c| c.commentable.name }    # 1 + 1 query per type
```

**`has_many :through` + N+1:**

```ruby
class Author < ApplicationRecord
  has_many :authored_posts
  has_many :posts, through: :authored_posts
end

Author.all.each { |a| a.posts.size }   # N+1

# Fix:
Author.includes(:posts).each { |a| a.posts.size }
# Or:
Author.includes(:authored_posts, :posts).each { ... }
```

**Strict loading (Rails 6.1+) — fail fast on N+1:**

```ruby
class Post < ApplicationRecord
  has_many :comments, strict_loading: true
end

# Now:
post.comments   # raises ActiveRecord::StrictLoadingViolationError if not eager loaded

# Per-query:
Post.strict_loading.each { ... }
```

| Win | Detail |
|---|---|
| Surfaces N+1 immediately | Test failures point to the exact spot |
| Force eager loading | Apps with strict_loading enabled rarely have N+1 |
| Production-safe | Errors only when not eager-loaded |
| Configure globally | `config.active_record.strict_loading_by_default = true` (Rails 7+) |

**Loaded vs not-loaded check:**

```ruby
post = Post.first
post.association(:comments).loaded?     # false
post.comments.to_a                        # triggers query
post.association(:comments).loaded?     # true
```

**Avoiding N+1 in serializers:**

```ruby
# Without eager loading: serialization triggers per-row queries
render json: Post.all, include: :comments

# With:
render json: Post.includes(:comments), include: :comments
```

**Common false positives / negatives:**

| Case | Detail |
|---|---|
| Eager load you don't actually use | Bullet flags as "unused" — clean up |
| Calling `where` on the loaded association | Triggers another query (loses the cache) |
| Using `count` instead of `size` after eager load | Bypasses the cache |
| Calling `.reload` | Clears the eager-loaded data |

**Production-side detection:**

| Tool | Use |
|---|---|
| `rack-mini-profiler` (admin-only in prod) | Per-request query count |
| APM (Datadog / New Relic / Scout) | DB call count per endpoint |
| Slow query log | Persistent N+1 may appear here as repeated identical queries |
| Custom: log query count > threshold | Flag requests with > 50 queries |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Using `.count` after `includes` | Loses the cache; runs COUNT(*) anyway |
| Calling `.where` after `includes` on the association | Re-queries |
| Mixing `joins` with `includes` accidentally | Triggers `eager_load` strategy |
| Eager loading too eagerly | Loads megabytes of unused data |
| Forgetting `includes` after refactor | Silent N+1 on production |
| Strict-loading missing on new associations | Quiet regressions |
| Per-record decorator that touches associations | Same as N+1 in views |
| `Bullet` only enabled in dev, not test | Misses CI catches |

**Decision matrix:**

| Need | Pick |
|---|---|
| Iterate parents + access associations | `includes(:assoc)` |
| Filter on association | `includes(:assoc).where(assoc: { ... })` (becomes `eager_load`) |
| Just SQL filter, no preload | `joins(:assoc).where(...)` |
| Force separate queries | `preload(:assoc)` |
| Force JOIN | `eager_load(:assoc)` |
| Get count without loading | `counter_cache` |
| Catch N+1 at runtime | `strict_loading: true` |

**Cross-references:**

- Query optimization (EXPLAIN, indexes, sargability): [query_optimization_*.md](../../../database_engineering/query_optimization_explain_analyze_indexes.md)
- Profiling (`bullet`, `rack-mini-profiler`, `stackprof`): [profiling_ruby_rails_*.md](../features/profiling_ruby_rails_applications_rack_mini_profiler_stackprof_benchmark.md)
- Callbacks + counter caches: [callbacks_*.md](callbacks_before_save_after_commit_lifecycle.md)

**Rule of thumb:** **start with `includes` and measure with `bullet`.** When you reference an association in `where` / `order`, **`includes` becomes `eager_load`** (a JOIN). For simple iteration, **`preload`** keeps the queries separate (often easier to reason about). Use **`size`** on associations (not `count`), prefer **`counter_cache`** for high-traffic counts, and consider **`strict_loading: true`** to catch new N+1 issues automatically.
