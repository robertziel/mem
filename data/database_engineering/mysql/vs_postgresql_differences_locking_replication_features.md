### MySQL vs PostgreSQL Differences (Locking, Replication, JSON, Features)

**Architecture & Philosophy:**

| Aspect | MySQL (InnoDB) | PostgreSQL |
|--------|---------------|------------|
| Core design | Simple, fast, widely deployed | Feature-rich, standards-compliant |
| MVCC | Undo log (old row versions in undo space) | Heap-based (old versions in same table) |
| Vacuum | Not needed (undo log purged automatically) | Required (VACUUM removes dead tuples) |
| Storage | Clustered index (data in PK order) | Heap (data in insertion order) |
| Default isolation | REPEATABLE READ | READ COMMITTED |
| License | GPL (Oracle-owned) | PostgreSQL License (truly open) |

**Locking differences:**

```sql
-- MySQL InnoDB: row-level locking with gap locks
-- Default REPEATABLE READ uses next-key locks (record + gap)
-- Prevents phantom reads but can cause unexpected lock waits

-- MySQL gap lock example:
-- Index on status: ['active', 'completed', 'pending']
SELECT * FROM orders WHERE status = 'completed' FOR UPDATE;
-- Locks the record AND the gap before/after it
-- Blocks INSERT of status between 'active' and 'pending'

-- PostgreSQL: row-level locking, NO gap locks
-- Uses SSI (Serializable Snapshot Isolation) for SERIALIZABLE level
-- Less prone to unexpected lock contention
-- Advisory locks for application-level locking:
SELECT pg_advisory_lock(12345);      -- session-level
SELECT pg_try_advisory_lock(12345);  -- non-blocking
```

```sql
-- MySQL: implicit table locks on DDL (until 8.0 Online DDL)
ALTER TABLE orders ADD COLUMN new_col INT;  -- may block reads/writes

-- PostgreSQL: most DDL is transactional
BEGIN;
ALTER TABLE orders ADD COLUMN new_col INT;
-- Can be rolled back if something goes wrong!
ROLLBACK;

-- PostgreSQL: ADD COLUMN with DEFAULT is instant (PG 11+)
-- MySQL: ADD COLUMN may rebuild table (depends on operation)
```

**Replication:**

```sql
-- MySQL: binary log (binlog) replication
-- Modes: statement-based, row-based (default), mixed
-- Built-in async replication, semi-sync available
-- Group Replication / InnoDB Cluster for HA
-- Primary → Replica topology (simple, well-understood)

-- MySQL replication lag monitoring:
SHOW SLAVE STATUS\G  -- Seconds_Behind_Master

-- PostgreSQL: WAL-based streaming replication
-- Physical replication (byte-level copy — identical replicas)
-- Logical replication (table-level, selective, cross-version)
-- Synchronous replication built-in
-- pg_stat_replication for monitoring

-- Key difference:
-- MySQL replicas can have different indexes, triggers (logical)
-- PostgreSQL physical replicas are exact copies (can't differ)
-- PostgreSQL logical replication (PG 10+) allows selective table replication
```

**JSON support:**

```sql
-- MySQL JSON (5.7+):
CREATE TABLE events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  data JSON NOT NULL
);
INSERT INTO events (data) VALUES ('{"type": "click", "page": "/home"}');

-- MySQL JSON query:
SELECT data->'$.type' FROM events;                    -- returns '"click"' (with quotes)
SELECT data->>'$.type' FROM events;                   -- returns 'click' (unquoted)
SELECT * FROM events WHERE data->>'$.type' = 'click';
SELECT JSON_EXTRACT(data, '$.page') FROM events;

-- MySQL JSON index (virtual generated column):
ALTER TABLE events ADD COLUMN event_type VARCHAR(50)
  GENERATED ALWAYS AS (data->>'$.type') VIRTUAL;
CREATE INDEX idx_event_type ON events(event_type);

-- MySQL: JSON_TABLE to unnest JSON arrays into rows (8.0+)
SELECT * FROM events,
  JSON_TABLE(data, '$.tags[*]' COLUMNS (tag VARCHAR(50) PATH '$')) AS tags;


-- PostgreSQL JSONB (9.4+) — binary, indexable, more operators:
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  data JSONB NOT NULL
);

-- PostgreSQL JSON query (richer operators):
SELECT data->>'type' FROM events;                     -- text extraction
SELECT data->'nested'->>'field' FROM events;          -- deep access
SELECT * FROM events WHERE data @> '{"type": "click"}';  -- containment
SELECT * FROM events WHERE data ? 'type';             -- key exists
SELECT * FROM events WHERE data ?| array['type','page']; -- any key exists
SELECT * FROM events WHERE data ?& array['type','page']; -- all keys exist

-- PostgreSQL GIN index on entire JSONB (indexes ALL keys and values):
CREATE INDEX idx_events_data ON events USING GIN (data);
-- Now data @> '{"type": "click"}' uses the index automatically
-- No generated column needed!

-- PostgreSQL JSON path queries (PG 12+):
SELECT * FROM events WHERE data @@ '$.type == "click"';
```

