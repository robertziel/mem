### Ruby — Class vs Module

**One-line distinction:** **classes** create objects and support inheritance; **modules** provide namespacing and shared behavior (mixins) but **cannot be instantiated**.

**Side-by-side:**

| Property | Class | Module |
|---|---|---|
| Instantiable? (`new`) | ✅ | ❌ |
| Inheritance? (single parent) | ✅ `class Child < Parent` | ❌ — but multiple includes |
| Mixin via `include` | ✅ (a class can include modules) | ✅ (a module can include modules) |
| Used for | Things you create instances of | Namespacing + shared behavior |
| `super` in methods | Resolves up the inheritance chain | Resolves through ancestors (the chain) |
| Constants inside | Yes | Yes |
| Instance state (`@var`) | Per-instance | Mixed-in to the including class's instances |

**Mixin example — module shared by classes:**

```ruby
module Taggable
  def tag
    "tagged: #{title}"
  end
end

class Post
  attr_accessor :title
  include Taggable
end

class Photo
  attr_accessor :title
  include Taggable
end

Post.new.tap { |p| p.title = "Hi" }.tag  # "tagged: Hi"
```

**`include` vs `extend` vs `prepend`:**

| Form | Effect | Where the methods land |
|---|---|---|
| `include Mod` | Adds module's methods as **instance methods** | After the class in the ancestor chain |
| `extend Mod` | Adds module's methods as **class methods** (or singleton methods on an instance) | Singleton class |
| `prepend Mod` | Same as `include` but **before** the class | Before the class in the ancestor chain |
| `Mod.module_function :name` | Method becomes both private instance + public module function | Both contexts |

**Method-lookup order (the ancestor chain):**

```ruby
class Post
  prepend ModP
  include  ModI
end

# Lookup: ModP -> Post -> ModI -> superclasses... -> Object -> Kernel -> BasicObject
Post.ancestors
# [ModP, Post, ModI, Object, Kernel, BasicObject]
```

> Use `ClassName.ancestors` to verify resolution order.

**Common module patterns:**

| Pattern | Use |
|---|---|
| **Pure mixin** (`include`) | Add behavior to multiple classes |
| **Class-level extension** (`extend`) | Add class methods (`Klass.foo`) |
| **`included` hook** | Run code when included; install both instance + class methods |
| **`extend self`** | Make all module methods callable as `Mod.method` |
| **Namespacing** | `module MyApp; class User; end; end` |
| **`Comparable` / `Enumerable`** | Shared interface mixins from stdlib |

**Class methods + instance methods via included hook (the classic):**

```ruby
module Authorizable
  def self.included(base)
    base.extend(ClassMethods)
  end

  def authorized?
    self.class.required_role <= role
  end

  module ClassMethods
    def required_role
      @required_role ||= :member
    end
    def requires_role(name)
      @required_role = name
    end
  end
end

class AdminPanel
  include Authorizable
  requires_role :admin
end
```

> **`ActiveSupport::Concern`** wraps this boilerplate.

**`ActiveSupport::Concern` — the modern shorthand:**

```ruby
module Taggable
  extend ActiveSupport::Concern

  included do
    has_many :tags        # runs in the class context
    scope :tagged, -> { where.not(tags: []) }
  end

  class_methods do
    def with_tag(name)
      joins(:tags).where(tags: { name: name })
    end
  end

  def tag_names
    tags.pluck(:name)
  end
end
```

**`Comparable` example — adopt comparison via `<=>`:**

```ruby
class Money
  include Comparable
  attr_reader :cents
  def initialize(cents); @cents = cents; end
  def <=>(other); cents <=> other.cents; end
end

Money.new(100) < Money.new(200)   # true
[Money.new(50), Money.new(20)].min  # Money(20)
```

| Method | What you implement | What you get |
|---|---|---|
| `Comparable` | `<=>` | `<`, `<=`, `==`, `>=`, `>`, `between?`, `clamp` |
| `Enumerable` | `each` | `map`, `select`, `reduce`, `sort`, `find`, `count`, lots more |

