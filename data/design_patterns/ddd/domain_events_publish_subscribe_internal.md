### DDD: Domain Events (Internal)

**What domain events are:**
- Something that happened in the domain, expressed in past tense
- Published by aggregates, handled within the same bounded context
- In-memory (same process), synchronous or async

```ruby
class OrderPlaced
  attr_reader :order_id, :user_id, :total, :occurred_at

  def initialize(order_id:, user_id:, total:)
    @order_id = order_id
    @user_id = user_id
    @total = total
    @occurred_at = Time.current
  end
end

class Order
  def place
    validate!
    @status = :placed
    DomainEvents.publish(OrderPlaced.new(order_id: id, user_id: user_id, total: total))
  end
end

# Handlers within same service
DomainEvents.subscribe(OrderPlaced) do |event|
  InventoryReservation.create!(order_id: event.order_id)
  AuditLog.record!(event)
end
```

**Naming:** Always past tense — `OrderPlaced`, `PaymentReceived`, `UserRegistered` (events), not `PlaceOrder` (commands).

**Rule of thumb:** Domain events for internal side effects within a bounded context. Name in past tense. Keep event data immutable. For cross-service communication, use integration events via message broker.
