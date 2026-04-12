### Structural Design Patterns

**Adapter:**
- Convert interface of a class into another interface clients expect
- Make incompatible interfaces work together
```ruby
# Third-party payment gem has different interface
class StripeAdapter
  def initialize(stripe_client)
    @client = stripe_client
  end

  def charge(amount_cents, token)
    @client.create_charge(amount: amount_cents, source: token, currency: 'usd')
  end
end

# Now both adapters share the same interface
payment = StripeAdapter.new(Stripe::Client.new)
payment.charge(1000, token)
```
- Use when: integrating third-party libraries or legacy code

**Decorator:**
- Add responsibilities to objects dynamically without subclassing
- Wrap an object to extend its behavior
```ruby
class CachedRepository
  def initialize(repository, cache)
    @repository = repository
    @cache = cache
  end

  def find(id)
    @cache.fetch("user:#{id}") { @repository.find(id) }
  end
end

class LoggedRepository
  def initialize(repository, logger)
    @repository = repository
    @logger = logger
  end

  def find(id)
    @logger.info("Finding user #{id}")
    @repository.find(id)
  end
end

# Stack decorators
repo = LoggedRepository.new(
  CachedRepository.new(UserRepository.new, Rails.cache),
  Rails.logger
)
```
- Use when: you need to add behavior without modifying existing classes
- Ruby: also achievable with `Module#prepend` or method wrapping

**Proxy:**
- Provide a surrogate or placeholder to control access to an object
- Types: lazy loading proxy, access control proxy, logging proxy, remote proxy
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
- Use when: lazy initialization, access control, remote service proxy

**Facade:**
- Simplified interface to a complex subsystem
```ruby
class OrderFacade
  def place_order(user, cart)
    order = OrderService.create(user, cart)
    PaymentService.charge(user, order.total)
    InventoryService.reserve(order.items)
    NotificationService.send_confirmation(user, order)
    order
  end
end
```
- Use when: simplifying interaction with multiple subsystems
- Rails example: a service object that orchestrates multiple models

**Composite:**
- Compose objects into tree structures, treat individual and groups uniformly
- Use when: tree hierarchies (file system, org chart, menu, UI components)

**Rule of thumb:** Adapter to integrate incompatible interfaces. Decorator to add behavior dynamically (stack them). Facade to simplify complex subsystems. Proxy for lazy loading or access control. Prefer composition over inheritance.
