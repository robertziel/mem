### Event Sourcing: Event Versioning & Upcasting

**Problem:** events are immutable, but business evolves — schema must change.

```ruby
# V1 (original)
class OrderPlaced_V1
  attr_reader :order_id, :total  # total in dollars (float)
end

# V2 (total now in cents)
class OrderPlaced_V2
  attr_reader :order_id, :total_cents, :currency
end

# Upcaster: transforms V1 events to V2 format during replay
class OrderPlacedUpcaster
  def upcast(event)
    if event.version == 1
      OrderPlaced_V2.new(
        order_id: event.order_id,
        total_cents: (event.total * 100).to_i,
        currency: "USD"
      )
    else
      event
    end
  end
end
```

**Strategies:**
| Strategy | How | Tradeoff |
|----------|-----|----------|
| Upcasting | Transform old events on read | No migration, slower reads |
| Copy-transform | Migrate entire event store | Fast reads, expensive migration |
| Weak schema | Add optional fields, ignore unknown | Simplest, less strict |

**Rule of thumb:** Version events from day one. Upcasting is simplest — transform old events to new format during replay. Never rename fields or change types without a version bump. Add fields with defaults, never remove.
