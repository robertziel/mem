### Ruby prepend (Method Wrapping)

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
```

**prepend vs include:**
```ruby
# include: module AFTER class in ancestor chain
class User
  include Logging  # User -> Logging -> Object
end
# Logging's super goes AWAY from User (wrong direction)

# prepend: module BEFORE class in ancestor chain
class User
  prepend Logging  # Logging -> User -> Object
end
# Logging's super goes TO User#save (correct wrapping)
```

**Use for:** AOP-style method wrapping (logging, caching, timing, instrumentation) without modifying the original class.

**Rule of thumb:** `prepend` to wrap existing methods (before/after behavior). `include` to add new methods (mixins). `prepend` is explicit in the ancestor chain — better than monkey-patching for method wrapping.
