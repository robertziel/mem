### Ruby — Pass-by-Value with References, Mutation

**One-line definition:** Ruby is **pass-by-value, but the value is a reference to an object**. Methods get a copy of the reference. They can **mutate the object** the reference points to, but **reassigning the local parameter does not change the caller's variable**.

**Demonstration:**

```ruby
def mutate(arr)
  arr << 3        # mutates the same object
end

def reassign(arr)
  arr = [9, 9, 9]  # reassigns the local parameter only
end

nums = [1, 2]
mutate(nums)     # nums is now [1, 2, 3]   — same array mutated
reassign(nums)   # nums is still [1, 2, 3] — caller's variable untouched
```

**Conceptual model:**

```
Caller:  nums  ──►  [1, 2]
Method:  arr   ──►  [1, 2]    (copy of the reference; same target)

mutate:   arr << 3    →  both refs see [1, 2, 3]
reassign: arr = [9..]  →  arr ──► [9,9,9],  nums still ──► [1,2,3]
```

**The two distinct operations:**

| Operation | Affects caller? | Why |
|---|---|---|
| **Mutate** the object (`arr << x`, `arr.push(x)`, `arr[0] = y`) | ✅ Yes | Same object, both references |
| **Reassign** the parameter (`arr = something_else`) | ❌ No | Only changes the local binding |

**Comparison with other languages:**

| Language | Model |
|---|---|
| Ruby | Pass-by-value-of-reference (objects); pass-by-value (immutable types) |
| Python | Same model |
| JavaScript | Same model |
| Java | Same model (primitives by value, objects by reference value) |
| C | True pass-by-value (need pointers for indirection) |
| C++ | Both (`&` references vs values) |
| Go | Pass-by-value (use pointers for shared mutation) |
| Rust | Move + borrow semantics; explicit |

> **Ruby's model is the same as Python and JavaScript** — most modern OO languages converge here.

**Immutable types vs mutable types:**

| Type | Notes |
|---|---|
| Strings | **Mutable by default** (unlike Python/JS!) — `s << "x"` modifies in place |
| Frozen strings | Immutable — modern Ruby uses frozen-by-default in many contexts |
| Integers, floats, booleans, `nil`, `true`, `false`, symbols | Effectively immutable; can't be mutated |
| Arrays, Hashes | Mutable |
| Custom objects | Mutable unless you `freeze` them |

```ruby
def shout(s)
  s.upcase!     # mutates in place — caller sees the change
end

def shout_safe(s)
  s.upcase      # returns a new string; caller's string unchanged
end
```

> **Bang methods (`!`) usually mutate.** Non-bang versions return a new object.

**`freeze` — make an object immutable:**

```ruby
nums = [1, 2, 3].freeze
nums << 4   # FrozenError
nums.frozen?  # true
```

| Use | Detail |
|---|---|
| Constants | Always freeze (often deeply): `CONFIG = { ... }.freeze` |
| Value objects | Freeze in `initialize` |
| `# frozen_string_literal: true` magic comment | Modern Ruby — strings literal-frozen |

**Deep-copy gotcha — `freeze` only freezes the top:**

```ruby
config = { roles: ["admin", "user"] }.freeze
config[:roles] << "evil"   # works! the array isn't frozen
```

> Use `Marshal.dump`/`load`, `dup` recursively, or libraries (e.g., `deep_freeze`) for deep immutability.

**`dup` vs `clone`:**

| Method | Detail |
|---|---|
| `dup` | Shallow copy; **doesn't copy frozen state** or singleton methods |
| `clone` | Shallow copy; **copies frozen state** + singleton methods |
| `deep_dup` (Rails) | Recursive copy of nested structures |
| `Marshal.load(Marshal.dump(obj))` | Deep copy via serialization (slow but works) |

**When mutation bites:**

```ruby
def process(items)
  items.sort!         # ⚠️ mutates caller's array
  items.first
end

original = [3, 1, 2]
process(original)
original  # => [1, 2, 3]  — surprise!
```

