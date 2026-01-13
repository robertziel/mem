### Why make strings frozen? (short)

**Frozen string literals** make all string literals immutable.

**Why use it:**
- Fewer object allocations.
- Better memory usage.
- Avoids accidental mutation.

```ruby
# frozen_string_literal: true
name = "user"
name << "!" # raises FrozenError
```

**Rule of thumb:** enable frozen string literals for performance and safety.
