### Hexagonal Architecture (Ports & Adapters)

**Core idea:** business logic at the center, independent of frameworks and infrastructure.

```
              [HTTP Adapter]     [CLI Adapter]
                    |                 |
              +--[Input Port]--[Input Port]--+
              |       Business Logic         |
              +--[Output Port]-[Output Port]-+
                    |                 |
              [Postgres Adapter]  [Redis Adapter]
```

**Ports** = interfaces (what the core needs)
**Adapters** = implementations (how it's done)

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

# Use case depends on port, not adapter
class PlaceOrder
  def initialize(order_repo:, payment_gateway:)
    @order_repo = order_repo
    @payment_gateway = payment_gateway
  end

  def call(user_id:, items:)
    order = Order.new(user_id:, items:)
    @payment_gateway.charge(order.total)
    @order_repo.save(order)
  end
end
```

**Rule of thumb:** Dependencies point inward. Business logic doesn't know about frameworks. Use dependency injection. In Rails, start with service objects — full hexagonal only when complexity demands it.
