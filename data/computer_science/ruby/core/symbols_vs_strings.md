### Ruby — Symbols vs Strings

**Definition:** **Symbols** (`:name`) are immutable, interned identifiers; **Strings** (`"name"`) are mutable text. Same characters, different objects in memory, different intent.

**Core comparison:**

| Property | **Symbol** (`:name`) | **String** (`"name"`) |
|---|---|---|
| Mutable? | **No** | Yes (unless frozen) |
| Identity | **Interned** — same symbol → same object | New object per literal (unless frozen) |
| Storage | One per unique value | Each literal allocates |
| Comparison | Pointer comparison (fast) | Byte-wise comparison |
| GC | GC'd in MRI 2.2+ | Always GC'd |
| Use as Hash key | Cheap, fast | Slower; usually frozen-string-literal helps |
| Methods | Limited (no `gsub`, `chomp`, etc.) | Full text-manipulation API |
| Memory | Shared, tiny | Per-instance |

**Identity demo:**

```ruby
:status.object_id == :status.object_id      # true
:status.equal?(:status)                      # true

"status".object_id == "status".object_id    # false (without frozen literals)

# With `# frozen_string_literal: true`:
"status".object_id == "status".object_id    # true (literals interned)
```

| Magic comment | Effect |
|---|---|
| `# frozen_string_literal: true` | All literals frozen + deduped |
| Default in many gems / Ruby 3+ patterns | Recommended |

**When to use which:**

| Use case | Pick |
|---|---|
| Hash keys (`{name: "Bob"}`) | **Symbol** |
| Method names / `send(:foo)` | **Symbol** |
| Enum-like constants | **Symbol** |
| Status / state values | **Symbol** |
| Config keys, dictionary lookups | **Symbol** |
| User-facing text | **String** |
| Database I/O | **String** |
| Anything that gets manipulated | **String** |
| Anything from an external source | **String** |
| Building up text dynamically | **String** |

**Concrete examples:**

```ruby
# Symbols — internal vocabulary
order.update(status: :paid)
events.subscribe(:order_placed)
options = { format: :json, encoding: :utf8 }

# Strings — data
user.name = "Alice"
log.write("Order #{order.id} placed")
file.read.split(",")
```

**Hash key conventions:**

```ruby
{ name: "Bob", age: 30 }            # Symbol keys (idiomatic Ruby)
{ "name" => "Bob", "age" => 30 }    # String keys (often from JSON / params)

params = { "user" => { "email" => "a@b" } }   # Strings — comes from HTTP
params.deep_symbolize_keys                       # Convert to symbols for app use
```

**Symbol → String → Symbol:**

| Conversion | Method | Use |
|---|---|---|
| Symbol → String | `:foo.to_s` → `"foo"` | When you need text manipulation |
| String → Symbol | `"foo".to_sym` | When converting external input |
| Safer string → symbol | `"foo".to_sym` only with **trusted input** | Untrusted strings can DoS |

**The DoS concern (pre-MRI 2.2):**

| Property | Detail |
|---|---|
| Pre-MRI 2.2 | Symbols were never garbage-collected |
| `params[:foo].to_sym` from user input | Could fill memory |
| MRI 2.2+ | Symbols GC'd |
| Still safer | Whitelist conversion: `["paid", "shipped"].include?(s) ? s.to_sym : nil` |

**ActiveSupport `HashWithIndifferentAccess`:**

```ruby
h = { "name" => "Bob" }.with_indifferent_access
h[:name]      # "Bob"
h["name"]     # "Bob"
```

| Use | Detail |
|---|---|
| Rails `params` | Auto wrapped in HWIA |
| Avoid the symbol/string dichotomy at API boundaries | Cost: small overhead |
| Inside core domain | Prefer plain hashes with one or the other |

**Performance summary:**

| Operation | Symbol | String |
|---|---|---|
| Equality check | O(1) pointer compare | O(n) byte compare |
| Hash key lookup | Faster | Slower |
| Memory for many copies | Single object | Per-copy (or interned if frozen) |
| Text manipulation (concat, slice) | N/A — convert first | Native |

**Common idioms:**

```ruby
# Method dispatch
[:upcase, :downcase].each { |m| puts "hi".send(m) }

# Enums in models (Rails)
class Order < ApplicationRecord
  enum status: { pending: 0, paid: 1, shipped: 2 }
end
order.status         # "paid" (string!)
order.paid?          # true
order.status.to_sym  # convert when needed

# Dispatch tables
HANDLERS = {
  payment_received: ->(e) { Payment.process(e) },
  refund_issued:    ->(e) { Refund.process(e) },
}
HANDLERS[event.type]&.call(event)
```

**Tricky cases:**

| Case | Behavior |
|---|---|
| `:foo == "foo"` | **false** |
| `:foo.to_s == "foo"` | true |
| `:foo.eql?("foo")` | false |
| Hash with mixed keys | Distinct: `{a: 1, "a" => 2}` has two entries |
| `obj.send(:foo)` vs `obj.send("foo")` | Both work; symbol is conventional |

**Decision matrix:**

| Need | Pick |
|---|---|
| Internal identifier / key | Symbol |
| User input / external data | String |
| Text manipulation | String |
| Method name / dispatch | Symbol |
| API response key | String (usually JSON-output stays string) |
| Test / dev-only enum | Symbol |
| Status persisted to DB | Stored as string; symbol in code via `enum` macro |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Comparing `:foo == "foo"` | Always false |
| Mixing symbol + string keys in same hash | Distinct keys, surprising lookups |
| `to_sym` on user input | DoS risk pre-2.2; still poor hygiene |
| Symbols where text manipulation is needed | Convert; or use string from start |
| Forgetting Rails `enum` returns string | `order.status` is `"paid"`, not `:paid` |
| `with_indifferent_access` everywhere | Hides bugs at the boundary |

**Cross-references:**

- Equality methods (`==` / `eql?` / `equal?`): [equality_*.md](equality_eq_eql_equal_methods.md)
- Frozen string literals: [frozen_string_literals_*.md](frozen_string_literals_why_make_strings_immutable_performance.md)
- Hash keys + memoization: [memoization_*.md](../performance/memoization_pitfalls_falsey_values_instance_variable.md)

**Rule of thumb:** **Symbols for the language of the code, strings for data flowing through it.** Hash keys, method names, enum values, config — symbols. Anything you'd manipulate, log, or send over the wire — strings. Convert at the **boundary** (input from params or JSON), not in the middle of business logic. Always set **`# frozen_string_literal: true`** at the top of files.