**Defensive patterns to avoid surprise mutation:**

| Pattern | Detail |
|---|---|
| Use non-bang methods | `sort` returns a new array |
| `.dup` at the boundary | Make a copy before mutating |
| `.freeze` what shouldn't change | Get an error early |
| Functional style — return new objects | Avoid mutation entirely |
| Value objects | Always immutable by design |
| `Data.define(...)` (Ruby 3.2+) | Lightweight immutable value objects |

**Method-name conventions for predictability:**

| Convention | Behavior |
|---|---|
| `foo` (no bang) | Returns new value or has no side-effect |
| `foo!` (bang) | Mutates / raises / has dangerous semantics |
| `foo?` (predicate) | Returns boolean |
| `foo=` (setter) | Mutates instance |
| `<<` (shovel) | Always mutates LHS |

**Hash gotcha — same applies:**

```ruby
def add_key(h)
  h[:foo] = 1
end

config = {}
add_key(config)
config  # => { foo: 1 }   — mutated
```

**String gotcha (Ruby strings are mutable by default):**

```ruby
def append_x(s)
  s << "x"
end

name = "alice"
append_x(name)
name  # => "alicex"
```

> Use `# frozen_string_literal: true` at the top of files (default in modern Ruby) to make string literals immutable.

**Sharing references across threads — the GVL doesn't save you:**

| Concern | Detail |
|---|---|
| MRI's GVL = one Ruby thread at a time | Doesn't prevent **logical** races |
| Multiple threads mutating same object | Inconsistent state |
| Use `Mutex` or queue-based handoff | Only safe pattern |
| Frozen objects across threads | Always safe |
| `Ractor`-shareable objects | New in Ruby 3+ |

**Ractors and immutability:**

| Concept | Detail |
|---|---|
| Ractors require shareable objects | Frozen, primitives, and `shareable_constant_value` |
| `Ractor.make_shareable(obj)` | Recursive deep freeze |
| Move semantics | `Ractor.send(obj, move: true)` transfers ownership |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Surprise mutation across method boundaries | Caller's data quietly changes |
| Treating bang methods as "for performance" | They have semantic meaning — mutation |
| Default arguments (`def f(x = [])`) | Default array is **shared across calls**; freeze it or build in body |
| Storing class-level mutable state | Threads / requests step on each other |
| Comparing strings with `==` after mutation | Confusion if one was frozen mid-flow |
| Forgetting `freeze` is shallow | Inner arrays / hashes still mutable |

**Default-argument trap:**

```ruby
class Repo
  def initialize(items = [])
    @items = items   # the SAME default [] across instances if shared above
  end
end
```

> The default value is reevaluated **each call**, so this specific case is fine. But assigning the default at **class scope** is the trap:

```ruby
DEFAULT = []   # mutable shared default
class Repo
  def initialize(items = DEFAULT); @items = items; end
end
```

Mutating one instance's `@items` mutates `DEFAULT` and every other instance. **Freeze constants** to prevent this.

**Quick safety patterns:**

| Pattern | Code |
|---|---|
| Freeze a constant | `THINGS = [1, 2, 3].freeze` |
| Frozen string default | `def f(s = "hello".freeze)` |
| Defensive copy on input | `arr = arr.dup; arr.sort!` |
| Return new instead of mutate | `def upper(s); s.upcase; end` (no bang) |
| Value object | `Money = Data.define(:amount_cents, :currency)` (Ruby 3.2+) |

**Cross-references:**

- GVL / threads: [gil_gvl_global_vm_lock.md](../concurrency/gil_gvl_global_vm_lock.md)
- Blocks / Procs / Lambdas: [blocks_lambda_proc.md](blocks_lambda_proc.md)

**Rule of thumb:** **Ruby passes references by value.** Methods can **mutate** the underlying object (caller sees the change) but **cannot rebind** the caller's variable. **Bang methods (`!`) and `<<` mutate**; default operators usually return new objects. **Freeze constants** (and prefer immutable value objects when possible). When in doubt, **`.dup` defensively** before mutating an argument.
