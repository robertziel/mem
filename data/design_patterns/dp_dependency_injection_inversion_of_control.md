### Dependency Injection (Inversion of Control)

Push dependencies into objects instead of creating them internally.

```ruby
# BAD: hard-coded dependency (tight coupling)
class OrderService
  def initialize
    @gateway = StripeGateway.new  # can't swap, can't test
  end
end

# GOOD: inject dependency
class OrderService
  def initialize(gateway:)
    @gateway = gateway
  end

  def charge(order)
    @gateway.charge(order.total)
  end
end

# Production
OrderService.new(gateway: StripeGateway.new)

# Test
OrderService.new(gateway: FakeGateway.new)
```

**DI types:**
| Type | How | Example |
|------|-----|---------|
| Constructor injection | Pass via `initialize` | `Service.new(repo: repo)` |
| Setter injection | Assign after creation | `service.repo = repo` |
| Interface injection | Object asks for dependency | Rare in Ruby |

**In Rails:** no DI container needed — just pass dependencies via `initialize`. For global services, use `Rails.application.config` or a simple registry.

**Rule of thumb:** Constructor injection is simplest and most explicit. Makes testing trivial (swap real for fake). Avoids hidden dependencies. In Ruby, you don't need a DI framework — just pass objects via `initialize`.
