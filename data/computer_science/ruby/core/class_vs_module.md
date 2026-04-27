### Class vs. Module (short)

**Class**
- Can be instantiated.
- Supports inheritance (`class Child < Parent`).

**Module**
- Cannot be instantiated.
- Used for namespacing and mixins.

```ruby
module Taggable
  def tag
    "tagged"
  end
end

class Post
  include Taggable
end
```

**Rule of thumb:**
- Use **classes** for things you create objects from.
- Use **modules** for shared behavior or namespaces.
