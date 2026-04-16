### PostgreSQL Architecture & Process Model

**Process architecture:**
```
Client connections
    ↓
[Postmaster] (main process, PID 1 of PG)
    ├── Backend Process (one per connection)
    ├── Backend Process (one per connection)
    ├── Backend Process (one per connection)
    ├── Background Writer (writes dirty pages to disk)
    ├── WAL Writer (flushes WAL buffers to disk)
    ├── Checkpointer (periodic full sync to disk)
    ├── Autovacuum Launcher → Autovacuum Workers
    ├── Stats Collector — PG ≤14 only; removed in PG 15+ (stats now in shared memory)
    └── WAL Sender (for replication)
```

**One process per connection:**
- Each client connection = one OS process (not a thread)
- Each process: ~5-10 MB memory
- 500 connections = 500 processes = ~5 GB just for connections
- This is why connection pooling (PgBouncer) is critical

**Shared memory:**
```
[Shared Buffers] — cache of data pages (most important setting)
  ├── shared_buffers = 25% of RAM (e.g., 4GB on 16GB server)
  ├── Pages read from disk are cached here
  └── Modified pages ("dirty") written back by Background Writer

[WAL Buffers] — buffer for WAL writes before flushing to disk
  └── wal_buffers — default -1 (auto: 1/32 of shared_buffers, capped at ~16 MB)
     Only raise for very high-write workloads with many concurrent commits.

[Lock Table] — tracks all current locks

[Proc Array] — info about active backends
```

**Key memory settings:**
| Setting | Purpose | Typical value |
|---------|---------|--------------|
| `shared_buffers` | Shared page cache | 25% of RAM |
| `work_mem` | Per-operation memory (sort, hash) — allocated PER sort/hash, NOT per query | 4-64 MB (default 4 MB); raise only with low max_connections |
| `maintenance_work_mem` | VACUUM, CREATE INDEX memory | 512 MB - 1 GB |
| `effective_cache_size` | Planner hint (total available cache) | 75% of RAM |
| `max_connections` | Max concurrent connections | 100-500 |

**Connection lifecycle:**
```
1. Client connects to port 5432
2. Postmaster accepts, forks a new backend process
3. Backend authenticates client (pg_hba.conf rules)
4. Backend handles all queries for this connection
5. Client disconnects → backend process exits

Problem: fork() per connection is expensive (~10ms)
Solution: connection pooling (PgBouncer, PgPool, RDS Proxy)
```

**Why max_connections should be low:**
```
max_connections = 200 (not 1000!)

Each connection:
  - 1 OS process (~5-10 MB)
  - work_mem allocated per sort/hash operation
  - Context switching overhead at high counts
  - 200 connections × 256 MB work_mem = 50 GB worst case

Better: 200 max_connections + PgBouncer (thousands of app connections pooled)
```

**Query execution flow:**
```
SQL query
  → Parser (syntax check → parse tree)
  → Rewriter (apply views, rules)
  → Planner/Optimizer (generate execution plan, choose indexes, join order)
  → Executor (run the plan, fetch pages, return results)
```

**Monitoring:**
```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;

-- Connection states
idle              — connected but not running a query
active            — currently executing a query
idle in transaction — in a transaction but not running a query (bad if long-lived)

-- Long-running queries
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND query_start < NOW() - INTERVAL '30 seconds';
```

**Rule of thumb:** PostgreSQL uses one process per connection — keep `max_connections` low (100-300) and use PgBouncer for pooling. Set `shared_buffers` to 25% of RAM. Monitor for `idle in transaction` connections (they hold locks and prevent VACUUM). Understand the process model to reason about memory usage and connection costs.
