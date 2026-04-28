### Ruby — Method Lookup Path

**Definition:** when Ruby resolves `obj.foo`, it walks an **ancestor chain** in a fixed order. Understanding the order tells you why a method call dispatches the way it does — and where to intervene.

**The lookup order (high to low priority):**

| Step | Where Ruby looks | Mechanism |
|---|---|---|
| 1 | **Singleton class** of the object (eigenclass) | `def obj.foo` lives here |
| 2 | **Prepended modules** of obj's class | `prepend ModX` puts ModX **before** the class |
| 3 | obj's **class** itself | `def foo` in `Foo` class |
| 4 | **Included modules** of the class (last include first) | `include ModA, ModB` → ModB before ModA |
| 5 | **Superclass**, repeating steps 2–4 | Walks up |
| ... | Up the chain to `Object` → `Kernel` → `BasicObject` | The root |
| ⚠ | If not found → `method_missing` | Last resort hook |

**See it with `ancestors`:**

```ruby
module Loggable; end
module Cacheable; end
module Auditable; end

class User
  prepend Cacheable
  include Loggable
  include Auditable
end

User.ancestors
# => [Cacheable, User, Auditable, Loggable, Object, Kernel, BasicObject]
```

**`include` vs `prepend` vs `extend`:**

| Macro | Inserts the module | Affects |
|---|---|---|
| **`include ModX`** | **Below** the class in ancestors | Instance methods |
| **`prepend ModX`** | **Above** the class in ancestors | Instance methods (overrides class methods) |
| **`extend ModX`** | Into the **singleton class** | Class methods (or single object) |

**Side-by-side:**

```ruby
module M
  def hello = "M says hi"
end

class C
  include M     # M ends up BELOW C
  def hello = "C says hi"
end

C.new.hello   # "C says hi" — class wins over included

class D
  prepend M     # M ends up ABOVE D
  def hello = "D says hi"
end

D.new.hello   # "M says hi" — prepended wins
```

**Why prepend exists — the "around" hook pattern:**

```ruby
module Memoize
  def expensive_calc
    @expensive_calc ||= super       # super calls the original
  end
end

class Calculator
  prepend Memoize
  def expensive_calc
    sleep 1; 42
  end
end

Calculator.new.expensive_calc   # 1s
Calculator.new.expensive_calc   # cached
```

| Property | Detail |
|---|---|
| Module method runs **before** the class method | Wraps it |
| `super` calls the wrapped one | Pass-through |
| Cleaner than `alias_method_chain` | Modern idiom |

**Singleton class — the per-object class:**

```ruby
str = "hello"
def str.shout = upcase + "!"

str.shout              # "HELLO!"
"world".shout          # NoMethodError — only str has it

str.singleton_class.ancestors
# => [#<Class:#<String:0x...>>, String, Comparable, Object, ...]
```

| Property | Detail |
|---|---|
| Every object has one | Lazily created |
| Holds singleton methods | Methods defined on a single instance |
| Top of the lookup chain | Beats class methods |
| `class << obj; ... end` | Old syntax to open it |

**Class methods are singleton methods on the class:**

```ruby
class Foo
  def self.bar; end       # Defined in Foo's singleton class
end

# Equivalent:
class Foo
  class << self
    def bar; end
  end
end

Foo.singleton_class.instance_methods(false)  # [:bar]
```

> "Class methods" are just instance methods on the class's singleton class.

**Resolution example walked through:**

```ruby
module Greet
  def hi = "module hi"
end

class Animal
  include Greet
  def hi = "animal hi"
end

class Dog < Animal
  def hi = "dog hi"
end

rex = Dog.new
def rex.hi = "rex hi"

rex.hi    # "rex hi"
```

| Step | Looked at | Found? |
|---|---|---|
| 1 | `rex`'s singleton class | ✅ `def rex.hi` |
| (stops) | | |

Remove `def rex.hi`:

| Step | Looked at | Found? |
|---|---|---|
| 1 | `rex`'s singleton class | no |
| 2 | (no prepends in Dog) | |
| 3 | `Dog` | ✅ `def hi` |

Remove `def hi` from Dog:

