### Ruby Memoization — Pitfalls with Falsey Values

**The classic memoization idiom:**

```ruby
def admin?
  @is_admin ||= compute_admin_status
end
```

| Property | Detail |
|---|---|
| First call | `@is_admin` is `nil` → falsey → assigns + returns |
| Subsequent calls | `@is_admin` is truthy → returns cached value |
| **Trap** | If `compute_admin_status` returns `false` or `nil`, the result is **falsey** → recomputed every call |

**Demonstration of the bug:**

```ruby
class User
  def admin?
    @is_admin ||= ActiveRecord::Base.connection.execute("SELECT ...").first['is_admin']
  end
end

# If the DB returns false:
user.admin?   # runs the query, returns false
user.admin?   # runs the query AGAIN — false is falsey, ||= reassigns
user.admin?   # and again, and again...
```

**Why `||=` fails for falsey results:**

| `@x` value | `@x ||= expr` |
|---|---|
| `nil` | Runs `expr` and assigns |
| `false` | Runs `expr` and assigns |
| `0`, `""`, `[]`, `{}` | Truthy in Ruby — `||=` returns existing value |
| Anything else | Truthy — returns existing |

> **Ruby's only falsey values are `nil` and `false`.** Other languages (Python, JS) treat `0`, `""`, `[]` as falsey too — Ruby doesn't. But that doesn't save the `||=` pattern when the answer can be `nil` or `false`.

**Safer pattern — `defined?` / `instance_variable_defined?`:**

```ruby
def admin?
  return @is_admin if defined?(@is_admin)
  @is_admin = compute_admin_status
end
```

Or:

```ruby
def admin?
  return @is_admin if instance_variable_defined?(:@is_admin)
  @is_admin = compute_admin_status
end
```

| Approach | Pros | Cons |
|---|---|---|
| `defined?` | Slightly faster | Returns string `"instance-variable"`, not boolean — but truthy-checks fine |
| `instance_variable_defined?` | Explicit, clear intent | Tiny overhead |

> Both correctly detect "we've cached *something* (even nil or false)" vs "we haven't cached at all".

**Hash-based memoization (cleanest pattern when arity isn't trivial):**

```ruby
def name_for(id)
  @name_cache ||= {}
  @name_cache.fetch(id) { @name_cache[id] = compute_name(id) }
end
```

| Win | Detail |
|---|---|
| Per-arg memoization | Different cached value per input |
| `fetch + block` handles all values | nil / false / 0 / "" all cache correctly |
| Easy to inspect / clear | `@name_cache` is just a Hash |

**Other safe patterns:**

```ruby
# Pattern: explicit sentinel
SENTINEL = Object.new

def admin?
  @is_admin = compute_admin_status if @is_admin.equal?(SENTINEL) || !defined?(@is_admin)
  @is_admin
end

# Pattern: `Memo` wrapper class
@memo ||= {}
@memo[:admin?] ||= [compute_admin_status]   # wrap in array; check truthiness on key
```

**`||=` is fine when the result is always truthy:**

```ruby
# Always-truthy results — ||= is safe and idiomatic
def total
  @total ||= line_items.sum(&:amount)        # numbers > 0
end

def display_name
  @display_name ||= "#{first_name} #{last_name}".strip
end

def items
  @items ||= []                                # initialize to empty array
end
```

> The pattern is fine for **non-falsey results** (positive integers, non-empty strings, computed objects, arrays of records).

**Rails-specific memoization patterns:**

| Pattern | Use |
|---|---|
| `memoize` from `ActiveSupport::Memoizable` | **Removed** in Rails 4 — don't use |
| Plain `||=` in models | Common but careful with falsey |
| `@cache ||= {}` + `fetch(key) { ... }` | Per-input |
| `Rails.cache.fetch(key) { compute }` | Cross-request memoization |
| `dry-initializer` + `option :foo, memoize: true` | DSL-driven |
| `memo_wise` gem | Method-level memoization with edge-case handling |

**`memo_wise` — the production-grade gem:**

```ruby
class User
  prepend MemoWise

  def admin?
    compute_admin_status
  end
  memo_wise :admin?

  def role_for(scope)
    db.lookup(scope)
  end
  memo_wise :role_for
end
```

| Win | Detail |
|---|---|
| Handles `nil` / `false` correctly | No falsey trap |
| Per-argument caching | `role_for(:foo)` and `role_for(:bar)` cached separately |
| Clear cache: `reset_memo_wise(:admin?)` | Selective invalidation |
| Frozen-friendly | Works with frozen objects |

**Performance considerations:**

| Concern | Detail |
|---|---|
| Memoization adds object allocations | Tracked in `@cache` hashes, etc. |
| Class-level caches across instances | Be careful with multi-tenant / multi-user contexts |
| Memoization in long-lived objects | Memory grows |
| Cleared on object lifecycle | Per-request models clear naturally |
| Constant memoization | Use `CONSTANT = expensive_compute.freeze` if value is process-static |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| `||=` for boolean / nullable result | Re-runs every time |
| Memoizing a method that depends on mutable input | Stale on input change |
| Memoizing across requests via class variables | Cache leaks across users |
| Memoizing in a Sidekiq worker that's reused | Stale state across jobs |
| Forgetting to invalidate after writes | "I just updated the record but `admin?` still returns false" |
| Memoizing `find` / `where` (DB calls) without considering test isolation | Test pollution |
| Memoization vs `Rails.cache` confusion | `||=` is per-instance; `Rails.cache` is process- or memcached-wide |

**When NOT to memoize:**

| Situation | Why |
|---|---|
| Compute is very cheap (< 1ms) | Memoization overhead is comparable |
| Result depends on changing state | Stale answers |
| Method is rarely called | No win |
| Method is called once per request anyway | No subsequent calls to amortize over |

**Diagnostic tools:**

| Tool | Use |
|---|---|
| `defined?(@var)` | Check before reading |
| `instance_variable_get(:@var)` | Inspect raw value |
| `instance_variables` | List all |
| `remove_instance_variable(:@var)` | Clear (returns the value) |
| `rack-mini-profiler` / `bullet` | See if methods are called repeatedly per request |

**Cross-references:**

- Pass-by-value + mutation: [pass_by_value_*.md](../core/pass_by_value_references_mutation.md)
- Equality methods (`==`, `eql?`, `equal?`): [equality_*.md](../core/equality_eq_eql_equal_methods.md)
- Profiling tools (find slow methods worth memoizing): [profiling_ruby_rails_*.md](../rails/features/profiling_ruby_rails_applications_rack_mini_profiler_stackprof_benchmark.md)

**Rule of thumb:** **`||=` is fine for always-truthy results; broken for `nil` / `false`.** When the answer can be falsey, use **`defined?` / `instance_variable_defined?`** or a **Hash with `fetch + block`**. For methods with arguments, **always use a Hash-based cache** keyed by the args. Reach for **`memo_wise`** when you want production-grade memoization without rolling your own.
