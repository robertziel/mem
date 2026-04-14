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

`after_save` vs `after_commit`:

- `after_save` runs inside the transaction.
- `after_commit` runs after the transaction is committed.
- Use `after_commit` for external side effects like emails, jobs, or webhooks.

**Pros:** keep simple persistence-related logic close to data.
**Cons:** can hide side effects, make flows harder to trace, and create tight model coupling.

**Rule of thumb:** keep callbacks small, avoid complex business logic in them, and prefer service objects for cross-model workflows or external side effects.
