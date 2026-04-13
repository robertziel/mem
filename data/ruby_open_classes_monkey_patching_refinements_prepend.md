### Open Classes, Monkey Patching & Refinements

**Open classes (Ruby's superpower and danger):**
```ruby
# Ruby allows reopening ANY class at runtime
class String
  def palindrome?
    self == self.reverse
  end
end
"racecar".palindrome?  # true
```

**Monkey patching (modifying existing classes):**
```ruby
# ActiveSupport does this extensively:
# 2.days.ago, "hello".blank?, 1.megabyte

# Dangerous: overriding existing methods
class Array
  def flatten  # overrides built-in!
    "surprise!"
  end
end
[1,[2,3]].flatten  # "surprise!" — breaks everything
```

**Dangers of monkey patching:**
- Can break gems and standard library
- Name collisions between gems patching the same method
- Hard to debug ("where did this method come from?")
- Implicit dependencies (code works because of a distant patch)

**Refinements (safe alternative, Ruby 2.0+):**
```ruby
module StringExtensions
  refine String do
    def shout
      upcase + "!!!"
    end
  end
end

# Without using: "hello".shout raises NoMethodError

class MyClass
  using StringExtensions  # activate refinement in this scope only

  def greet
    "hello".shout  # "HELLO!!!" — works here
  end
end

"hello".shout  # NoMethodError — doesn't leak outside
```

**prepend (controlled method wrapping):**
```ruby
module Logging
  def save
    puts "Before save: #{self.class}"
    result = super  # calls the original save
    puts "After save: #{result}"
    result
  end
end

class User < ApplicationRecord
  prepend Logging  # Logging#save wraps User#save
end

# Method lookup: Logging -> User -> ApplicationRecord -> ...
```

**prepend vs include:**
```ruby
# include: module inserted AFTER class in ancestor chain
class User
  include Logging  # User -> Logging -> Object
end
# Logging's save would need `super` to call User's save (wrong direction)

# prepend: module inserted BEFORE class in ancestor chain
class User
  prepend Logging  # Logging -> User -> Object
end
# Logging's save wraps User's save (correct: super goes to User#save)
```

**When to use what:**
| Technique | Use case | Safety |
|-----------|----------|--------|
| Monkey patch | Quick prototype, Rails console | Low — avoid in production |
| Refinements | Scoped extension of core classes | High — no global side effects |
| prepend | AOP-style wrapping (logging, caching) | Medium — explicit in ancestor chain |
| Module include | Adding behavior (mixins) | High — standard Ruby |

**ActiveSupport core extensions (the "sanctioned" monkey patches):**
```ruby
# These are widely accepted in Rails apps:
"".blank?          # true
"hello".present?   # true
nil.try(:name)     # nil (no NoMethodError)
2.days.ago         # Time calculation
{ a: 1 }.deep_symbolize_keys
[1, 2, 3].second   # 2
```

**Rule of thumb:** Never monkey-patch in production code (except via ActiveSupport, which is battle-tested). Use refinements for scoped extensions. Use `prepend` for wrapping existing methods. If you're reopening a core class, you're probably doing it wrong.
