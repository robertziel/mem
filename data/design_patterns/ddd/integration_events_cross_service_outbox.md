### DDD: Integration Events & Outbox Pattern

**Integration events (cross-service):**
- Published to a message broker (Kafka, SQS, SNS) for other services
- Serialized (JSON, Avro, Protobuf)
- At-least-once delivery → consumers must be idempotent

```ruby
# After internal domain event, publish integration event externally
DomainEvents.subscribe(OrderPlaced) do |event|
  EventPublisher.publish("order.placed", {
    order_id: event.order_id,
    user_id: event.user_id,
    total: event.total,
    occurred_at: event.occurred_at.iso8601
  })
end
```

**Outbox pattern (reliable publishing):**
```ruby
# Write event to outbox table in SAME transaction as business data
ActiveRecord::Base.transaction do
  order.place
  order.save!
  Outbox.create!(event_type: "order.placed", payload: { order_id: order.id }.to_json)
end

# Background process reads outbox → publishes to Kafka → marks as published
```

**Event-carried state transfer:**
```json
// Include ALL data consumer needs (no callback required)
{ "event": "order.placed", "order_id": "123", "user_email": "a@b.com", "total": 50 }
```

**Rule of thumb:** Outbox pattern for reliable event publishing (same-transaction guarantee). Include enough data for consumers to be self-sufficient. Version event schemas from day one.