**Modules as namespaces:**

```ruby
module Billing
  class Invoice
    # ...
  end
  class Subscription
    # ...
  end
end

Billing::Invoice.new
```

| Win | Detail |
|---|---|
| Avoids name collisions | `Billing::Invoice` ≠ `Sales::Invoice` |
| Groups related code | Easy to require / load together |
| Common in gems | Top-level `module GemName` |

**Singleton class — every object has one:**

```ruby
str = "hi"
def str.shout
  upcase + "!"
end
str.shout       # "HI!"
"other".shout   # NoMethodError — only on this instance
```

| Concept | Detail |
|---|---|
| Singleton class | Special hidden class for one specific object |
| `obj.singleton_class` | Inspect it |
| Define class methods | They actually live in the class's singleton class |
| `extend Mod` | Adds methods to the receiver's singleton class |

**`module_function` — both private instance + public class method:**

```ruby
module MyMath
  module_function
  def square(x); x * x; end
end

MyMath.square(3)   # 9
class Foo
  include MyMath
  def f; square(2); end   # callable as private instance method too
end
```

**`extend self` — call module methods on the module itself:**

```ruby
module Logger
  extend self
  def info(msg); puts "[info] #{msg}"; end
end

Logger.info("hi")
```

**Inheritance tree facts:**

| Concept | Detail |
|---|---|
| Single inheritance | One parent class only |
| Multiple inclusion | Many modules can be included |
| Diamond problem? | No — modules ordered linearly in ancestor chain |
| `Object.superclass.superclass` | `BasicObject` — the root |
| Built-in: `Kernel` is included in `Object` | That's why `puts`, `raise`, etc., work everywhere |

**Performance:**

| Concern | Detail |
|---|---|
| Method lookup walks ancestors | Slight cost vs flat class |
| Modules cache method dispatch | Modern Ruby + YJIT optimize most cases |
| Deep mixin chains slow startup | Rare to be measurable |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| `include` to share state via instance variables | Mixin assumes the including class has the variables; coupling |
| Using class for what should be a module | Forces `.new` syntax for ergonomic helpers |
| Using module where class would clarify intent | `MyApp::Things` (module) vs `MyApp::Thing` (class) |
| `extend` instead of `include` (or vice versa) | Methods land on wrong scope |
| `prepend` to "just shadow a method" | Shows up in `ancestors` and surprises debuggers |
| `included` hook doing too much | Hard to follow |
| Re-declaring a module that already exists | Reopens; can collide with other code |
| Heavy use of `module_function` outside stdlib-style helpers | Confusing API |

**When to pick which:**

| Need | Pick |
|---|---|
| Make instances with identity / state | **Class** |
| Share methods across unrelated classes | **Module + include** |
| Add class-level helpers to many classes | **Module + extend (or `included` hook)** |
| Group related classes / constants | **Module as namespace** |
| Adopt `==`/`<`/`>` from `<=>` | **`include Comparable`** |
| Adopt `map`/`select`/etc. from `each` | **`include Enumerable`** |
| Wrap an existing method | **`prepend Module` + `super`** |
| Shared global helper (no state) | **Module + `extend self` / `module_function`** |

**Cross-references:**

- Open classes / monkey patching (the alternative way to add methods): [open_classes_*.md](../metaprogramming/open_classes_monkey_patching_dangers.md)
- Pass-by-value + mutation: [pass_by_value_*.md](pass_by_value_references_mutation.md)
- Blocks / Procs / Lambdas: [blocks_lambda_proc.md](blocks_lambda_proc.md)

**Rule of thumb:** **classes for things you create instances of, modules for shared behavior or namespacing.** When in doubt: if it has a `new`, it's a class; if it gets `include`d / `extend`ed / used as a `MyApp::*` namespace, it's a module. **`ActiveSupport::Concern`** is the idiomatic Rails way to write a mixin that adds both class + instance methods. Always check `ClassName.ancestors` when method dispatch surprises you.
