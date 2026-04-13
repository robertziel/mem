### DDD Domain Events & Integration Events

**Domain Event vs Integration Event:**
| Feature | Domain Event | Integration Event |
|---------|-------------|------------------|
| Scope | Within a bounded context | Between bounded contexts / services |
| Transport | In-memory (same process) | Message broker (Kafka, SQS, SNS) |
| Audience | Same service's handlers | Other services |
| Format | Domain objects | Serialized (JSON, Avro, Protobuf) |
| Reliability | In-process, synchronous or async | At-least-once via message broker |

**Domain Event (internal):**
```ruby
# Something that happened in the domain
class OrderPlaced
  attr_reader :order_id, :user_id, :total, :items, :occurred_at

  def initialize(order_id:, user_id:, total:, items:)
    @order_id = order_id
    @user_id = user_id
    @total = total
    @items = items
    @occurred_at = Time.current
  end
end

# Aggregate publishes domain event
class Order
  def place
    validate!
    @status = :placed
    publish(OrderPlaced.new(order_id: id, user_id: user_id, total: total, items: items))
  end
end

# Handlers within same service react
DomainEvents.subscribe(OrderPlaced) do |event|
  InventoryReservation.create!(order_id: event.order_id, items: event.items)
  AuditLog.record!(event)
end
```

**Integration Event (external, cross-service):**
```ruby
# After domain event is handled internally, publish integration event externally
DomainEvents.subscribe(OrderPlaced) do |event|
  # Internal side effects
  InventoryReservation.create!(order_id: event.order_id, items: event.items)

  # Publish integration event to other services via Kafka/SNS
  EventPublisher.publish("order.placed", {
    order_id: event.order_id,
    user_id: event.user_id,
    total: event.total,
    occurred_at: event.occurred_at.iso8601
  })
end

# Other services consume:
# Payment Service → charge the customer
# Notification Service → send confirmation email
# Analytics Service → track conversion
```

**Outbox pattern (reliable event publishing):**
```ruby
# Problem: save to DB + publish event is not atomic
# If publish fails after DB save → lost event
# If publish succeeds before DB save → phantom event

# Solution: write event to outbox table IN THE SAME DB TRANSACTION
ActiveRecord::Base.transaction do
  order.place
  order.save!
  Outbox.create!(
    event_type: "order.placed",
    payload: { order_id: order.id, total: order.total }.to_json,
    published: false
  )
end

# Background process reads outbox and publishes to Kafka
# (Debezium CDC or polling worker)
OutboxPublisher.publish_pending!
```

**Event naming conventions:**
```
# Past tense (something that happened)
order.placed       ✅
order.shipped      ✅
payment.received   ✅

# NOT imperative (that's a command, not an event)
order.place        ❌ (this is a command)
ship.order         ❌ (this is a command)
```

**Event schema versioning:**
```json
{
  "event_type": "order.placed",
  "version": 2,
  "data": {
    "order_id": "ord_123",
    "user_id": "usr_456",
    "total_cents": 5000,
    "currency": "USD",
    "items": [{"product_id": "prod_1", "quantity": 2}]
  },
  "metadata": {
    "occurred_at": "2024-01-15T10:30:00Z",
    "correlation_id": "req_789",
    "causation_id": "cmd_012"
  }
}
```

**Event-Carried State Transfer:**
- Event contains ALL data the consumer needs (not just IDs)
- Consumer doesn't need to call back to the producer for details
- Reduces coupling (consumer is self-sufficient)
- Trade-off: larger events, potential staleness

```json
// Event Notification (consumer must call back for details):
{ "event": "order.placed", "order_id": "ord_123" }
// Consumer: GET /orders/ord_123 → get details (coupling!)

// Event-Carried State Transfer (self-sufficient):
{ "event": "order.placed", "order_id": "ord_123", "user_email": "a@b.com", "total": 50, "items": [...] }
// Consumer has everything it needs (no callback)
```

**Rule of thumb:** Domain events for internal side effects (same service). Integration events for cross-service communication (via message broker + outbox pattern). Name events in past tense. Include enough data for consumers to be self-sufficient (event-carried state transfer). Use the outbox pattern for reliable publishing. Version your event schemas from day one.
