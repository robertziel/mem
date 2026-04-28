### Ruby Open Classes & Monkey Patching

**Definition:** Ruby lets you **reopen any class** at any time and add / replace methods. Patching standard-library or third-party classes is called **monkey patching** (informal but ubiquitous term).

**The mechanic:**

```ruby
class String
  def palindrome?
    self == reverse
  end
end

"racecar".palindrome?  # true — String now has this method everywhere
```

| Property | Detail |
|---|---|
| Applies globally | Every `String` everywhere now has `palindrome?` |
| Effective immediately | After `require`, the patch is live |
| Persists for the lifetime of the process | No way to "scope" without refinements |
| Works on **any** class | Including core (`String`, `Array`, `Integer`, …) and third-party |

**Why the temptation exists:**

| Want | Easy via monkey patch |
|---|---|
| Add convenience methods to `String` | `"hello".palindrome?` |
| Fix a bug in a vendored gem | Patch the offending method directly |
| Add domain-specific helpers | `Array#sum_money`, `Integer#minutes` |
| Prototype quickly | Don't touch the original code |

**ActiveSupport — monkey patching done in a battle-tested way:**

```ruby
2.days.ago             # Integer + ActiveSupport
"hello".blank?         # String#blank?
1.megabyte             # Integer#megabyte
[].present?            # Object#present?
nil.try(:foo)          # NilClass#try
```

| Reasons it works for ActiveSupport | |
|---|
| Massive user base | Edge cases caught early |
| Stable, well-tested | Same patches for years |
| Documented + searchable | "Where is `blank?` defined?" → ActiveSupport |
| Loaded as a single library | Predictable point of override |

**Why monkey patching is risky:**

| Risk | Detail |
|---|---|
| **Name collisions** | Two gems patch `String#truncate` differently; whichever loads last wins silently |
| **Breaks gems / stdlib** | Patch changes `Hash#merge` semantics; library that depends on the original breaks |
| **Hard to debug** | "Where did this method come from?" — `Method#source_location` and `Method#owner` to the rescue, but still |
| **Implicit dependency** | Code mysteriously depends on a patch loaded somewhere else |
| **Versioning surprise** | Gem upgrade changes underlying class; patch silently does the wrong thing |
| **Concurrency** | Class state shared across all threads / Ractors |
| **Performance** | Overriding a method de-optimizes JIT inlining (YJIT) |

**Real-world failure pattern:**

```
Team A  →  patches  String#humanize  to do X
Team B  →  patches  String#humanize  to do Y
                    ↓
            whichever loads later wins
            other team's tests break in CI
            production behaves weirdly
```

**Refinements — scoped monkey patching (the safer alternative):**

```ruby
module StringPalindrome
  refine String do
    def palindrome?
      self == reverse
    end
  end
end

class Game
  using StringPalindrome
  "racecar".palindrome?   # works HERE
end

class Other
  "racecar".palindrome?   # NoMethodError — not in this scope
end
```

| Property | Detail |
|---|---|
| Scoped to the file (or class with `using`) | Doesn't pollute globally |
| Caller opt-in | `using` activates them |
| Slower than direct method dispatch | Refinement lookup is more expensive |
| Limited adoption | Less common than monkey patches |
| Still affects threading / process | Same lifetime as a class |

**Module-based extension (the safest add-method-to-class pattern):**

```ruby
module Palindromic
  def palindrome?
    self == reverse
  end
end

class MyString < String
  include Palindromic
end
```

| Win | Detail |
|---|---|
| New class, no patch to existing | Zero risk to other code |
| Composable | Mix into multiple classes |
| Easy to test | Standard inheritance / include |
| Loses ergonomics | Have to use `MyString.new("...")` |

**Decorator / wrapper — explicit:**

```ruby
class StringInspector
  def initialize(s)
    @s = s
  end

  def palindrome?
    @s == @s.reverse
  end
end

StringInspector.new("racecar").palindrome?
```

| Win | Detail |
|---|---|
| Zero patching | No global effect |
| Explicit | Reader knows where the method lives |
| Verbose | More ceremony |

**Method visibility — open-class lets you change it:**

```ruby
class String
  private :upcase  # ⚠️ now String#upcase is private — global breakage
end
```

> Don't change visibility on classes you don't own — extreme breakage potential.

