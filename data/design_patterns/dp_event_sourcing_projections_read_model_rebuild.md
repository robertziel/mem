### Event Sourcing: Projections & Read Models

**Projection = subscribe to events, build read-optimized view.**

```ruby
class OrderSummaryProjection
  def handle(event)
    case event
    when OrderPlaced
      OrderSummary.create!(order_id: event.order_id, status: "placed", total: event.total)
    when OrderShipped
      OrderSummary.find_by!(order_id: event.order_id).update!(status: "shipped")
    end
  end
end
```

**Multiple projections from same events:**
```
Events: [OrderPlaced, ItemAdded, PaymentReceived, OrderShipped]
  → Projection 1: OrderSummary (customer dashboard)
  → Projection 2: RevenueReport (finance)
  → Projection 3: SearchIndex (Elasticsearch)
```

**Rebuilding (the superpower):**
```ruby
# Bug in projection? Add new projection? Rebuild from scratch:
projection_class.delete_all
EventStore.all_events.each { |event| projection_class.new.handle(event) }
```

**Rule of thumb:** Projections are the read side — build as many as you need for different use cases. Rebuilding from events is event sourcing's superpower. Each projection is independent and optimized for its query pattern.
