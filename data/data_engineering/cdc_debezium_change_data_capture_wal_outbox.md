### Change Data Capture (CDC)

**What CDC does:**
- Captures every data change (INSERT, UPDATE, DELETE) from a source database
- Streams changes as events to downstream systems in near real-time
- Keeps systems in sync without batch ETL

**Use cases:**
- Replicate data to a warehouse in real-time
- Update search indexes (Elasticsearch) when DB changes
- Invalidate cache entries when underlying data changes
- Build event-driven microservices from a monolith
- Audit logging (track every change)

**CDC approaches:**

| Method | How | Pros | Cons |
|--------|-----|------|------|
| Log-based (WAL/binlog) | Read database transaction log | No impact on source, captures all changes | Requires DB config, format varies |
| Trigger-based | DB triggers write to changelog table | Works on any DB | Adds write load, complex triggers |
| Query-based (polling) | Poll for changes using timestamps | Simplest, no DB config | Misses deletes, lag, load on source |
| Dual-write | Application writes to DB and event stream | Application-controlled | Inconsistency risk (not atomic) |

**Log-based is best practice** - Debezium is the standard tool.

**Debezium architecture:**
```
[PostgreSQL] -WAL-> [Debezium Connector] -> [Kafka] -> [Consumers]
                     (Kafka Connect)                     - Warehouse
                                                         - Elasticsearch
                                                         - Cache invalidation
                                                         - Microservices
```

**Debezium event format:**
```json
{
  "before": {"id": 1, "name": "Alice", "email": "old@example.com"},
  "after": {"id": 1, "name": "Alice", "email": "new@example.com"},
  "source": {
    "connector": "postgresql",
    "db": "mydb",
    "table": "users",
    "lsn": 12345678
  },
  "op": "u",     // c=create, u=update, d=delete, r=read (snapshot)
  "ts_ms": 1704067200000
}
```

**PostgreSQL setup for Debezium:**
```sql
-- Enable logical replication
ALTER SYSTEM SET wal_level = 'logical';
-- Create replication slot
SELECT pg_create_logical_replication_slot('debezium', 'pgoutput');
-- Create publication
CREATE PUBLICATION dbz_publication FOR ALL TABLES;
```

**Outbox pattern with CDC:**
```
Application writes to outbox table (in same DB transaction)
  -> Debezium captures outbox changes
  -> Publishes to Kafka
  -> Downstream consumers process events
```
- Guarantees: if business data saved, event will be published
- Avoids dual-write inconsistency problem

**Kafka Connect (Debezium runs on this):**
- Framework for streaming data between Kafka and external systems
- Source connectors: DB -> Kafka (Debezium)
- Sink connectors: Kafka -> DB/Elasticsearch/S3/etc.
- Distributed mode for scalability and fault tolerance

**Rule of thumb:** Use log-based CDC (Debezium) over polling or dual-write. Stream changes via Kafka for decoupled consumers. Use the outbox pattern for reliable event publishing from your application. CDC is the bridge between your operational DB and analytical/event-driven systems.
