### Event Sourcing Advanced: Snapshots, Versioning, Projections & Replay

**Recap: Event Sourcing basics:**
```
Command → Aggregate validates → Event stored (immutable, append-only)
Current state = replay all events from the beginning

Events: [OrderCreated, ItemAdded, ItemAdded, PaymentReceived, OrderShipped]
State:  Order { status: :shipped, items: 2, paid: true }
```

**Snapshots (performance optimization):**
```
Problem: aggregate has 10,000 events → loading takes 2 seconds
Solution: save periodic snapshot of current state

Event stream:
  [Event 1] ... [Event 5000] [Snapshot @ 5000] [Event 5001] ... [Event 5050]

Loading:
  1. Load latest snapshot (state at event 5000)
  2. Replay only events 5001-5050 (50 events, not 5000)
  3. Current state ready in milliseconds
```

```ruby
class OrderAggregate
  SNAPSHOT_INTERVAL = 100

  def self.load(order_id)
    snapshot = SnapshotStore.latest(order_id)
    events = EventStore.events_after(order_id, snapshot&.version || 0)

    aggregate = snapshot ? from_snapshot(snapshot) : new(order_id)
    events.each { |event| aggregate.apply(event) }
    aggregate
  end

  def save(new_events)
    EventStore.append(id, new_events, expected_version: version)

    if version % SNAPSHOT_INTERVAL == 0
      SnapshotStore.save(id, version, to_snapshot)
    end
  end
end
```

**Event versioning (schema evolution):**
```ruby
# V1 of event (original)
class OrderPlaced_V1
  attr_reader :order_id, :total  # total in dollars (float)
end

# V2 of event (breaking: total now in cents as integer)
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
        currency: "USD"  # default for old events
      )
    else
      event
    end
  end
end
```

**Versioning strategies:**
| Strategy | How | Tradeoff |
|----------|-----|----------|
| Upcasting | Transform old events to new format on read | No data migration, slower reads |
| Copy-transform | Migrate entire event store to new format | Fast reads, expensive one-time migration |
| Weak schema | Add optional fields, ignore unknown | Simplest, but less strict |
| Event wrapper | Wrap old event type in new type | Explicit, verbose |

**Projections (read models):**
```ruby
# Projection subscribes to events, builds read-optimized view

class OrderSummaryProjection
  def handle(event)
    case event
    when OrderPlaced
      OrderSummary.create!(
        order_id: event.order_id,
        status: "placed",
        total_cents: event.total_cents,
        item_count: 0,
        last_updated: event.occurred_at
      )
    when ItemAdded
      summary = OrderSummary.find_by!(order_id: event.order_id)
      summary.update!(
        item_count: summary.item_count + 1,
        last_updated: event.occurred_at
      )
    when OrderShipped
      OrderSummary.find_by!(order_id: event.order_id)
                  .update!(status: "shipped", last_updated: event.occurred_at)
    end
  end
end
```

**Multiple projections from same events:**
```
Event stream: [OrderPlaced, ItemAdded, PaymentReceived, OrderShipped]
                |              |              |              |
  Projection 1: OrderSummary (for customer dashboard)
  Projection 2: RevenueReport (for finance team)
  Projection 3: WarehouseFeed (for shipping department)
  Projection 4: SearchIndex (for Elasticsearch)
```
- Each projection is independent, optimized for its use case
- Can add new projections retroactively (replay all events)

**Projection rebuilding:**
```ruby
# Need to fix a projection bug or add a new projection?
# 1. Delete the read model
# 2. Replay all events from the beginning
# 3. Projection rebuilds from scratch

class ProjectionRebuilder
  def rebuild(projection_class)
    projection_class.delete_all  # clear current state
    EventStore.all_events.each do |event|
      projection_class.new.handle(event)
    end
  end
end
```
- This is the superpower of event sourcing: you can ALWAYS rebuild
- But: can be slow for millions of events (use snapshots, parallel replay)

**Temporal queries (time travel):**
```ruby
# "What was the state of this order on January 15th?"
events = EventStore.events_before(order_id, Date.new(2024, 1, 15))
state = events.reduce(Order.new) { |order, event| order.apply(event) }
# state now reflects the order as it was on Jan 15
```

**When NOT to use event sourcing:**
- Simple CRUD with no complex domain logic
- No audit or temporal query requirement
- Team is unfamiliar (steep learning curve)
- Read-heavy with simple queries (CQRS overhead not worth it)
- Events are not naturally part of the domain

**Rule of thumb:** Snapshots every N events for performance. Version events from day one (upcasting is simplest). Projections are the read side — build as many as you need. Rebuilding projections from events is event sourcing's superpower. Use event sourcing only when audit trail, temporal queries, or complex domain logic justify the complexity.
