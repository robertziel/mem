### Callbacks (short)

Callbacks run code at specific lifecycle moments (e.g., `before_save`).

```ruby
class User < ApplicationRecord
  before_save :normalize_email

  def normalize_email
    self.email = email.downcase
  end
end
```

**Pros:** keep logic close to data.
**Cons:** can hide side effects and make flows harder to trace.

**Rule of thumb:** keep callbacks small and avoid complex business logic in them.
