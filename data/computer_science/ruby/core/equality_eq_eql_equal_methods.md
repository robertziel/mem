### Ruby — `==` vs `eql?` vs `equal?` vs `===`

**Four equality methods, four different jobs:**

| Method | Compares | Override? | Example |
|---|---|---|---|
| **`==`** | Value equality | Yes — most classes override | `1 == 1.0` → true |
| **`eql?`** | Stricter value equality (often type-strict) | Yes — Hash uses it | `1.eql?(1.0)` → false |
| **`equal?`** | **Object identity** (same object in memory) | **Don't override** | Two distinct strings → false |
| **`===`** | Case-equality (used by `case/when`) | Yes — `Range`, `Class`, `Regexp` override | `Integer === 1` → true |

**Quick demo:**

```ruby
1 == 1.0         # true   — values equal
1.eql?(1.0)      # false  — types differ

a = "hi"
b = "hi"

a == b           # true   — same content
a.eql?(b)        # true   — same content + type
a.equal?(b)      # false  — different objects in memory

c = a
a.equal?(c)      # true   — same object
```

**Identity (`equal?`) — the strict one:**

| Property | Detail |
|---|---|
| Compares object IDs | `a.object_id == b.object_id` |
| Inherited from `BasicObject#equal?` | Don't override |
| Two literals with same value | Often **different** objects (depends on type) |
| Frozen strings | Same literal points to **same** object (since `# frozen_string_literal: true`) |
| `nil`, `true`, `false`, integers, symbols | **Always one** object (`5.equal?(5)` is true) |

**Value (`==`) — what classes typically override:**

```ruby
class Money
  def initialize(amount_cents); @amount_cents = amount_cents; end
  def amount_cents; @amount_cents; end

  def ==(other)
    return false unless other.is_a?(Money)
    amount_cents == other.amount_cents
  end
end

Money.new(100) == Money.new(100)   # true
Money.new(100) == 100              # false (type-checked)
```

**Stricter (`eql?`) — type-aware:**

| Class | `==` | `eql?` |
|---|---|---|
| `1 == 1.0` | true | false (Integer vs Float) |
| `:sym == :sym` | true | true |
| `"a" == "a"` | true | true |
| Custom class | Up to your `==` | Up to your `eql?` |

> When implementing custom equality for hash keys, override **`eql?` AND `hash`** together.

**`hash` + `eql?` contract — Hash key equality:**

```ruby
class Money
  def initialize(cents); @cents = cents; end

  def eql?(other)
    other.is_a?(Money) && @cents == other.instance_variable_get(:@cents)
  end

  def hash
    @cents.hash
  end
end

bag = { Money.new(100) => "$1.00" }
bag[Money.new(100)]   # "$1.00"  — works because eql? + hash agree
```

| Rule | Detail |
|---|---|
| If `a.eql?(b)` then `a.hash == b.hash` | Mandatory |
| `a == b` doesn't require same hash | Only `eql?` does |
| Override both or neither | Otherwise Hash lookups fail mysteriously |

**Case equality (`===`) — pattern matching for `case/when`:**

```ruby
case value
when Integer       # uses Integer === value (is_a? check)
  "number"
when /\d+/         # uses Regexp === value (matches?)
  "digit string"
when 1..10         # uses Range === value (cover?)
  "small"
when "hi"          # falls back to == (string equality)
  "greeting"
end
```

| Class | `===` overridden to | Effect in `case/when` |
|---|---|---|
| `Class` / `Module` | `obj.is_a?(klass)` | Type matching |
| `Range` | `range.cover?(obj)` | Range membership |
| `Regexp` | `regex.match?(str)` | Pattern match |
| `Proc` (Ruby 2.6+) | Calls the proc | Custom matchers |
| `Set` | Membership | `Set === element` |
| Default | `==` | Plain equality |

**Pattern-matching `case/in` (Ruby 3.0+) — separate beast:**

```ruby
case order
in { status: "paid", total_cents: 100..} then ship!
in { status: "cancelled" } then refund!
end
```

> `case/in` uses **deconstruction patterns**, not `===`. Different mechanism.

**`equal?` — when does it actually matter?**

