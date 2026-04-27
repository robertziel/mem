### Design a Change Data Capture (CDC) Pipeline

**Requirements:**
- Capture every INSERT/UPDATE/DELETE from source databases in real-time
- Stream changes to Kafka for downstream consumers
- Keep multiple systems in sync (search index, cache, data warehouse, analytics)
- No application code changes — capture from database WAL/binlog
- Handle schema evolution gracefully

**Architecture:**
```
┌──────────────┐    ┌───────────┐    ┌───────┐    ┌─────────────────────┐
│ Source DBs   │    │ Debezium  │    │ Kafka │    │ Consumers           │
│              │    │ Connectors│    │       │    │                     │
│ PostgreSQL ──┼───>│ PG conn.  │───>│ topic │───>│ Elasticsearch       │
│ MySQL     ──┼───>│ MySQL conn│───>│ topic │───>│ Redis (cache)       │
│ MongoDB   ──┼───>│ Mongo conn│───>│ topic │───>│ Data Warehouse      │
└──────────────┘    └───────────┘    └───────┘    │ Analytics (Flink)   │
                                                   │ Audit log           │
                                                   └─────────────────────┘
```

**How CDC works (PostgreSQL example):**
```
1. App writes to PostgreSQL (INSERT/UPDATE/DELETE)
2. PostgreSQL writes change to WAL (Write-Ahead Log)
3. Debezium reads WAL via logical replication slot
4. Debezium converts change to event, publishes to Kafka topic
5. Downstream consumers process events independently

Key: NO application code changes needed
     Debezium reads the database's own transaction log
```

**Debezium change event structure:**
```json
{
  "before": {                          
    "id": 123,
    "name": "Old Name",
    "email": "old@example.com",
    "updated_at": "2025-06-14T10:00:00Z"
  },
  "after": {                           
    "id": 123,
    "name": "New Name",
    "email": "new@example.com",
    "updated_at": "2025-06-15T14:30:00Z"
  },
  "source": {
    "connector": "postgresql",
    "db": "myapp_production",
    "schema": "public",
    "table": "users",
    "txId": 98765,
    "lsn": 123456789
  },
  "op": "u",                          
  "ts_ms": 1718458200000              
}
```

```
op values:
  "c" = CREATE (insert)   — before: null, after: {new row}
  "u" = UPDATE             — before: {old row}, after: {new row}
  "d" = DELETE             — before: {old row}, after: null
  "r" = READ (snapshot)    — initial load of existing data
```

**Kafka topic naming convention:**
```
{server}.{schema}.{table}

Examples:
  myapp.public.users           — changes to users table
  myapp.public.orders          — changes to orders table
  myapp.public.order_items     — changes to order_items table

One topic per table, partitioned by primary key
```

**Debezium connector configuration (PostgreSQL):**
```json
{
  "name": "myapp-postgres-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "db.example.com",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "${secrets:db-password}",
    "database.dbname": "myapp_production",
    "topic.prefix": "myapp",
    "table.include.list": "public.users,public.orders,public.order_items",
    "plugin.name": "pgoutput",
    "slot.name": "debezium_slot",
    "publication.name": "debezium_pub",
    "snapshot.mode": "initial",
    "transforms": "unwrap",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "key.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter"
  }
}
```

**Common CDC use cases:**

| Use case | Consumer | Pattern |
|----------|----------|---------|
| Search sync | Elasticsearch | Consume user/product changes → update search index |
| Cache invalidation | Redis | Consume changes → delete stale cache keys |
| Data warehouse | Snowflake/BigQuery | Consume all changes → append to warehouse tables |
| Real-time analytics | Flink | Consume order events → streaming aggregations |
| Audit trail | S3/Iceberg | Consume all changes → immutable event log |
| Cross-service sync | Another microservice | Consume changes → update local read model |

**Elasticsearch sync consumer example:**
```ruby
class ElasticsearchSyncConsumer
  def handle(event)
    case event.op
    when "c", "u", "r"  # create, update, snapshot read
      doc = event.after
      ElasticsearchClient.index(
        index: "users",
        id: doc["id"],
        body: { name: doc["name"], email: doc["email"] }
      )
    when "d"  # delete
      ElasticsearchClient.delete(index: "users", id: event.before["id"])
    end
  end
end
```

**Schema evolution handling:**
```
Problem: source table gets a new column — downstream consumers break?

Solutions:
1. Schema Registry (Confluent/Apicurio):
   - Debezium registers schema with registry
   - Consumers fetch schema by ID from registry
   - Backward/forward compatibility rules enforced

2. Debezium SMT (Single Message Transforms):
   - Filter columns: only emit fields consumers need
   - Rename fields: decouple source schema from event schema

3. Consumer tolerance:
   - Ignore unknown fields (forward compatible)
   - Use defaults for missing fields (backward compatible)
```

**Outbox pattern (alternative to WAL-based CDC):**
```ruby
# Instead of reading WAL, write events explicitly to an outbox table
class Order < ApplicationRecord
  after_create :write_outbox_event

  private

  def write_outbox_event
    OutboxEvent.create!(
      aggregate_type: "Order",
      aggregate_id: id,
      event_type: "order.created",
      payload: { id: id, total: total, user_id: user_id }.to_json
    )
  end
end

# Debezium reads the outbox table (not the orders table)
# Advantage: you control the event schema (decoupled from DB schema)
# Advantage: transactional guarantee (order + event in same DB transaction)
```

**Operational concerns:**

```
Monitoring:
- Debezium lag: time between DB write and Kafka publish (should be < 1s)
- Kafka consumer lag: events waiting to be processed
- Replication slot size (PostgreSQL): if consumer stops, slot grows → disk fills

Failure handling:
- Debezium crash → restarts from last committed LSN (no data loss)
- Kafka unavailable → Debezium buffers, retries
- Consumer crash → resumes from last committed Kafka offset

Snapshot (initial load):
- First start: Debezium snapshots entire table → Kafka (op="r")
- Then switches to streaming WAL changes
- For large tables: use incremental snapshots (Debezium 1.6+)
```

**CDC vs application events:**

| Aspect | CDC (Debezium) | Application events |
|--------|---------------|-------------------|
| Code changes | None — reads DB log | Must emit events in app code |
| Schema control | Tied to DB schema | Fully custom event schema |
| Granularity | Row-level changes | Business-level events |
| Guarantees | Captures ALL changes | Can miss if developer forgets |
| Latency | Sub-second (WAL) | Depends on implementation |
| Best for | Keeping systems in sync | Domain events, business logic |

**Rule of thumb:** Use CDC (Debezium) to keep derived systems in sync (search, cache, warehouse) without touching application code. Use the outbox pattern when you need control over the event schema. One Kafka topic per source table, partitioned by primary key. Monitor replication slot size — it's the #1 operational risk with PostgreSQL CDC. For greenfield systems, prefer application-level domain events; for brownfield (legacy DB), CDC is the non-invasive path to event-driven architecture.
