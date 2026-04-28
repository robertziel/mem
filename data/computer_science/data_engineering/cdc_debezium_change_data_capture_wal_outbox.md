### Change Data Capture (CDC) — Debezium, WAL, Outbox Pattern

**Definition:** CDC turns row-level changes (`INSERT` / `UPDATE` / `DELETE`) in a source database into a **stream of events** that downstream systems consume in near real-time.

**Why CDC:**

| Need | Without CDC | With CDC |
|---|---|---|
| Sync DB → warehouse | Nightly ETL (hours stale) | Seconds-stale streaming |
| Update search index (Elasticsearch) | Periodic re-index | Live updates per change |
| Cache invalidation | TTL guess + dual-write | Event-driven, exact |
| Microservices from monolith | Dual-write or shared DB | Each service consumes its slice of the stream |
| Audit / compliance log | Triggers + custom code | Every change captured uniformly |
| Event sourcing without rewriting the app | Refactor everything | Project events from existing tables |

**Three-and-a-half CDC approaches:**

| Method | How | Pros | Cons |
|---|---|---|---|
| **Log-based** (WAL / binlog) | Read the DB's transaction log | **Best**: no source impact, captures every change including deletes, ordered, exactly-once with offsets | Per-DB setup, log format varies, replication slot bookkeeping |
| **Trigger-based** | DB trigger writes to a `changelog` table; consumer reads it | Works on any DB | Adds write load on every mutation; trigger logic is fragile |
| **Query-based (polling)** | `SELECT WHERE updated_at > last_seen` on a timer | Simplest, no DB-level config | **Misses deletes**, misses sub-second changes, lock-free but read load |
| **Dual-write** (app writes to DB + event bus) | Application code | Total control | **Atomicity broken** — partial failure leaks; the bug the **outbox pattern** fixes |

> **Log-based wins** wherever the database supports it. Use the outbox pattern from app code; use Debezium to stream the outbox.

**Where each DB exposes its log:**

| DB | Log mechanism | Debezium connector |
|---|---|---|
| PostgreSQL | WAL via logical replication slots (`pgoutput`, `wal2json`) | ✅ |
| MySQL / MariaDB | binlog (row-based) | ✅ |
| MongoDB | oplog (replica set) / change streams | ✅ |
| SQL Server | CDC tables / change tracking | ✅ |
| Oracle | LogMiner / XStream | ✅ (XStream needs license) |
| DynamoDB | DynamoDB Streams | (native, not Debezium) |
| Cassandra | Commitlog CDC | partial |
| Cosmos DB | Change feed | (native) |

**Debezium architecture:**

```
Source DB ── WAL/binlog ──► Debezium connector (Kafka Connect)
                                         │
                                         ▼
                                  Kafka topic per table
                                         │
                       ┌─────────────────┼──────────────────┐
                       ▼                 ▼                  ▼
                  Warehouse       Elasticsearch        Microservices
                   (sink)          (sink)              (consumers)
```

**Debezium event shape (log-based, "envelope" format):**

| Field | Meaning |
|---|---|
| `before` | Row state before the change (null for inserts) |
| `after` | Row state after the change (null for deletes) |
| `op` | `c` = create / `u` = update / `d` = delete / `r` = snapshot read / `t` = truncate |
| `source` | DB / schema / table / LSN / GTID / timestamp metadata |
| `ts_ms` | Source-side commit time |
| `transaction` | Optional — transaction ID for cross-table grouping |

**Initial snapshot + live tail:**

| Phase | What happens |
|---|---|
| **Snapshot** | On connector first start, full table read → Kafka with `op: 'r'` |
| **Live tail** | Read WAL/binlog from snapshot offset onwards |
| **Resume** | Connector stores LSN/binlog position in Kafka offsets — restarts pick up where it left off |
| Modes | `initial`, `never`, `when_needed`, `incremental` (online resnapshot per table without restart) |

**PostgreSQL Debezium setup essentials:**

```sql
-- 1. Enable logical replication (requires restart)
ALTER SYSTEM SET wal_level = 'logical';
ALTER SYSTEM SET max_replication_slots = 10;
ALTER SYSTEM SET max_wal_senders = 10;

-- 2. Create replication slot
SELECT pg_create_logical_replication_slot('debezium', 'pgoutput');

-- 3. Publication for the tables to capture
CREATE PUBLICATION dbz_pub FOR ALL TABLES;
-- or specific:
CREATE PUBLICATION dbz_pub FOR TABLE orders, customers;

-- 4. Replication user
CREATE ROLE debezium WITH REPLICATION LOGIN PASSWORD '...';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO debezium;
```

| PG concept | Why it matters for CDC |
|---|---|
| **Replication slot** | Pins WAL retention until consumed — **leaks WAL if connector down** |
| **Publication** | Filters which tables flow through |
| **`REPLICA IDENTITY`** | Controls what `before` image contains — `DEFAULT` (PK only) / `FULL` (all cols) / `USING INDEX` |
| **`pgoutput`** | Native logical decoding plugin (no extra install) |

**MySQL Debezium setup:**

```ini
# my.cnf
log_bin = mysql-bin
binlog_format = ROW           # required
binlog_row_image = FULL       # capture full before+after
gtid_mode = ON                # recommended for resume
enforce_gtid_consistency = ON
```

| MySQL concept | Why |
|---|---|
| **`binlog_format=ROW`** | Statement-level loses semantics for non-deterministic queries |
| **GTID** | Stable position across failovers |
| **Server ID** | Connector identifies as a replica |

