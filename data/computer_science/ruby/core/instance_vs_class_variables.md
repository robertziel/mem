### Instance vs. Class Variables (short)

- **Instance variable**: `@name` — per object.
- **Class variable**: `@@count` — shared across the class hierarchy.

```ruby
class User
  @@count = 0

  def initialize
    @@count += 1
  end

  def self.count
    @@count
  end
end
```

**Gotcha:** class variables are shared across subclasses too, which can be surprising.

**Alternative:** use class instance variables (`@count` on the class) for safer isolation.
