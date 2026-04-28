### Ruby — Blocks vs Procs vs Lambdas

**The three callables — what each is:**

| Form | Is an object? | Created by | Used as |
|---|---|---|---|
| **Block** | No (syntactic) | `do … end` / `{ … }` attached to a call | One-shot argument to a method via `yield` / `&blk` |
| **Proc** | Yes (`Proc` instance) | `Proc.new { … }` / `proc { … }` | Reusable, passed around, lenient |
| **Lambda** | Yes (`Proc` instance with `lambda?` true) | `lambda { … }` / `->(args) { … }` | Reusable, passed around, **method-like strictness** |
| **Method object** | Yes (`Method` / `UnboundMethod`) | `obj.method(:name)` | Bind methods as callables |

> Procs and lambdas are both `Proc` instances; the difference is the `lambda?` flag, which controls argument-strictness and `return` semantics.

**The two real differences (memorize):**

| Behavior | **lambda** | **proc** |
|---|---|---|
| **Argument arity** | Strict — `ArgumentError` on wrong count | Lenient — extras dropped, missing → `nil` |
| **`return`** | Returns from the lambda itself | Returns from the **enclosing method** (can `LocalJumpError` if there isn't one) |
| `next` / `break` | Returns from current iteration | Same |
| `lambda?` | `true` | `false` |

**Argument strictness:**

```ruby
l = ->(a, b) { a + b }
l.call(1)         # ArgumentError: wrong number of arguments

p = Proc.new { |a, b| [a, b] }
p.call(1)         # [1, nil]    — missing args become nil
p.call(1, 2, 3)   # [1, 2]      — extras dropped
```

**`return` behavior — the trap:**

```ruby
def test_lambda
  -> { return 1 }.call    # returns 1 from the lambda only
  2                        # method continues
end
test_lambda  # => 2

def test_proc
  Proc.new { return 1 }.call   # returns 1 from test_proc itself
  2                             # never reached
end
test_proc    # => 1
```

> **`return` inside a proc returns from the method that lexically defined it.** This is the source of subtle bugs — use lambdas when in doubt.

**Block — the syntactic form:**

```ruby
def greet
  yield "hi"            # invoke the block
end
greet { |msg| puts msg }
greet do |msg| puts msg end
```

| Concern | Detail |
|---|---|
| Not an object | Can't be stored in a variable |
| Implicit | Every method can receive one; pass via `do…end` or `{…}` |
| `yield` invokes it | No explicit reference |
| `block_given?` | Test if a block was passed |
| `&blk` parameter | Capture the block into a `Proc` named `blk` |
| Conventional style | `{…}` for one-liners, `do…end` for multi-line |

**Capturing & passing — the `&` operator:**

| Form | What it does |
|---|---|
| `def m(&blk)` | Captures incoming block into `blk` (now a Proc) |
| `m(&p)` | Coerces `p` (Proc/Lambda/Method/symbol) into a block at the call site |
| `m(&:upcase)` | `Symbol#to_proc` shortcut: equivalent to `{ |x| x.upcase }` |
| `m(&method(:foo))` | Pass a method as a block |

**`Symbol#to_proc` — the most-used Ruby idiom:**

```ruby
%w[a b c].map(&:upcase)      # ["A", "B", "C"]
[1, 2, 3].select(&:odd?)     # [1, 3]
users.sort_by(&:created_at)
```

> Equivalent to `map { |x| x.upcase }`. Works because `Symbol#to_proc` returns a Proc that calls the method on its argument.

**Yielding vs taking a block parameter:**

```ruby
# A) Implicit — yield
def each_item
  yield 1
  yield 2
end

# B) Explicit — &block
def each_item(&block)
  block.call(1)
  block.call(2)
end

# C) Pass through to another method
def each_item(&block)
  internal_iter(&block)   # forward the block
end
```

| Form | Use |
|---|---|
| `yield` | Cheapest, most idiomatic |
| `&block` parameter | When you need to pass it on, store it, or call it conditionally |
| `block_given?` | Branch on presence |

**`Method` objects — bound methods as callables:**

```ruby
class Greeter
  def greet(name) = "Hi, #{name}"
end

g = Greeter.new
m = g.method(:greet)
m.call("Alice")       # "Hi, Alice"
m.to_proc             # Proc wrapping the method
```

| Type | Created by | Bound? |
|---|---|---|
| `Method` | `obj.method(:name)` | To `obj` |
| `UnboundMethod` | `Klass.instance_method(:name)` | Not bound — `bind(obj)` later |
| `Method#curry` | Curries a method | Partial application |

**Currying (lambdas + procs both support it):**

```ruby
add = ->(a, b, c) { a + b + c }
add_5 = add.curry[5]            # partially applied
add_5_6 = add_5[6]
add_5_6[7]                       # 18
```

**Arity comparison:**

| Definition | Arity |
|---|---|
| `->(a, b) { … }` | `2` |
| `->(a, *b) { … }` | `-2` (at least 1, but variadic) |
| `Proc.new { |a, b| … }` | `2` (still 2, but proc doesn't enforce) |
| `proc { … }` (no params) | `0` |
| `proc { |*a| … }` | `-1` |

**Closures — variables captured by reference:**

```ruby
counter = 0
incr = -> { counter += 1 }
incr.call    # 1
incr.call    # 2
counter      # 2  — same variable
```

| Captured | Detail |
|---|---|
| Local variables | By reference (mutations visible) |
| `self` | The `self` at definition site |
| Constants | Looked up lexically |
| `instance_variable` | Through `self`, so dynamic |

**`instance_eval` / `instance_exec` — change `self` inside a block:**

```ruby
class Builder
  def configure(&block)
    instance_exec(&block)
  end
  def name(n); @name = n; end
end

b = Builder.new
b.configure { name "Alice" }   # `name` resolves on `b`
```

> Used in DSLs (RSpec, Sinatra, Rails routes). Powerful but can hide which `self` is in play.

**Hash-args + block — Ruby's idiomatic shape:**

```ruby
def each_record(table:, batch_size: 1000, &block)
  table.find_each(batch_size:, &block)
end

each_record(table: User) { |u| puts u.email }
```

**`begin/rescue` inside callables:**

| Form | Behavior |
|---|---|
| `rescue` inline (`x rescue nil`) | Catches `StandardError`; legacy style |
| `begin … rescue … end` inside a block | Works as expected |
| `rescue` at method body level | Don't put inside a block; clarity loss |

**Performance notes:**

| Form | Speed |
|---|---|
| `yield` (implicit block) | Fastest — no allocation |
| `&block` then `block.call` | Slower — allocates a Proc |
| Method object call | Slower than yield |
| Symbol#to_proc | Allocates a Proc; cache via `&:method` |
| Lambda invocation | Slightly slower than block (extra arity check) |

> If a method is called in a hot loop, prefer `yield` over `&block`-capturing, and avoid creating procs in inner loops.

**Common idioms / patterns:**

| Pattern | Code |
|---|---|
| Passing a method as block | `array.map(&method(:transform))` |
| Storing a callback | `@callbacks << proc { … }` |
| DSL with `instance_eval` | `block.call(self)` if you don't want self-rebinding |
| Optional callback | `cb && cb.call(...)` or `cb&.call(...)` |
| Higher-order | Methods that take a callable arg + a block fallback |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| `return` inside a `Proc.new { … }` saved for later | `LocalJumpError` if outer method already returned |
| Capturing a mutable local in a long-lived proc | Memory + concurrency surprises |
| Using a proc where strict arity is desired | Silent missing-arg bugs |
| Confusing `Proc.new` with `proc` | They're equivalent; `Proc.new` without a block raises in Ruby 3+ |
| Forgetting `&` when forwarding a block | Block silently dropped |
| `&:method` on objects of unexpected class | Crashes when method missing — guard or normalize |
| Lambdas with default args + extras | Strict arity still applies |
| `next` vs `return` confusion in blocks | `next` returns to the iterator, not the method |
| Storing `self` in a long-lived proc | Holds object; can't be GC'd |

**Decision matrix — pick the right form:**

| Scenario | Use |
|---|---|
| Method takes a one-shot operation | **Block** + `yield` |
| Need to store / pass / reuse a callable | **Proc** or **Lambda** |
| Method-like semantics (strict args, predictable `return`) | **Lambda** |
| Block-like semantics (flexible, `return` exits enclosing method) | **Proc** |
| Pass an existing method as a block | `&method(:name)` |
| Concise per-element transform | `&:method_name` |
| DSL inside a block (changing `self`) | `instance_eval` / `instance_exec` |

**Rule of thumb:** **block when the method naturally yields work**, **lambda for method-like callables (strict args, sane `return`)**, **proc only when you specifically want lenient args or `return` to exit the enclosing method**. **`&` bridges blocks and Proc-objects** — use `&method(:x)` and `&:symbol` to keep code concise. When in doubt: **lambda > proc** because strict behavior surfaces bugs early.
