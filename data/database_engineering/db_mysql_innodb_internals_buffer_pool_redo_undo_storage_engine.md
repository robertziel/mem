### MySQL InnoDB Internals (Storage Engine, Buffer Pool, Redo/Undo Logs)

**InnoDB is MySQL's default storage engine** (since 5.5). It provides ACID transactions, row-level locking, and crash recovery.

**Architecture overview:**
```
┌─────────────────────────────────────────────┐
│              MySQL Server Layer              │
│  (Parser, Optimizer, Query Cache, Executor)  │
└─────────────────┬───────────────────────────┘
                  │  Storage Engine API
┌─────────────────▼───────────────────────────┐
│              InnoDB Engine                    │
│  ┌──────────────────────────────────────┐   │
│  │        Buffer Pool (in RAM)           │   │
│  │  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │Data Pages│  │ Change Buffer     │  │   │
│  │  └──────────┘  └──────────────────┘  │   │
│  │  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │Index Pages│ │ Adaptive Hash Idx │  │   │
│  │  └──────────┘  └──────────────────┘  │   │
│  └──────────────────────────────────────┘   │
│  ┌────────────┐  ┌────────────────────────┐ │
│  │ Redo Log   │  │ Undo Log (Tablespace)  │ │
│  │ (WAL)      │  │ (MVCC snapshots)       │ │
│  └────────────┘  └────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │ Tablespace Files (.ibd) — data on disk │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Buffer Pool — the most important component:**
```sql
-- InnoDB's in-memory cache for data and index pages
-- Ideally 70-80% of available RAM on a dedicated DB server
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
SET GLOBAL innodb_buffer_pool_size = 8 * 1024 * 1024 * 1024;  -- 8GB

-- Uses LRU (Least Recently Used) with midpoint insertion
-- New pages inserted at 3/8 from the head (not the tail)
-- Prevents full table scans from flushing hot pages

-- Multiple instances for concurrency (reduces mutex contention)
SET GLOBAL innodb_buffer_pool_instances = 8;  -- 1 per GB recommended

-- Monitor hit rate (should be > 99%)
SHOW STATUS LIKE 'Innodb_buffer_pool_read_requests';  -- logical reads (from buffer)
SHOW STATUS LIKE 'Innodb_buffer_pool_reads';           -- physical reads (from disk)
-- Hit rate = 1 - (reads / read_requests)
```

**Page structure:**
```
- InnoDB stores data in 16KB pages (default)
- Pages contain rows of data or index entries
- Related pages form extents (64 consecutive pages = 1MB)
- Extents grouped into segments, segments into tablespaces
- Each table has its own tablespace file (.ibd) — innodb_file_per_table=ON

Page types:
- Data pages    — actual row data (clustered index leaf pages)
- Index pages   — secondary index entries
- Undo pages    — old row versions for MVCC
- System pages  — metadata, transaction system
```

**Clustered Index (Primary Key):**
```sql
-- InnoDB stores data in B+tree ordered by primary key
-- The leaf nodes of the clustered index ARE the actual data rows
-- This is why PK choice matters enormously

-- ✅ GOOD: Auto-increment integer PK
CREATE TABLE orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,  -- sequential, compact
  ...
);
-- Sequential inserts → appends to end → no page splits

-- ❌ BAD: UUID as PK
CREATE TABLE orders (
  id CHAR(36) PRIMARY KEY,  -- random → inserts all over the tree → page splits
  ...                        -- 36 bytes vs 8 bytes → larger indexes
);

-- If you need UUIDs, use UUID_TO_BIN with swap flag (MySQL 8.0+)
CREATE TABLE orders (
  id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID(), 1)),
  -- swap_flag=1 rearranges time bits for sequential ordering
);

-- Secondary indexes store the PK value (not row pointer)
-- So a large PK = larger secondary indexes
-- Every secondary index lookup does: secondary index → get PK → clustered index lookup
```

**Redo Log (Write-Ahead Log / WAL):**
```sql
-- Ensures crash recovery / durability
-- Every change is written to redo log BEFORE data pages on disk
-- On crash: replay redo log to recover committed transactions

-- Flow:
-- 1. Modify page in buffer pool (in memory)
-- 2. Write change record to redo log buffer
-- 3. Flush redo log to disk (on commit)
-- 4. Eventually flush dirty pages to tablespace (checkpoint)

SHOW VARIABLES LIKE 'innodb_log_file_size';      -- size per log file
SHOW VARIABLES LIKE 'innodb_log_files_in_group';  -- number of log files (circular)
-- MySQL 8.0.30+: innodb_redo_log_capacity replaces both

