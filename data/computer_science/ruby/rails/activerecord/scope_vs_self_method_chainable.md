### `scope` vs `self.method` (short)

Both define query helpers, but they’re different in **laziness** and **composition**.

- **`scope`** returns an `ActiveRecord::Relation`, and stays chainable.
- **`self.method`** can return anything, but loses lazy query chaining if it returns an array.

```ruby
class User < ApplicationRecord
  scope :active, -> { where(active: true) }

  def self.recent
    where("created_at > ?", 30.days.ago)
  end
end
```

**Rule of thumb:** use `scope` for chainable queries; use `self.method` for richer logic.
