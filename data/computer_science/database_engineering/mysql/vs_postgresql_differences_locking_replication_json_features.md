### MySQL vs PostgreSQL (Locking, Replication, JSON, Features)

**Architecture & MVCC:**

| Aspect | MySQL (InnoDB) | PostgreSQL |
|---|---|---|
| MVCC strategy | Undo log (old versions in undo tablespace) | Heap (old versions inline, dead tuples) |
| Vacuum | Automatic (undo log purge) | Required (`VACUUM`, autovacuum) |
| Storage | Clustered index (data ordered by PK) | Heap (insertion order) |
| Default isolation | REPEATABLE READ | READ COMMITTED |
| Transactional DDL | No — DDL auto-commits | Yes — `ALTER` inside `BEGIN..ROLLBACK` |
| License | GPL (Oracle) | PostgreSQL License |

**Locking:**

| Aspect | MySQL InnoDB | PostgreSQL |
|---|---|---|
| Row lock | Yes | Yes |
| **Gap locks** | Yes (next-key locks under REPEATABLE READ) — can block unrelated INSERTs | **No gap locks** |
| Phantom prevention | Next-key locks | SSI (Serializable Snapshot Isolation) at SERIALIZABLE |
| Advisory locks | None native | `pg_advisory_lock`, `pg_try_advisory_lock` |
| DDL impact | Online DDL (8.0+); pre-8.0 may block | Most DDL transactional; `ADD COLUMN DEFAULT` instant since PG 11 |

> **Gap-lock surprise:** `SELECT ... FOR UPDATE` on an indexed range in MySQL locks records *and* the gap around them — concurrent INSERTs into that gap block.

**Replication:**

| Aspect | MySQL | PostgreSQL |
|---|---|---|
| Mechanism | Binary log (statement / row / mixed) | WAL streaming |
| Replica type | Logical (replicas can have different indexes/triggers) | Physical (byte-exact) + logical (PG 10+) |
| HA topology | Group Replication / InnoDB Cluster | Streaming + tools (Patroni, repmgr) |
| Sync mode | Async default; semi-sync available | Async + synchronous_commit + quorum sync |
| Lag check | `SHOW REPLICA STATUS` → `Seconds_Behind_Source` | `pg_stat_replication`, `pg_wal_lsn_diff` |

**JSON / JSONB syntax:**

| Operation | MySQL `JSON` (5.7+) | PostgreSQL `JSONB` (9.4+) |
|---|---|---|
| Extract (JSON-typed) | `data->'$.key'` | `data->'key'` |
| Extract (text) | `data->>'$.key'` | `data->>'key'` |
| Deep path | `data->>'$.a.b'` | `data->'a'->>'b'` |
| Containment | `JSON_CONTAINS(data,'{"k":"v"}')` | `data @> '{"k":"v"}'` |
| Key exists | `JSON_CONTAINS_PATH(data,'one','$.k')` | `data ? 'k'` / `?\|` any / `?&` all |
| Path predicate | — | `data @@ '$.k == "v"'` (PG 12+) |
| Indexing | Virtual generated column + B-tree | `CREATE INDEX ... USING GIN(data)` indexes everything |
| Unnest array | `JSON_TABLE(...)` (8.0+) | `jsonb_array_elements(...)` |

**Feature parity (one-line cells):**

| Feature | MySQL | PostgreSQL |
|---|---|---|
| CTE (recursive) | 8.0+ | Long-supported, writable |
| Window functions | 8.0+ | Long-supported, richer set |
| Full-text search | InnoDB FTS | `tsvector` / `tsquery` (more powerful) |
| Geospatial | Basic spatial index | PostGIS (industry standard) |
| Partitioning | RANGE / LIST / HASH / KEY | RANGE / LIST / HASH + declarative |
| Arrays | None | Native + operators |
| Custom types | `ENUM` (int-backed) | `CREATE TYPE` (real types) |
| Generated cols | VIRTUAL + STORED | STORED only |
| Upsert | `INSERT ... ON DUPLICATE KEY UPDATE` | `INSERT ... ON CONFLICT DO UPDATE` |
| `RETURNING` | No (`LAST_INSERT_ID()`) | Yes on INSERT/UPDATE/DELETE |
| Materialized views | No (DIY via triggers/cron) | Native + `REFRESH MATERIALIZED VIEW` |
| CHECK constraints | 8.0.16+ (silently ignored before) | Long-supported |
| Partial indexes | No | Yes (`WHERE` on index) |
| Extensions | Limited plugin API | Rich (PostGIS, pg_trgm, citext, hstore, ...) |

**Rails / ActiveRecord gotchas:**

| Behavior | MySQL | PostgreSQL |
|---|---|---|
| Default case-sensitivity | Collation-driven (often case-insensitive) | Case-sensitive — use `LOWER()` or `citext` |
| Encoding for emoji | Must use `utf8mb4` (4-byte UTF-8) | `unicode` works out of the box |
| Array columns | Not available | `add_column :tags, :string, array: true` |
| `GROUP BY` strictness | Lenient (non-standard) | Strict — all non-aggregated cols required |
| Adapter gem | `mysql2` | `pg` |

**Decision matrix:**

| Use case | Lean toward |
|---|---|
| Team already deep on MySQL, simple CRUD, broad hosting | MySQL |
| Read replica with different indexes than primary | MySQL (logical binlog) |
| Complex analytical queries (CTEs, window fns, JSONB) | PostgreSQL |
| Schema migrations rolled back inside a transaction | PostgreSQL |
| Geospatial workloads | PostgreSQL (PostGIS) |
| Need partial indexes / materialized views / arrays | PostgreSQL |
| Standards compliance is a hard requirement | PostgreSQL |

**Rule of thumb:** PostgreSQL has more features and stricter standards compliance; MySQL is simpler with wider hosting. The two ambushes that bite people coming from PG to MySQL are **gap locks** under REPEATABLE READ and **silent truncation** of strings/numbers; coming from MySQL to PG, it's **case sensitivity** and `VACUUM` discipline.
