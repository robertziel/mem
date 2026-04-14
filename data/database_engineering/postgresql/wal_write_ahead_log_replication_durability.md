### PostgreSQL WAL (Write-Ahead Log)

**What WAL does:**
- Every data change is written to WAL BEFORE the actual data files
- Guarantees durability: if crash occurs, replay WAL to recover
- Foundation of: crash recovery, replication, point-in-time recovery, CDC

**How WAL works:**
```
1. Transaction: UPDATE users SET name = 'Bob' WHERE id = 1
2. Write change to WAL (sequential write, fast)
3. Acknowledge to client: "committed"
4. Later: checkpoint flushes actual data pages to disk (background)

Crash recovery:
  → Read WAL from last checkpoint → replay changes → data consistent
```

**WAL segments:**
- WAL is a stream of 16 MB files (segments): `000000010000000000000001`
- Stored in `pg_wal/` directory
- Old segments recycled after checkpoint + replication caught up

**Key WAL settings:**
```
wal_level = replica        # minimal, replica, or logical
  minimal: crash recovery only
  replica: + streaming replication (standard for production)
  logical: + logical replication, CDC (Debezium)

max_wal_size = 1GB         # trigger checkpoint after this much WAL
min_wal_size = 80MB        # keep at least this much WAL
checkpoint_timeout = 5min  # max time between checkpoints
```

**WAL for replication:**
```
Primary:  writes WAL → ships WAL segments → Replica receives and replays

Streaming replication: real-time WAL streaming over network (continuous)
WAL archiving: copy WAL segments to S3/NFS for PITR (point-in-time recovery)
```

**WAL for point-in-time recovery (PITR):**
```
Base backup (pg_basebackup) + WAL archive
  → Restore base backup
  → Replay WAL up to specific timestamp
  → Database restored to exact moment before disaster

recovery_target_time = '2024-01-15 10:30:00'
```

**Logical replication (WAL-based):**
```sql
-- Publisher (source)
CREATE PUBLICATION my_pub FOR TABLE users, orders;

-- Subscriber (destination)
CREATE SUBSCRIPTION my_sub
  CONNECTION 'host=primary dbname=mydb'
  PUBLICATION my_pub;

-- Changes to users/orders on publisher → automatically replicated to subscriber
-- Uses logical decoding of WAL (not physical WAL shipping)
```

**WAL and Debezium (CDC):**
```
PostgreSQL WAL (logical) → Debezium → Kafka → downstream consumers
  wal_level = logical
  + logical replication slot
  + publication for tables
```

**Rule of thumb:** WAL is how PostgreSQL guarantees durability and enables replication. Set `wal_level=replica` for production (or `logical` for CDC). Monitor WAL size and checkpoint frequency. WAL archiving + base backups = point-in-time recovery. Debezium reads WAL for real-time CDC.
