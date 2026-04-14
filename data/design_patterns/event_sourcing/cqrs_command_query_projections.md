### CQRS and Event Sourcing

**CQRS (Command Query Responsibility Segregation):**
- Separate read model from write model
- Commands (writes) go to one model/store
- Queries (reads) go to another, optimized for reading

```
[Client] -- Command (write) --> [Write Model] --> [Event Store / Primary DB]
                                                       |
                                                  Event published
                                                       |
[Client] <-- Query (read) --- [Read Model] <--- [Projection updated]
```

**Why separate reads and writes:**
- Read and write workloads have different optimization needs
- Reads: denormalized, cached, indexed for query patterns
- Writes: normalized, validated, transactionally consistent
- Scale independently: add read replicas without affecting writes

**Simple CQRS (without event sourcing):**
- Write to PostgreSQL (normalized)
- Read from materialized view, Elasticsearch, or Redis (denormalized)
- Sync via DB triggers, Change Data Capture, or application events

**Event Sourcing:**
- Store every state change as an immutable event
- Current state = replay all events from the beginning
- Never delete or update events (append-only log)

```ruby
# Events (immutable facts)
OrderPlaced.new(order_id: 1, user_id: 5, total: 100)
PaymentReceived.new(order_id: 1, amount: 100)
OrderShipped.new(order_id: 1, tracking: "UPS123")

# Rebuild state by replaying events
events = EventStore.events_for(order_id: 1)
order = events.reduce(Order.new) { |state, event| state.apply(event) }
```

**Event Store:**
- Append-only log of events
- Each event: aggregate_id, event_type, data, timestamp, version
- Query by aggregate_id to rebuild state
- Global stream for projections and read models

**Projections (read models):**
- Subscribe to events, build optimized read views
- Can rebuild from scratch by replaying all events
- Multiple projections from same events (e.g., user dashboard, admin report)

```ruby
class OrderSummaryProjection
  def handle(event)
    case event
    when OrderPlaced
      OrderSummary.create!(order_id: event.order_id, status: 'placed', total: event.total)
    when OrderShipped
      OrderSummary.find_by(order_id: event.order_id).update!(status: 'shipped')
    end
  end
end
```

**Benefits:**
- Complete audit trail (every change recorded)
- Time travel (rebuild state at any point in time)
- Debug production issues by replaying events
- Add new read models retroactively

**Challenges:**
- Complexity: eventual consistency between write and read models
- Schema evolution: events are immutable, but business evolves (versioning)
- Rebuilding projections can be slow for large event stores
- Not suitable for all domains (simple CRUD doesn't benefit)

**When to use:**
- **CQRS (without event sourcing)**: read-heavy apps that need optimized read models
- **Event Sourcing**: audit-critical domains (finance, healthcare), complex domain logic, need for temporal queries
- **Neither**: simple CRUD applications

**Rule of thumb:** CQRS is useful even without event sourcing (separate read/write optimization). Event sourcing adds audit and replay but adds significant complexity. Use event sourcing only when the audit trail or temporal queries are a core business requirement, not just "nice to have."