**Outbox pattern — the fix for dual-write:**

```
Single DB transaction:
  INSERT INTO orders ... ;
  INSERT INTO outbox (event_type, payload, aggregate_id) VALUES (...);
COMMIT;

Debezium tails outbox table → publishes to Kafka → outbox row deletable async
```

| Property | Effect |
|---|---|
| **Atomicity** | Business data and event live or die in the same transaction |
| **Ordering** | Events from one aggregate stay ordered (use aggregate_id as Kafka key) |
| **At-least-once** | Consumers must be idempotent — duplicates can occur on connector retry |
| **Outbox cleanup** | Periodic delete of consumed rows (or TTL via partitioning) |
| **Schema** | Typically: `id (uuid)`, `aggregate_type`, `aggregate_id`, `event_type`, `payload (jsonb)`, `created_at` |

**Why dual-write breaks (and outbox fixes):**

| Scenario | Dual-write outcome | Outbox outcome |
|---|---|---|
| App writes to DB, then crashes before publishing | DB has data, no event — silent inconsistency | Crash anywhere = nothing committed; CDC retries from WAL |
| Event bus down, DB up | App fails or data persists without event | Same: CDC reads from WAL when bus recovers |
| Network partition | Either side may miss | DB log is the source of truth — CDC eventually catches up |

**Schema evolution with CDC:**

| Change | Effect |
|---|---|
| Add column | Showing up in `after` from that point on |
| Drop column | Disappears from `after` — consumers must tolerate |
| Rename column | Looks like add + drop to consumers |
| Schema registry (Confluent / Apicurio) | Validates compatibility; rejects breaking changes |
| Avro / Protobuf serialization | Versioned schemas with compatibility rules (BACKWARD / FORWARD / FULL) |

**Operational concerns:**

| Concern | Detail |
|---|---|
| **Replication slot leakage** | Connector down → slot grows → WAL fills disk → DB outage. Monitor `pg_replication_slots.confirmed_flush_lsn` lag. |
| **Snapshot of huge tables** | Hours; can be split (`snapshot.select.statement.overrides`) or use **incremental snapshots** (Debezium 1.7+) |
| **Connector lag** | Monitor offset committed vs current WAL position |
| **Schema changes** | Some require connector restart or capture in `schema_changes` topic |
| **Heartbeats** | Connector emits a heartbeat to keep low-traffic tables' offset advancing |
| **Tombstones for compacted topics** | Delete events publish a null payload tombstone for log compaction |
| **Single message transforms (SMTs)** | Debezium-side filtering / routing / unwrapping (`UnwrapFromEnvelope` is common) |

**Kafka Connect — Debezium's home:**

| Concept | Detail |
|---|---|
| **Source connector** | DB → Kafka (Debezium) |
| **Sink connector** | Kafka → target (JDBC sink, ES sink, S3 sink, …) |
| **Distributed mode** | Multiple workers, leader election; required for HA |
| **Standalone mode** | Single process — dev only |
| **Tasks** | Connector-level partitioning (Debezium typically 1 task per source DB) |
| **Offsets topic** | Where Connect persists progress |

**Common consumers (sinks) and their pain points:**

| Consumer | Pattern | Watchpoints |
|---|---|---|
| Data warehouse | Apply changes to slowly-changing-dim or merge into fact | Late-arriving events; merge ordering |
| Elasticsearch | Index per type | Out-of-order can flip stale state back; use version-based optimistic concurrency |
| Cache invalidation | Drop key on event | Tombstones; reordered events causing stale resurrection |
| Materialized view in another service | Apply event → local read model | Idempotency on the consumer side |
| Audit log | Append all events to immutable store | Schema evolution; PII redaction |

**Anti-patterns and pitfalls:**

| Pitfall | Effect |
|---|---|
| Dual-write app → DB + event bus | Inconsistency on partial failure; use outbox |
| Polling-based CDC on a table with hard-deletes | Silently drops events |
| Forgetting `REPLICA IDENTITY FULL` (or unique index) on update-heavy tables | Updates without primary key fail |
| Replication slot left around after a failed connector | WAL grows; DB runs out of disk |
| One topic per DB instead of per table | Loss of partitioning by aggregate; coarse consumer filtering |
| Treating CDC events as canonical events | Couples consumers to the DB schema; consider transforming via outbox events instead |
| No idempotent consumer | Duplicates from retries cause double-effects |
| Ignoring out-of-order events | Stale state overwrites fresh state; use versioning |
| Snapshot during business hours | Locks / high read load; schedule off-peak or use incremental snapshot |

**When NOT to use CDC:**

| Scenario | Reason |
|---|---|
| Strong cross-service transactional integrity required | CDC is async — use 2PC / saga / synchronous calls |
| Source DB doesn't have a usable log (some embedded DBs, file stores) | Trigger-based or polling instead |
| You only need rare batch syncs | A daily ETL is simpler |
| The downstream wants a different event shape than the table | Use **outbox** so events match domain, not schema |

**Rule of thumb:** **log-based CDC (Debezium) is the default**; reach for trigger / polling only when the DB log isn't available. **Outbox pattern + Debezium** is the standard way to publish events from a service safely (atomic with the business write). **Monitor replication-slot lag** as carefully as you monitor disk space — they're the same risk. Consumers must be **idempotent** and **out-of-order tolerant**; CDC delivers at-least-once, not exactly-once.
