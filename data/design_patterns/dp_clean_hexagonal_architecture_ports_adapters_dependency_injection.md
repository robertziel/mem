### Clean Architecture and Hexagonal Architecture

**Core idea:**
- Business logic at the center, independent of frameworks and infrastructure
- Dependencies point inward (infrastructure depends on business, never the reverse)
- Easily swap databases, frameworks, UIs without changing business logic

**Hexagonal Architecture (Ports and Adapters):**
```
              [HTTP Adapter]     [CLI Adapter]
                    |                 |
                    v                 v
              +--[Input Port]--[Input Port]--+
              |                              |
              |       Business Logic         |
              |       (Domain Core)          |
              |                              |
              +--[Output Port]-[Output Port]-+
                    |                 |
                    v                 v
              [Postgres Adapter]  [Redis Adapter]
```

**Ports** = interfaces (what the core needs)
**Adapters** = implementations (how it's done)

**Example:**
```ruby
# Port (interface)
class OrderRepository
  def find(id) = raise NotImplementedError
  def save(order) = raise NotImplementedError
end

# Adapter (implementation)
class PostgresOrderRepository < OrderRepository
  def find(id) = OrderRecord.find(id).to_domain
  def save(order) = OrderRecord.from_domain(order).save!
end

# Use case (business logic, depends on port, not adapter)
class PlaceOrder
  def initialize(order_repo:, payment_gateway:)
    @order_repo = order_repo
    @payment_gateway = payment_gateway
  end

  def call(user_id:, items:)
    order = Order.new(user_id: user_id, items: items)
    @payment_gateway.charge(order.total)
    @order_repo.save(order)
    order
  end
end
```

**Clean Architecture layers (inner to outer):**
1. **Entities** - business objects, domain rules (pure, no dependencies)
2. **Use Cases** - application business rules (orchestrate entities)
3. **Interface Adapters** - convert between use case format and external format
4. **Frameworks & Drivers** - web framework, database, external services

**Dependency Rule:**
- Source code dependencies only point inward
- Inner layers don't know about outer layers
- Use dependency injection to provide implementations

**In Rails context:**
```
app/
  domain/           # Entities, value objects (pure Ruby, no Rails)
    order.rb
    money.rb
  use_cases/        # Application logic
    place_order.rb
    cancel_order.rb
  adapters/         # Infrastructure implementations
    postgres_order_repo.rb
    stripe_payment_gateway.rb
  controllers/      # HTTP adapter (thin, delegates to use cases)
    orders_controller.rb
```

**Pragmatic approach for Rails:**
- Full hexagonal architecture is overkill for many Rails apps
- Start simple: fat models -> extract service objects -> extract ports when needed
- Apply architecture at boundaries: third-party integrations, complex domain logic
- Don't abstract everything: ActiveRecord IS the adapter in many cases

**When full architecture pays off:**
- Large teams working on the same codebase
- Complex domain logic (finance, logistics, healthcare)
- Need to swap infrastructure (migrate DB, change payment provider)
- Long-lived codebase (5+ years)

**Rule of thumb:** Business logic should not depend on framework or infrastructure. Use dependency injection to decouple. In Rails, start with service objects and extract further only when complexity demands it. Architecture should serve productivity, not the other way around.
