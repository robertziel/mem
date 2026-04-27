### Event Sourcing: Snapshots

**Problem:** aggregate has 10,000 events → loading takes seconds.

```
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
    SnapshotStore.save(id, version, to_snapshot) if version % SNAPSHOT_INTERVAL == 0
  end
end
```

**Rule of thumb:** Snapshot every N events (100-1000). Snapshots are a performance optimization — the event stream remains the source of truth. Always be able to rebuild from events alone.