| Use | Detail |
|---|---|
| Detecting "same exact instance" | Singletons, identity-mapped caches |
| Avoiding infinite loops in `==` | When recursing into structures, check `equal?` first |
| Frozen-string optimizations | Compare interned strings cheaply |
| Almost never in normal app code | Reach for `==` 99% of the time |

**`==` and inheritance — common gotcha:**

```ruby
class Foo
  def ==(other)
    other.is_a?(Foo) && id == other.id
  end
end

class Bar < Foo; end

foo = Foo.new
bar = Bar.new   # same id

foo == bar   # true (Bar is_a? Foo)
bar == foo   # depends on Bar's == — if not overridden, also true
```

> Make `==` symmetric or override consistently in subclasses.

**`<=>` — combined comparison (the spaceship):**

```ruby
class Money
  include Comparable

  def <=>(other)
    return nil unless other.is_a?(Money)
    @cents <=> other.instance_variable_get(:@cents)
  end
end

# Now you get all Comparable methods for free:
Money.new(100) < Money.new(200)   # true
[Money.new(50), Money.new(20)].min  # Money(20)
```

| Returns | Meaning |
|---|---|
| `-1` | `self < other` |
| `0` | Equal |
| `1` | `self > other` |
| `nil` | Incomparable types |

**Truthiness and `==`:**

| Comparison | Result |
|---|---|
| `nil == nil` | true |
| `nil == false` | false (Ruby distinguishes them) |
| `0 == nil` | false |
| `"" == nil` | false |
| `"" == false` | false |
| `0 == false` | false |
| `0 == 0.0` | true (Integer vs Float — `==` does type-coerce) |
| `0.eql?(0.0)` | false (`eql?` doesn't) |

**Symbol vs String — common interview question:**

| Comparison | Result |
|---|---|
| `:hello == "hello"` | false |
| `:hello.eql?("hello")` | false |
| `:hello.to_s == "hello"` | true |
| Hash with symbol vs string keys | Distinct keys |

**Comparing arrays / hashes:**

```ruby
[1, 2, 3] == [1, 2, 3]                    # true
{a: 1, b: 2} == {a: 1, b: 2}              # true
{a: 1, b: 2} == {b: 2, a: 1}              # true (order doesn't matter for ==)
```

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Overriding `==` without `hash` and `eql?` | Hash keys break |
| Overriding `equal?` | Breaks identity semantics; never do this |
| Comparing across types without checking | `Money.new(100) == 100` accidentally true if you forgot `is_a?` |
| Using `==` as `===` (or vice versa) | `===` has class-specific behavior |
| Not making `==` symmetric | `a == b` ≠ `b == a` — surprising |
| Forgetting `<=>` returns `nil` for incomparable types | Causes `ArgumentError` from Comparable methods |
| Mutating an object used as a Hash key | Hash can't find it any more |

**`==` vs `is_a?` vs `instance_of?`:**

| Method | Means |
|---|---|
| `obj.is_a?(Class)` | Object is **of this class or a subclass / module** |
| `obj.kind_of?(Class)` | Alias for `is_a?` |
| `obj.instance_of?(Class)` | Object is **exactly this class** (not a subclass) |
| `Class === obj` | Same as `is_a?` (used by `case/when`) |

**When to override which:**

| Need | Override |
|---|---|
| Custom value equality | `==` |
| Use as Hash key | `==` + `eql?` + `hash` |
| Sortable / Comparable | `<=>` + `include Comparable` |
| Custom case/when matching | `===` |
| Identity comparison | **Never** override `equal?` |

**Cross-references:**

- Hash keys + memoization: [memoization_pitfalls_*.md](../performance/memoization_pitfalls_falsey_values_instance_variable.md)
- Pass-by-value + mutation: [pass_by_value_*.md](pass_by_value_references_mutation.md)
- Comparable / Enumerable: [class_vs_module.md](class_vs_module.md)

**Rule of thumb:** **`==` for normal equality** (override per class), **`eql?` when Hash semantics matter** (override with `hash`), **`equal?` only when you truly care about object identity** (and never override it). For sortable types, **include `Comparable` and define `<=>`**. For pattern-style matching, **`===`** is what `case/when` uses — overridden by `Class`, `Range`, `Regexp` to do type / containment / regex tests.
