### MySQL Query Optimization (EXPLAIN, Indexes, Slow Query Log)

**EXPLAIN — understand how MySQL executes your query:**
```sql
EXPLAIN SELECT * FROM orders WHERE status = 'completed' AND total > 100 ORDER BY created_at DESC;

-- Key columns:
-- id:            query step number
-- select_type:   SIMPLE, SUBQUERY, DERIVED, UNION
-- table:         table being accessed
-- type:          access method (most important, see below)
-- possible_keys: indexes MySQL considered
-- key:           index actually chosen
-- key_len:       bytes of index used (longer = more columns used)
-- rows:          estimated rows to examine
-- filtered:      % of rows matching condition after index
-- Extra:         additional info (see below)

EXPLAIN FORMAT=JSON SELECT ...;    -- detailed JSON with cost estimates
EXPLAIN ANALYZE SELECT ...;        -- MySQL 8.0+ — actual execution stats
```

**Access types (type column, best to worst):**

| Type | Meaning | Performance |
|------|---------|-------------|
| system | Single-row table | Best |
| const | PK or unique index, single row | Excellent |
| eq_ref | One row per join (PK/unique) | Excellent |
| ref | Non-unique index, matching rows | Good |
| range | Index range scan (BETWEEN, >, <, IN) | Good |
| index | Full index scan (reads all index entries) | Moderate |
| ALL | Full table scan | Worst — needs index! |

**Extra column — watch for these:**
```sql
-- ✅ GOOD:
-- "Using index"         — covered by index, no table access needed
-- "Using index condition" — Index Condition Pushdown (ICP)

-- ⚠️ WARNING:
-- "Using filesort"      — sorting not handled by index (may be slow for large sets)
-- "Using temporary"     — temp table needed (GROUP BY, DISTINCT, UNION)
-- "Using where"         — rows filtered after reading (index not fully utilized)

-- ❌ BAD:
-- "Using join buffer"   — no index for join condition
-- "Full scan on NULL key" — subquery doing full scan
```

**Index strategies:**

```sql
-- Compound index — follow the leftmost prefix rule
CREATE INDEX idx_orders_status_date ON orders(status, created_at);

-- ✅ Uses index:
WHERE status = 'completed'                                    -- prefix match
WHERE status = 'completed' AND created_at > '2025-01-01'     -- both columns
WHERE status = 'completed' ORDER BY created_at DESC           -- equality + sort
WHERE status IN ('completed', 'shipped')                      -- range on first col

-- ❌ Cannot use this index:
WHERE created_at > '2025-01-01'                -- skips first column
ORDER BY created_at                            -- no equality filter on status
WHERE status != 'cancelled'                    -- inequality less effective
WHERE YEAR(created_at) = 2025                  -- function on indexed column

-- Covering index — includes all columns the query needs
CREATE INDEX idx_covering ON orders(status, created_at, total, customer_id);
-- Query that only reads these columns never touches the table (Using index)
SELECT total, customer_id FROM orders WHERE status = 'completed' ORDER BY created_at;
```

**Common optimization patterns:**

```sql
-- 1. Avoid functions on indexed columns
-- ❌ WHERE YEAR(created_at) = 2025
-- ✅ WHERE created_at >= '2025-01-01' AND created_at < '2026-01-01'

-- ❌ WHERE LOWER(email) = 'jan@example.com'
-- ✅ Store pre-lowered, or use generated column:
ALTER TABLE users ADD email_lower VARCHAR(255) GENERATED ALWAYS AS (LOWER(email)) STORED;
CREATE INDEX idx_email_lower ON users(email_lower);

-- 2. Use EXISTS instead of IN for large subqueries
-- ❌ WHERE id IN (SELECT order_id FROM huge_table WHERE ...)
-- ✅ WHERE EXISTS (SELECT 1 FROM huge_table WHERE huge_table.order_id = orders.id AND ...)

-- 3. Avoid SELECT * — fetch only needed columns
-- ❌ SELECT * FROM orders WHERE status = 'completed';
-- ✅ SELECT id, total, created_at FROM orders WHERE status = 'completed';

-- 4. Limit offset performance — use keyset pagination
-- ❌ SLOW for large offsets:
SELECT * FROM orders ORDER BY id LIMIT 1000000, 20;  -- scans 1M rows then skips

-- ✅ Keyset pagination (cursor-based):
SELECT * FROM orders WHERE id > 1000000 ORDER BY id LIMIT 20;  -- seeks to position

-- 5. JOIN optimization
-- Ensure JOIN columns are indexed and same type/collation
-- ❌ JOIN on VARCHAR(255) = VARCHAR(100) — type mismatch
-- ✅ Both columns same type, indexed, same charset/collation

-- 6. Force index hint (use sparingly)
SELECT * FROM orders FORCE INDEX (idx_status_date)
WHERE status = 'completed' AND total > 100;
```

