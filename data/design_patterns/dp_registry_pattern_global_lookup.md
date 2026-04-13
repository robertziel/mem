### Registry Pattern (Global Object Lookup)

Provide a well-known location to find shared objects or services.

```ruby
class ServiceRegistry
  @services = {}

  def self.register(name, service)
    @services[name] = service
  end

  def self.resolve(name)
    @services[name] || raise("Service not registered: #{name}")
  end
end

# Register services at boot
ServiceRegistry.register(:payment_gateway, StripeGateway.new)
ServiceRegistry.register(:email_sender, SesEmailSender.new)
ServiceRegistry.register(:cache, RedisCache.new)

# Resolve anywhere
gateway = ServiceRegistry.resolve(:payment_gateway)
gateway.charge(amount)
```

**In Rails:** `Rails.application.config`, `Rails.cache`, `Rails.logger` are all registries.

**Registry vs Dependency Injection:**
- Registry: objects pull dependencies (`ServiceRegistry.resolve(:x)`)
- DI: dependencies pushed into objects (`MyService.new(gateway: gateway)`)
- DI is generally preferred (more testable, explicit)

**Rule of thumb:** Registry for global services (config, logging, caching). Prefer dependency injection for business objects (more testable). Registry is essentially a service locator — useful but can hide dependencies.
