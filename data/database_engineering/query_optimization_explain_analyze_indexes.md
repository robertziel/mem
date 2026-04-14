### Query Optimization

**EXPLAIN ANALYZE (PostgreSQL):**
```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders WHERE user_id = 123 AND status = 'pending';
```

**Reading EXPLAIN output (key things to look for):**
- **Seq Scan** - full table scan (usually bad on large tables)
- **Index Scan** - using an index (good)
- **Index Only Scan** - all data from index, no table access (best)
- **Bitmap Index Scan** - index for filtering, then table access
- **Nested Loop / Hash Join / Merge Join** - join strategies
- **actual time** - real execution time in ms
- **rows** - actual rows vs estimated (bad estimate = outdated stats)

**Index types:**
| Type | Use case | Example |
|------|----------|---------|
| B-tree | Default, equality, range, sorting | `WHERE id = 5`, `WHERE date > X` |
| Hash | Equality only | `WHERE email = 'x'` |
| GIN | Full-text search, JSONB, arrays | `WHERE tags @> '{ruby}'` |
| GiST | Geometric, range, nearest-neighbor | PostGIS, range types |
| BRIN | Large sequential data (time-series) | `WHERE created_at > X` on append-only |

**Covering index (index-only scan):**
```sql
-- Include columns to avoid table lookup
CREATE INDEX idx_orders_user_status ON orders(user_id, status) INCLUDE (total);
-- Query can be served entirely from index
SELECT total FROM orders WHERE user_id = 123 AND status = 'pending';
```

**Composite index order matters:**
```sql
-- Index on (user_id, status, created_at)
WHERE user_id = 123                           -- uses index
WHERE user_id = 123 AND status = 'pending'    -- uses index
WHERE status = 'pending'                       -- does NOT use index (leftmost prefix rule)
WHERE user_id = 123 AND created_at > '2024-01-01'  -- partially uses index
```

**Partial index:**
```sql
-- Index only active orders (smaller index, faster)
CREATE INDEX idx_active_orders ON orders(user_id) WHERE status = 'pending';
```

**Common anti-patterns:**
```sql
-- Function on indexed column prevents index use
WHERE LOWER(email) = 'user@example.com'   -- BAD
WHERE email = 'user@example.com'          -- GOOD (store lowercase)
-- Or use expression index: CREATE INDEX idx_email ON users(LOWER(email));

-- SELECT * when you only need a few columns
SELECT * FROM orders WHERE ...             -- BAD (fetches all columns)
SELECT id, total FROM orders WHERE ...     -- GOOD

-- N+1 queries
users.each { |u| u.orders.count }          -- BAD (N+1 queries)
User.includes(:orders).all                 -- GOOD (eager loading)

-- Missing LIMIT on unbounded queries
SELECT * FROM logs WHERE level = 'error'   -- BAD (could return millions)
SELECT * FROM logs WHERE level = 'error' LIMIT 100  -- GOOD
```

**Materialized views:**
```sql
CREATE MATERIALIZED VIEW daily_stats AS
  SELECT date_trunc('day', created_at) AS day, COUNT(*), SUM(total)
  FROM orders GROUP BY 1;

REFRESH MATERIALIZED VIEW CONCURRENTLY daily_stats;
```
- Pre-computed query results, stored as a table
- Fast reads, but data is stale until refreshed
- Use for: dashboards, reports, expensive aggregations

**pg_stat_statements (find slow queries):**
```sql
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC LIMIT 20;
```

**Rule of thumb:** Always EXPLAIN ANALYZE slow queries. Index columns used in WHERE, JOIN, ORDER BY. Composite index order follows the leftmost prefix rule. Use partial indexes for filtered subsets. Monitor with pg_stat_statements. Avoid SELECT * and N+1.
