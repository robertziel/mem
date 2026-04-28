### Ruby `OpenStruct` — Dynamic Attributes (Avoid in Production)

**Definition:** **`OpenStruct`** lets you assign attributes dynamically to an object — convenient for prototyping, but **slow** (uses `method_missing` internally), **type-unsafe**, and **memory-hungry**. Use **`Struct`** or **`Data.define`** in production code; reserve `OpenStruct` for the REPL/console.

**Side-by-side: dynamic vs typed alternatives:**

| Need | Pick |
|---|---|
| Immutable value object | **`Data.define`** (Ruby 3.2+) |
| Mutable value object | **`Struct.new`** |
| Dynamic attributes (production) | **`Hash`** |
| Quick prototype / REPL | `OpenStruct` (only here) |

**OpenStruct demo:**

```ruby
require "ostruct"

person = OpenStruct.new(name: "Alice", age: 30)
person.name              # "Alice"
person.email = "a@b.com"  # dynamically adds attribute!
person.email             # "a@b.com"

# Typo creates new attribute silently — no error:
person.emial = "x@y.com"   # 🪲 silent bug — missing 'a'
person.email               # still "a@b.com"
```

**Why avoid in production:**

| Problem | Detail |
|---|---|
| **Slow** | Uses `method_missing`; no method cache |
| **No type checking** | Wrong assignment passes silently |
| **No defined interface** | Hard to know what fields exist |
| **Hard to debug** | Typos create new attributes silently |
| **Memory overhead** | Each instance defines its own singleton methods |
| **Not Ractor-safe** | Mutable shared state |
| **Slower equality** | More work than `Struct` |
| **Frozen-warning in Ruby 3.x+** | The community is moving away |

**Better alternatives — when to use which:**

| Need | Pick | Mutable? | Type-safe? |
|---|---|---|---|
| Immutable value | **`Data.define(:name, :age)`** | ❌ | Field names enforced |
| Mutable value | **`Struct.new(:name, :age)`** | ✅ | Field names enforced |
| Open shape (truly dynamic) | **`Hash`** | ✅ | ❌ (just a map) |
| Class with logic | **Define a class** | Yes | Strongly defined |

**Examples:**

```ruby
# Data.define — Ruby 3.2+ immutable value object
Money = Data.define(:amount_cents, :currency)
m = Money.new(amount_cents: 1000, currency: "USD")
m.amount_cents   # 1000
m.amount_cents = 500  # NoMethodError — frozen

# Struct — mutable value object
Point = Struct.new(:x, :y) do
  def distance_to(other) = Math.hypot(x - other.x, y - other.y)
end
p = Point.new(1, 2)
p.x = 5    # OK

# Hash — when you really need dynamic keys
data = { name: "Alice", age: 30 }
data[:email] = "a@b.com"
```

**Comparing the four options:**

| Feature | `OpenStruct` | `Hash` | `Struct` | `Data.define` |
|---|---|---|---|---|
| Speed | Slow | Fast | Fast | Fast |
| Field defined upfront | ❌ | ❌ | ✅ | ✅ |
| Mutable | ✅ | ✅ | ✅ | ❌ |
| Field access | `.name` | `[:name]` | `.name` or `[:name]` | `.name` |
| Equality | By value | By value | By value | By value |
| Pattern matching | Limited | ✅ | ✅ | ✅ |
| `to_h` | ✅ | n/a | ✅ | ✅ |
| `with(...)` (copy with changes) | ❌ | merge | n/a | ✅ |
| Use for production | ❌ | OK | ✅ | ✅ |

**Performance reality:**

| Operation | OpenStruct | Struct |
|---|---|---|
| Create | Slow (define singletons) | Fast |
| Read attribute | Slow (method_missing) | Fast |
| Compare | Slow | Fast |
| Memory per instance | High | Low |
| Net | ~5–10× slower than Struct | Native |

**When `OpenStruct` is OK:**

| Scenario | Detail |
|---|---|
| REPL / console exploration | Type fewer characters |
| One-off scripts | Negligible perf cost |
| Test fixtures (rare) | Quick `OpenStruct` for stub data |
| **Never** in hot-path code | Performance hit |
| **Never** in long-lived objects | Memory hit |

**Common patterns to replace `OpenStruct`:**

```ruby
# ❌ Avoid in tests
user = OpenStruct.new(id: 1, name: "Alice")

# ✅ Use Struct
User = Struct.new(:id, :name)
user = User.new(1, "Alice")

# ✅ Or a test double (RSpec)
user = double("User", id: 1, name: "Alice")

# ✅ Or just a Hash for quick stubs
user = { id: 1, name: "Alice" }

# ❌ Avoid in API responses
def to_response
  OpenStruct.new(success: true, data: results)
end

# ✅ Use a Hash
def to_response
  { success: true, data: results }
end
```

**Pattern matching with `Data.define`:**

```ruby
Money = Data.define(:amount_cents, :currency)

case payment
in Money(amount_cents: 0..)         # any non-negative
  "valid"
in Money(currency: "USD")            # USD only
  "us payment"
end
```

**`with(...)` — immutable copy with changes (`Data.define`):**

```ruby
m = Money.new(amount_cents: 1000, currency: "USD")
m2 = m.with(amount_cents: 2000)   # new instance, original unchanged
m.amount_cents   # 1000
m2.amount_cents  # 2000
```

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| `OpenStruct` in hot path | 5–10× slower than alternatives |
| Typo creating phantom attribute | Silent bugs |
| `OpenStruct` in pub/sub message | Marshal overhead |
| Comparing `OpenStruct` to `Struct` | Different `==` semantics |
| Using `OpenStruct` because "Hash is too verbose" | Use `Data.define` |
| Frozen `OpenStruct` | Can't add attrs, defeats the purpose |
| Inheriting from `OpenStruct` | Subtle behavior |

**Decision matrix:**

| Need | Pick |
|---|---|
| Production value object (immutable) | **`Data.define`** |
| Production value object (mutable) | **`Struct.new`** |
| Production map | **`Hash`** |
| Production class with behavior | Define a class |
| REPL exploration | `OpenStruct` |
| Test stub | `Hash` or RSpec `double` |

**Cross-references:**

- `attr_reader` / `attr_writer` / `attr_accessor`: [attr_reader_*.md](attr_reader_writer_accessor.md)
- Equality methods (`==` / `eql?`): [equality_*.md](equality_eq_eql_equal_methods.md)
- Symbols vs strings: [symbols_vs_strings.md](symbols_vs_strings.md)
- Class vs Module: [class_vs_module.md](class_vs_module.md)

**Rule of thumb:** **`OpenStruct` only in REPL/console** for quick prototyping. **Never in production** — it's slow, type-unsafe, and silently swallows typos. Use **`Data.define`** for immutable value objects (Ruby 3.2+), **`Struct.new`** for mutable, **`Hash`** for truly dynamic shape.