-- innodb_flush_log_at_trx_commit (critical for durability vs performance):
-- 1 (default): flush to disk on every commit — safest, ACID compliant
-- 2: write to OS buffer on commit, flush every 1 sec — lose max 1 sec on crash
-- 0: write to log buffer only, flush every 1 sec — fastest, least safe
```

**Undo Log (MVCC and Rollback):**
```sql
-- Stores old versions of rows for:
-- 1. Transaction rollback (undo changes)
-- 2. MVCC (Multi-Version Concurrency Control) — consistent reads

-- When a row is updated:
-- 1. Old version saved in undo log
-- 2. New version written to data page
-- 3. Row has hidden pointer to undo log entry (rollback pointer)

-- MVCC: readers see a consistent snapshot without locking writers
-- Each row has hidden fields: DB_TRX_ID (last transaction), DB_ROLL_PTR (undo pointer)
-- Read queries follow the undo chain to find the version visible to their snapshot

-- Long-running transactions prevent undo log cleanup → undo log bloat
SHOW STATUS LIKE 'Innodb_history_list_length';  -- should be low (< 1000)
-- High value = long transactions preventing purge
```

**Doublewrite Buffer:**
```sql
-- Protects against partial page writes (torn pages)
-- Before writing a page to its tablespace, InnoDB writes it to doublewrite buffer
-- If crash during page write → recover from doublewrite buffer
-- Small performance cost (~5-10%) but critical for data integrity
SHOW VARIABLES LIKE 'innodb_doublewrite';  -- ON by default
```

**Change Buffer:**
```sql
-- Caches changes to secondary indexes when affected pages are not in buffer pool
-- Merges changes later when pages are read into buffer pool
-- Reduces random disk I/O for write-heavy workloads
-- Only for non-unique secondary indexes (unique indexes must check for duplicates)
SHOW VARIABLES LIKE 'innodb_change_buffer_max_size';  -- % of buffer pool (default 25)
```

**Row formats:**
```sql
-- DYNAMIC (default, MySQL 5.7+): variable-length columns stored off-page if too large
-- COMPACT: similar but older format
-- COMPRESSED: compresses data and indexes (saves disk, costs CPU)
-- REDUNDANT: legacy, avoid

ALTER TABLE orders ROW_FORMAT=DYNAMIC;

-- For large TEXT/BLOB columns:
-- DYNAMIC stores only 20-byte pointer in-page, data off-page
-- Keeps data pages compact → more rows per page → better buffer pool efficiency
```

**Locking in InnoDB:**
```sql
-- Row-level locking (not table-level like MyISAM)
-- Lock types:
-- Shared (S): allows concurrent reads
-- Exclusive (X): blocks other reads and writes
-- Intent locks: table-level signals for row-level locking

-- Gap locks: lock the "gap" between index records (prevents phantom reads)
-- Next-key locks: record lock + gap lock (default in REPEATABLE READ)

-- Deadlock detection is automatic — InnoDB rolls back the cheaper transaction
SHOW ENGINE INNODB STATUS\G  -- check for deadlocks in LATEST DETECTED DEADLOCK section

-- Reduce deadlocks:
-- 1. Keep transactions short
-- 2. Access tables in consistent order
-- 3. Use appropriate indexes (avoids lock escalation)
-- 4. Use READ COMMITTED if phantom reads are acceptable
```

**Key monitoring queries:**
```sql
-- Buffer pool status
SHOW ENGINE INNODB STATUS\G

-- Buffer pool hit rate
SELECT
  (1 - (Innodb_buffer_pool_reads / Innodb_buffer_pool_read_requests)) * 100 AS hit_rate
FROM (
  SELECT
    VARIABLE_VALUE AS Innodb_buffer_pool_reads
  FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_reads'
) a, (
  SELECT
    VARIABLE_VALUE AS Innodb_buffer_pool_read_requests
  FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_read_requests'
) b;

-- Redo log usage
SHOW STATUS LIKE 'Innodb_log_waits';  -- > 0 means log buffer too small

-- Transaction history
SHOW STATUS LIKE 'Innodb_history_list_length';
```

**Rule of thumb:** Set buffer pool to 70-80% of RAM on dedicated servers. Use auto-increment BIGINT PKs (not UUIDs). Keep transactions short to avoid undo log bloat. Monitor buffer pool hit rate (> 99%). Use `innodb_flush_log_at_trx_commit=1` for durability, `=2` only if you accept 1-sec data loss risk. Check `SHOW ENGINE INNODB STATUS` regularly for deadlocks and performance issues.