| Step | Looked at | Found? |
|---|---|---|
| 1–3 | not found | |
| 4 | `Animal` (superclass) | ✅ `def hi` (class beats included module) |

**Multiple includes — last-included-first:**

```ruby
module A; def x; "A"; end; end
module B; def x; "B"; end; end

class C
  include A
  include B    # included AFTER A
end

C.new.x      # "B"

C.ancestors  # [C, B, A, Object, ...]
```

> Newer `include` lines win. They're prepended into the include list.

**Refinements — locally-scoped patches:**

```ruby
module StringExt
  refine String do
    def shout = upcase + "!"
  end
end

class Greeter
  using StringExt   # active only inside this scope

  def call = "hi".shout
end

Greeter.new.call   # "HI!"
"hi".shout         # NoMethodError outside the using scope
```

| Property | Detail |
|---|---|
| `refine` defines patches inside a module | Doesn't pollute globally |
| `using` activates them lexically | Per file / per class |
| Lookup considers refinements first in scoped code | Even before singleton class |
| Use case | Replacing monkey-patches with safer scoping |

**`method_missing` — the final fallback:**

```ruby
class Proxy
  def method_missing(name, *args, **kwargs, &block)
    if name.to_s.start_with?("find_by_")
      "implementing #{name}(#{args})"
    else
      super
    end
  end

  def respond_to_missing?(name, include_private = false)
    name.to_s.start_with?("find_by_") || super
  end
end
```

| Hook | Purpose |
|---|---|
| `method_missing` | Catch undefined calls |
| `respond_to_missing?` | Pair it — `respond_to?` will return true |
| Always `super` | Don't swallow real `NoMethodError` |
| Cost | Slow path; cache via `define_method` for hot calls |

**Inspecting the lookup at runtime:**

| Method | Use |
|---|---|
| `obj.class.ancestors` | Full inheritance + module chain |
| `obj.method(:foo).owner` | Where `foo` is defined |
| `obj.method(:foo).source_location` | File:line |
| `obj.singleton_class.ancestors` | Including singleton |
| `obj.respond_to?(:foo)` | Will dispatch find one? |
| `obj.public_methods(false)` | Methods on this class (not inherited) |
| `Module#instance_method(:foo)` | Get UnboundMethod |
| `binding.irb` / `binding.pry` | Live exploration |

**Decision matrix — how to override behavior:**

| Need | Use |
|---|---|
| Add behavior to one object | Singleton method (`def obj.foo`) |
| Add to all instances of a class | Define in the class |
| Mix shared instance methods | `include Module` |
| Wrap with before/after | `prepend Module` + `super` |
| Mix shared class methods | `extend Module` (on class) or `ClassMethods` pattern |
| Patch a third-party class scoped | **Refinement** |
| Patch globally (last resort) | Monkey-patch (reopen the class) |
| Catch arbitrary unknowns | `method_missing` + `respond_to_missing?` |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| `include` vs `prepend` confusion | Wrong override point |
| Defining `method_missing` without `respond_to_missing?` | `respond_to?` lies |
| Not calling `super` in `method_missing` | Real bugs swallowed |
| Forgetting `extend` for class methods | Methods land on instances instead |
| Using `class << self` heavily | Hard to read; prefer `self.method` |
| Singleton method on a frozen object | `FrozenError` |
| Refinements scoped to wrong file | "It works in irb but not in the app" |
| Monkey-patching ActiveSupport / core | Coupling brittle to upgrades |

**Cross-references:**

- Class vs Module: [class_vs_module.md](../core/class_vs_module.md)
- Equality methods: [equality_*.md](../core/equality_eq_eql_equal_methods.md)
- Monkey patching: [monkey_patching_*.md](monkey_patching_refinements_module_prepend.md)

**Rule of thumb:** **Lookup walks: singleton → prepends → class → includes (last first) → superclass (repeat) → `BasicObject` → `method_missing`.** When a method call surprises you, run `obj.method(:foo).source_location` and `obj.class.ancestors` first. Use **`prepend`** to wrap (with `super`), **`include`** to share, **`extend`** for class methods, **refinements** to scope patches, and **`method_missing`** sparingly with `respond_to_missing?`.