**Common types of monkey patches and their risk:**

| Type | Risk | Example |
|---|---|---|
| Add new method (`palindrome?`) | Low — collisions only with other patches | Common in apps |
| Override existing method | High — caller may rely on old behavior | Hot zone |
| Change visibility | Very high | Avoid |
| Override allocation / initialize | Catastrophic | Avoid |
| Patch a Class method (`String.foo`) | Same risk + more globalism | Avoid |
| Patch a singleton method on instance (`obj.singleton_method`) | Local — only affects one object | Safer for tests |

**Detect patches at runtime:**

```ruby
"abc".method(:upcase).source_location
# => ["/path/to/file.rb", 12]   ← see who defined it

"abc".method(:upcase).owner
# => String                       ← which class/module owns it

String.instance_method(:upcase).source_location
# Same idea
```

**Ruby's "alias_method" pattern (for wrapping):**

```ruby
class String
  alias_method :original_upcase, :upcase

  def upcase
    "[wrapped] " + original_upcase
  end
end
```

| Pitfall | Detail |
|---|---|
| Multiple patches all use `:original_upcase` | Last wins; chain breaks |
| Use unique aliases | `:_string_upcase_logged` |
| Modern preference | `prepend` a module instead |

**`prepend` — modern wrapping:**

```ruby
module UppercaseLogger
  def upcase
    puts "Upcasing #{self}"
    super
  end
end

String.prepend(UppercaseLogger)
"abc".upcase   # logs + returns "ABC"
```

| Win | Detail |
|---|---|
| `super` calls the original | Composes cleanly |
| Multiple prepends compose | Stack of behaviors |
| Easier to debug | `String.ancestors` shows the chain |

**When monkey patching is acceptable:**

| Case | Notes |
|---|---|
| ActiveSupport-style, applied broadly + battle-tested | Pre-existing canonical extensions |
| Adding a method that **cannot collide** (unique enough name) | `MyApp::Domain.something` namespacing |
| Hotfix while waiting for upstream | Document with `# TODO: remove once gem v X.Y.Z` |
| In **test setup** to mock a hard-to-stub class method | Limited blast radius |

**When **not** to:**

| Case | Use instead |
|---|---|
| Adding new methods to core classes in a library | Module + include / extend |
| Changing existing core methods | Refinements / decorator |
| Fixing third-party gem behavior | Fork / fund / file PR; patch as last resort |
| Adding methods that may collide | Namespace via custom class / module |

**Library author's responsibility:**

| Practice | Effect |
|---|---|
| Don't monkey patch in a gem unless that's the gem's purpose | Surprise breakage for users |
| Document any patches in README | "This gem adds `String#xyz`" |
| Use refinements when scope makes sense | Lower blast radius |
| Provide `extend` patterns | Let users opt in |

**Linting / detection:**

| Tool | Use |
|---|---|
| **RuboCop** rule `Style/MonkeyPatch` (custom) | Detect patches |
| **`rspec-its`** | Spec how methods behave |
| **`bundler-audit`** + dependency review | Catch gems known for invasive patches |
| **`Method#source_location`** at runtime | "Where did this come from?" |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Patching `Object` / `Kernel` / `BasicObject` | Affects EVERYTHING |
| Patches loaded after gems → inconsistent ordering | Use `Bundler.setup` then explicit `require` |
| Not freezing the patched class | Other code can patch over yours |
| Adding methods that collide with future Ruby versions | Forward-compat surprise |
| Adding `to_json` / `to_s` etc. | Massive ripple effects |
| Patching `Comparable` / `Enumerable` modules | Half the stdlib uses these |

**Cross-references:**

- AST + RuboCop pattern matchers (for detecting patches): [ast_*.md](ast_abstract_syntax_tree_parsing.md)
- Refinements + DSL building: search `ruby/metaprogramming/`
- Modules + mixins (the alternative): search `ruby/core/class_vs_module.md`

**Rule of thumb:** **never monkey patch in production code you ship to others.** ActiveSupport's extensions are the rare exception — widely-used and well-tested. If you must add methods to core classes, **prefer Refinements (scoped) or new modules / decorator classes (explicit)**. When debugging surprise behavior, `Method#source_location` shows you who patched what — make it the first tool you reach for.