**Feature comparison:**

| Feature | MySQL | PostgreSQL |
|---------|-------|------------|
| **CTEs (WITH)** | 8.0+ (non-recursive + recursive) | Long-supported, writable CTEs |
| **Window functions** | 8.0+ | Long-supported, more functions |
| **JSONB** | JSON type (5.7+), less indexable | JSONB with GIN indexes, rich operators |
| **Full-text search** | Built-in (InnoDB FTS) | Built-in (tsvector, tsquery) — more powerful |
| **Geospatial** | Basic (spatial index) | PostGIS extension (industry standard) |
| **Partitioning** | RANGE, LIST, HASH, KEY | RANGE, LIST, HASH + declarative (PG 10+) |
| **Enums** | ENUM type (stored as integer) | CREATE TYPE (true custom types) |
| **Arrays** | No native arrays | Native array type with operators |
| **Generated columns** | VIRTUAL and STORED | STORED only (no virtual) |
| **Upsert** | INSERT ... ON DUPLICATE KEY UPDATE | INSERT ... ON CONFLICT DO UPDATE |
| **RETURNING** | Not supported (need LAST_INSERT_ID()) | RETURNING clause on INSERT/UPDATE/DELETE |
| **Transactional DDL** | No (DDL auto-commits) | Yes (ALTER TABLE in transactions) |
| **Materialized views** | No (use triggers/cron to refresh) | Native MATERIALIZED VIEW + REFRESH |
| **Extensions** | Limited plugin API | Rich extensions (PostGIS, pg_trgm, etc.) |
| **CHECK constraints** | 8.0.16+ (ignored before!) | Long-supported |
| **Partial indexes** | No | Yes (WHERE clause on index) |

**Practical differences in Ruby/Rails:**

```ruby
# MySQL adapter
# Gemfile
gem 'mysql2'

# config/database.yml
production:
  adapter: mysql2
  encoding: utf8mb4       # ← important for emoji support
  collation: utf8mb4_unicode_ci
  pool: 25
  host: db.example.com

# PostgreSQL adapter
gem 'pg'

production:
  adapter: postgresql
  encoding: unicode
  pool: 25


# ActiveRecord differences:

# MySQL: case-insensitive by default (depends on collation)
User.where(email: "Jan@Example.com")  # matches "jan@example.com" in MySQL
# PostgreSQL: case-sensitive by default
User.where("LOWER(email) = ?", email.downcase)  # or use citext extension

# MySQL: no array columns
# PostgreSQL:
add_column :users, :tags, :string, array: true, default: []
User.where("'ruby' = ANY(tags)")

# MySQL: LIMIT + OFFSET for pagination (both support this)
# PostgreSQL: also supports cursor-based with DECLARE CURSOR

# MySQL: GROUP BY is more lenient (non-standard)
# PostgreSQL: strict — all non-aggregated columns must be in GROUP BY
```

**When to choose MySQL:**
- Team already knows MySQL well
- Simple read-heavy workloads
- Many existing tools and hosting options
- Need easy primary-replica setup
- Application uses MySQL-specific features (e.g., existing codebase)

**When to choose PostgreSQL:**
- Complex queries (CTEs, window functions, JSONB)
- Need transactional DDL (safer migrations)
- Geospatial data (PostGIS)
- Advanced data types (arrays, hstore, JSONB)
- Need partial indexes, materialized views
- Prefer standards compliance

**Rule of thumb:** PostgreSQL has more features and better standards compliance. MySQL is simpler, has wider hosting support, and is adequate for most CRUD apps. In a Rails app with both MySQL and MongoDB (like the target project), MySQL handles structured relational data, MongoDB handles flexible/document data. Know the locking model differences — MySQL's gap locks can surprise you if you're used to PostgreSQL.
