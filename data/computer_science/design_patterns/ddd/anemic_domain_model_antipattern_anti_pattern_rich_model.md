### DDD: Anemic Domain Model (Anti-Pattern)

**Anemic model (bad):**
```ruby
# Model has no behavior — just data holders
class Order
  attr_accessor :status, :total, :items
end

# All logic in a service
class OrderService
  def complete(order)
    raise "Empty order" if order.items.empty?
    order.status = :completed  # service manipulates model directly
  end
end
```

**Rich domain model (good):**
```ruby
class Order
  def complete
    raise "Cannot complete empty order" if items.empty?
    @status = :completed  # model enforces its own rules
  end

  def add_item(product_id, quantity, price)
    raise "Cannot modify completed order" if completed?
    @items << LineItem.new(product_id:, quantity:, price:)
    recalculate_total
  end
end
```

**How to detect anemic models:**
- Models have only getters/setters (attr_accessor everywhere)
- All business logic lives in service objects
- Models are just database rows with no behavior
- You have many "manager" or "handler" classes that operate on dumb data

**Rule of thumb:** Put behavior where the data is. If an Order knows its items, it should know how to complete itself. Services are for cross-aggregate operations, not for operating on a single model's data.
