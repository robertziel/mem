### Ruby — `attr_reader`, `attr_writer`, `attr_accessor`

**Definition:** Ruby class macros that **auto-generate getter and/or setter methods** for instance variables. Saves boilerplate; makes intent visible.

**The three forms:**

| Macro | Generates | Equivalent to |
|---|---|---|
| **`attr_reader :x`** | Getter `#x` | `def x; @x; end` |
| **`attr_writer :x`** | Setter `#x=` | `def x=(v); @x = v; end` |
| **`attr_accessor :x`** | Both `#x` and `#x=` | Combination of both |

**Side-by-side example:**

```ruby
class User
  attr_reader   :id            # read-only public
  attr_writer   :password       # write-only public
  attr_accessor :email          # read + write public

  def initialize(id)
    @id = id
  end
end

u = User.new(42)
u.id          # 42
u.email = "a@b.c"; u.email
u.password = "secret"
u.password    # NoMethodError — no reader
```

**Multiple attrs in one declaration:**

```ruby
class Order
  attr_reader   :id, :placed_at, :customer_id
  attr_accessor :status, :total_cents
end
```

**Visibility modifiers — getters / setters can be private / protected:**

```ruby
class Account
  attr_accessor :balance
  private :balance=     # the SETTER is private; reader still public
  # or:
  private               # everything below is private
  attr_writer :balance
end
```

| Visibility | Detail |
|---|---|
| `private :method` | Callable only on `self` (no explicit receiver, except for setters in modern Ruby) |
| `protected :method` | Callable from same-class or subclass instances |
| `public :method` | Default |

**Common idioms:**

| Pattern | Use |
|---|---|
| `attr_reader` for IDs / immutable identity | Caller can't change `id` |
| `attr_reader` + manual setter for validation | Custom setter validates input |
| `attr_accessor` for simple value objects | `Struct`-like usage |
| `attr_writer` alone | Write-only credentials, secrets |

**Custom validation in a setter (don't use `attr_writer`):**

```ruby
class Order
  attr_reader :total_cents

  def total_cents=(value)
    raise ArgumentError, "must be non-negative" if value < 0
    @total_cents = value
  end
end
```

**`Struct` and `Data` — alternatives for value-only objects:**

```ruby
# Struct (mutable)
Point = Struct.new(:x, :y) do
  def distance_to(other) = Math.hypot(x - other.x, y - other.y)
end

# Data (Ruby 3.2+, immutable)
Money = Data.define(:amount_cents, :currency) do
  def to_s = "%.2f %s" % [amount_cents / 100.0, currency]
end
```

| Form | Detail |
|---|---|
| `Struct.new(:a, :b)` | Mutable; `==` by value |
| `Data.define(:a, :b)` (Ruby 3.2+) | **Immutable** by design — perfect for value objects |
| Inherits common methods | `==`, `to_a`, `members`, `with(...)` for Data |

**Differences from Python / JavaScript:**

| Property | Ruby | Python | JavaScript |
|---|---|---|---|
| Default field access | Auto-generated `attr_*` | `__init__` + `self.x` | Constructor + `this.x` |
| Built-in property syntax | `attr_*` macros | `@property` decorator | `get` / `set` keywords |
| Visibility | Public default | "Underscore convention" | `#privateField` (modern) |
| Immutable shorthand | `Data.define` | `@dataclass(frozen=True)` | `Object.freeze` / TS `readonly` |

**`@var` vs `self.var` inside a method:**

```ruby
class Order
  attr_accessor :total

  def discount(amount)
    @total -= amount       # direct write to ivar
    self.total -= amount   # calls the setter (would also fire validations)
    total -= amount         # ⚠️ creates a LOCAL variable `total`, not the attribute
  end
end
```

| Form | Effect |
|---|---|
| `@total` | Direct ivar — bypasses any setter logic |
| `self.total` | Calls the **getter** |
| `self.total = x` | Calls the **setter** (required to invoke setter from inside) |
| Just `total = x` | Creates a **local variable** — common bug |

> **Inside an instance method, you must write `self.attr = ...`** for the setter to fire. `attr = ...` creates a local.

**Memoization vs accessors:**

```ruby
class User
  def name
    @name ||= compute_name      # memoized
  end
end
```

| Pattern | Use |
|---|---|
| `attr_reader :name` + ivar set in `initialize` | Simple |
| Manual memoized reader | When value is computed lazily |
| `attr_reader :name` + ivar set elsewhere | Simple read-only |

**Comparing access patterns:**

| Goal | Pick |
|---|---|
| Public R/W field | `attr_accessor` |
| Read-only field | `attr_reader` |
| Internal state, hidden from outside | No accessor; use `@var` |
| Validated setter | Define manually |
| Computed read-only | Define method (no `@`) |
| Immutable value object | `Data.define` (Ruby 3.2+) |
| Mutable value object | `Struct.new` |
| Sensitive credential | `attr_writer` only (or nothing — set via `initialize`) |

**Inheritance + `attr_*`:**

```ruby
class Base
  attr_reader :id
end

class Specific < Base
  # inherits #id; can override with custom logic if needed
  def id
    "S-#{@id}"
  end
end
```

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| `attr = value` instead of `self.attr = value` inside the class | Creates local variable; no setter fires |
| `attr_accessor` for sensitive fields (passwords, tokens) | Exposes a getter |
| `attr_accessor` everywhere for "convenience" | Encapsulation lost |
| `attr_reader` + later mutation needed | Have to add custom setter or `attr_writer` |
| Forgetting symbol syntax | `attr_reader name` (without `:`) is a NoMethodError |
| Re-declaring `attr_*` overrides previous | Subtle bug |
| `attr_accessor` on a frozen object | `FrozenError` on setter |
| Using `attr_*` instead of `Data.define` for value objects | Mutable when you didn't want it |

**Test-friendly initialization:**

```ruby
class Order
  attr_reader :customer, :items, :placed_at

  def initialize(customer:, items:, placed_at: Time.current)
    @customer   = customer
    @items      = items
    @placed_at  = placed_at
  end
end

# In tests
order = Order.new(customer: customer, items: items, placed_at: Time.zone.parse("2024-04-15 10:00"))
expect(order.customer).to eq(customer)
```

**Related conventions:**

| Convention | Detail |
|---|---|
| `?` suffix | Predicate (`admin?`, `paid?`) |
| `!` suffix | Mutating / dangerous (`save!`, `validate!`) |
| `=` suffix | Setter (auto-defined by `attr_writer`) |
| `<<` operator | Append (`array << x`) |
| Bang vs non-bang on collections | `sort!` mutates; `sort` returns new |

**Cross-references:**

- Class vs Module: [class_vs_module.md](class_vs_module.md)
- Pass-by-value + mutation: [pass_by_value_*.md](pass_by_value_references_mutation.md)
- Equality methods: [equality_*.md](equality_eq_eql_equal_methods.md)
- Memoization pitfalls: [memoization_pitfalls_*.md](../performance/memoization_pitfalls_falsey_values_instance_variable.md)

**Rule of thumb:** **`attr_reader` for read-only identity (IDs, timestamps, references), `attr_accessor` for simple value-only fields, `attr_writer` rarely (mostly when you want write-only secrets).** Reach for **`Data.define`** (Ruby 3.2+) for immutable value objects rather than `attr_accessor` everywhere. Inside the class, always write **`self.attr = value`** for setters — `attr = value` makes a local variable.