**Slow query log:**
```sql
-- Enable slow query logging
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;           -- log queries > 1 second
SET GLOBAL log_queries_not_using_indexes = 'ON';  -- also log no-index queries
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';

SHOW VARIABLES LIKE 'slow_query%';
SHOW VARIABLES LIKE 'long_query_time';
```

```bash
# Analyze slow query log with mysqldumpslow
mysqldumpslow -s t -t 10 /var/log/mysql/slow.log    # top 10 by time
mysqldumpslow -s c -t 10 /var/log/mysql/slow.log    # top 10 by count

# Or use pt-query-digest (Percona Toolkit — more detailed)
pt-query-digest /var/log/mysql/slow.log
```

**Performance Schema — real-time query stats:**
```sql
-- Top queries by total execution time
SELECT
  DIGEST_TEXT,
  COUNT_STAR AS exec_count,
  ROUND(SUM_TIMER_WAIT / 1000000000000, 2) AS total_sec,
  ROUND(AVG_TIMER_WAIT / 1000000000000, 4) AS avg_sec,
  SUM_ROWS_EXAMINED,
  SUM_ROWS_SENT
FROM performance_schema.events_statements_summary_by_digest
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;

-- Find queries doing full table scans
SELECT * FROM performance_schema.events_statements_summary_by_digest
WHERE SUM_NO_INDEX_USED > 0 OR SUM_NO_GOOD_INDEX_USED > 0
ORDER BY SUM_TIMER_WAIT DESC LIMIT 10;
```

**Index management:**
```sql
-- Show indexes on a table
SHOW INDEX FROM orders;

-- Check index usage (MySQL 8.0+ sys schema)
SELECT * FROM sys.schema_unused_indexes;     -- indexes never used
SELECT * FROM sys.schema_redundant_indexes;  -- redundant indexes (subset of another)

-- Table and index sizes
SELECT
  table_name,
  ROUND(data_length / 1024 / 1024, 2) AS data_mb,
  ROUND(index_length / 1024 / 1024, 2) AS index_mb,
  table_rows
FROM information_schema.tables
WHERE table_schema = 'mydb'
ORDER BY data_length + index_length DESC;

-- Online DDL — add index without blocking writes (MySQL 5.6+)
ALTER TABLE orders ADD INDEX idx_customer (customer_id), ALGORITHM=INPLACE, LOCK=NONE;
```

**Optimizer hints (MySQL 8.0+):**
```sql
-- Hint to use specific index
SELECT /*+ INDEX(orders idx_status_date) */ * FROM orders WHERE ...;

-- Hint to skip specific index
SELECT /*+ NO_INDEX(orders idx_old) */ * FROM orders WHERE ...;

-- Set join order
SELECT /*+ JOIN_ORDER(orders, customers) */ * FROM orders JOIN customers ...;

-- Limit query execution time (ms)
SELECT /*+ MAX_EXECUTION_TIME(5000) */ * FROM orders WHERE ...;
```

**Quick tuning checklist:**
```sql
-- 1. Check for full table scans
EXPLAIN your_query;  -- look for type=ALL

-- 2. Add missing indexes based on WHERE, JOIN, ORDER BY columns

-- 3. Check index selectivity (cardinality)
SHOW INDEX FROM orders;  -- Cardinality column
-- Low cardinality (e.g., status with 3 values) = less useful as first index column
-- High cardinality (e.g., email, user_id) = good index candidate

-- 4. Check for implicit type conversions
-- ❌ WHERE varchar_col = 123  — number compared to string, no index used
-- ✅ WHERE varchar_col = '123'

-- 5. ANALYZE TABLE after bulk operations
ANALYZE TABLE orders;  -- updates index statistics for optimizer
```

**Rule of thumb:** Every slow query starts with EXPLAIN. Look for `type=ALL` and `Using filesort/temporary`. Index columns in WHERE (equality first), then ORDER BY. Use covering indexes for hot queries. Enable slow query log in production. Use keyset pagination for large datasets. Run `ANALYZE TABLE` after bulk data changes. Check `sys.schema_unused_indexes` to remove dead indexes.
