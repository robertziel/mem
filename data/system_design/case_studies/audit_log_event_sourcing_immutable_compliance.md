### Design an Activity/Audit Log System (Event Sourcing)

**Requirements:**
- Record every state change across all services (who did what, when)
- Immutable — no one can tamper with history
- Query: "what was the state of entity X at time T?"
- Compliance: financial regulations, GDPR, SOX audit trails
- Retain for years, query efficiently

**Architecture:**
```
┌──────────┐    ┌──────────┐    ┌─────────────────┐    ┌────────────────┐
│ Services │───>│  Kafka   │───>│ Event Processor │───>│ Read Models    │
│ (events) │    │  Topics  │    │ (consumers)     │    │ (query-optimized)│
└──────────┘    └──────────┘    └─────────────────┘    └────────────────┘
                     │                                        │
                     ▼                                        ▼
              ┌─────────────┐                         ┌──────────────┐
              │ Cold Storage│                         │ Search Index │
              │ (S3/Iceberg)│                         │ (Elasticsearch)│
              └─────────────┘                         └──────────────┘
```

**Event schema:**
```json
{
  "event_id": "evt_a1b2c3d4",
  "event_type": "order.item_added",
  "aggregate_type": "Order",
  "aggregate_id": "order_789",
  "actor": { "user_id": "u_123", "role": "admin", "ip": "1.2.3.4" },
  "timestamp": "2025-06-15T14:30:00.000Z",
  "version": 5,
  "payload": {
    "item_id": "prod_456",
    "quantity": 2,
    "price": 29.99
  },
  "metadata": {
    "correlation_id": "req_xyz",
    "source_service": "order-service",
    "schema_version": "1.2"
  }
}
```

**Event sourcing — derive state from events:**
```ruby
# Rebuild current state by replaying events
class Order
  attr_reader :id, :status, :items, :total

  def self.from_events(events)
    order = new
    events.sort_by(&:version).each { |e| order.apply(e) }
    order
  end

  def apply(event)
    case event.event_type
    when "order.created"
      @id = event.aggregate_id
      @status = "created"
      @items = []
      @total = 0
    when "order.item_added"
      @items << event.payload
      @total += event.payload["price"] * event.payload["quantity"]
    when "order.item_removed"
      @items.reject! { |i| i["item_id"] == event.payload["item_id"] }
      @total -= event.payload["price"] * event.payload["quantity"]
    when "order.completed"
      @status = "completed"
    end
  end
end

# "What was the order state at 2pm yesterday?"
events = EventStore.fetch("order_789", up_to: Time.parse("2025-06-14T14:00:00Z"))
order_at_2pm = Order.from_events(events)
```

**Storage tiers:**

| Tier | Store | Retention | Use |
|------|-------|-----------|-----|
| Hot (0-30 days) | Kafka + PostgreSQL | 30 days | Real-time queries, recent activity |
| Warm (30-365 days) | Elasticsearch | 1 year | Search, dashboards, investigations |
| Cold (1-7+ years) | S3 + Apache Iceberg | 7 years | Compliance, legal holds, archival |

**Kafka topics:**
```
audit.events.raw           — all events from all services (partitioned by aggregate_id)
audit.events.enriched      — after adding actor details, geo info
audit.events.compliance    — filtered: only compliance-relevant events
```

**Immutability guarantees:**
```
1. Kafka: append-only log, messages are immutable once written
2. S3: object lock (WORM — Write Once Read Many) for cold storage
3. PostgreSQL: insert-only table, no UPDATE/DELETE permissions
4. Checksums: SHA-256 hash chain — each event includes hash of previous
   event, forming a tamper-evident chain (like blockchain lite)

-- PostgreSQL: prevent modification
REVOKE UPDATE, DELETE ON audit_events FROM app_user;
CREATE POLICY audit_insert_only ON audit_events
  FOR INSERT TO app_user USING (true);
```

**Hash chain for tamper detection:**
```ruby
class AuditEvent
  def compute_hash(previous_hash)
    data = "#{event_id}|#{event_type}|#{aggregate_id}|#{timestamp}|#{payload.to_json}"
    Digest::SHA256.hexdigest("#{previous_hash}|#{data}")
  end
end

# Verify chain integrity
events = EventStore.fetch_all("order_789")
events.each_cons(2) do |prev, curr|
  expected_hash = curr.compute_hash(prev.hash)
  raise "Tampered!" unless expected_hash == curr.hash
end
```

**Read models (projections) for fast queries:**
```
1. Activity feed:    "show me last 50 actions by user X"
                     → PostgreSQL table: (user_id, action, timestamp, details)
                     → Index on (user_id, timestamp DESC)

2. Entity timeline:  "show full history of order #789"
                     → Elasticsearch: index by aggregate_id, full-text on payload

3. Compliance report: "all admin actions on financial records in Q1 2025"
                      → Iceberg table: partitioned by (year, month, actor_role)
                      → Query via Spark/Trino
```

**GDPR — right to erasure with event sourcing:**
```
Problem: events are immutable, but GDPR requires deletion of personal data

Solutions:
1. Crypto-shredding: encrypt PII with per-user key, delete key to "erase"
   - Event payload encrypted with user-specific key
   - Delete key → payload becomes unreadable → effectively erased
2. Tombstone events: append "user.data_erased" event
   - Projections filter out erased user's data
   - Raw events still exist but masked
3. Separate PII store: events reference user_id, PII in separate DB
   - Delete PII from separate DB, events retain only IDs
```

**Rule of thumb:** Store events as the source of truth, derive read models via projections. Partition Kafka by aggregate_id for ordered replay. Use hash chains for tamper detection. Tier storage: hot (PostgreSQL) for recent, warm (Elasticsearch) for search, cold (S3/Iceberg) for compliance. For GDPR, use crypto-shredding — encrypt PII per user, delete the key to "erase."
