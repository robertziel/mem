### Proxy Pattern (Lazy Loading, Access Control)

Provide a surrogate or placeholder to control access to an object.

```ruby
class LazyUser
  def initialize(id)
    @id = id
    @user = nil
  end

  def name
    load_user.name
  end

  private
  def load_user
    @user ||= User.find(@id)  # only loads when accessed
  end
end
```

**Proxy types:**
- **Lazy proxy** — defer loading until accessed
- **Access control proxy** — check permissions before delegating
- **Logging proxy** — log method calls
- **Remote proxy** — represent a remote object locally

**Rule of thumb:** Proxy for lazy initialization, access control, or remote service representation. Similar to Decorator but controls ACCESS rather than adding behavior.
