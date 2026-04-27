### Query Optimization (EXPLAIN ANALYZE, Indexes, Anti-patterns)

**Read an `EXPLAIN ANALYZE` plan in 30 seconds:**

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT ... ;
```

| Token in plan | Meaning |
|---|---|
| `Seq Scan` | Full table scan — bad on big tables, fine on tiny ones |
| `Index Scan` | Walked the index then fetched rows |
| `Index Only Scan` | **Best** — answered entirely from the index, no heap visit |
| `Bitmap Index Scan` + `Bitmap Heap Scan` | Combined many index hits into a bitmap, then fetched matching rows |
| `Nested Loop` | One side small, indexed lookup on the other |
| `Hash Join` | Builds in-memory hash on one side; good for medium / large w/o useful index |
| `Merge Join` | Both sides pre-sorted; great for big sorted ranges |
| `actual time=… rows=…` | What really happened |
| `(cost=…)` (no `actual`) | Planner estimate — discrepancy with actual = stale stats / bad estimate |
| `Buffers: shared hit=…` | Pages from cache (`hit`) vs disk (`read`) |
| `Rows Removed by Filter` | Read rows then discarded — push the filter into the index instead |

**Smell test — when to dig deeper:**

| Smell | Likely cause |
|---|---|
| `Seq Scan` on a > 1M row table | Missing index, or `WHERE` not sargable |
| Estimate `rows=10` but actual `rows=100000` | `ANALYZE` the table — stats are stale |
| `Hash Join` with hash spilling to disk | `work_mem` too small or join unindexed |
| Plan time ≫ execution time | Highly parameterized query / lots of partitions |
| `Rows Removed by Filter` huge | Filter not pushed into index |

**Index type cheatsheet:**

| Type | Use for | Example |
|---|---|---|
| **B-tree** (default) | Equality, range, sort | `WHERE id = ?`, `ORDER BY date` |
| **Hash** | Equality-only, in-memory hash | `WHERE email = ?` (rarely beats B-tree) |
| **GIN** | Membership / containment in arrays, JSONB, full-text | `WHERE tags @> '{ruby}'`, `tsvector` |
| **GiST** | Geometric, range, nearest-neighbor | PostGIS, range types, `<->` operators |
| **BRIN** | Append-mostly time-series; sparse summary blocks | `WHERE created_at > ?` on a billion-row log table |
| **SP-GiST** | Non-balanced data (quad-trees, k-d trees) | Specialized geo / IP-prefix |
| **Hash partition / list partition** (table-level) | Reduce per-partition index size | Time-series, multi-tenant |

**Composite index — the leftmost-prefix rule:**

Index on `(a, b, c)`:

| Query predicate | Uses index? |
|---|---|
| `WHERE a = ?` | ✅ |
| `WHERE a = ? AND b = ?` | ✅ |
| `WHERE a = ? AND b = ? AND c = ?` | ✅ |
| `WHERE a = ? AND c = ?` | ⚠️ — uses leading `a` only |
| `WHERE b = ?` | ❌ |
| `WHERE c = ?` | ❌ |
| `WHERE a > ? AND b = ?` | ⚠️ — `a` range stops the prefix; `b` won't be index-filtered |

> **Rule:** order columns **equality first, then sort/range last**. Range or sort on a non-leading column wastes the index.

**Specialized index forms:**

| Form | Idea |
|---|---|
| **Covering / `INCLUDE`** | `CREATE INDEX ... ON t(a, b) INCLUDE (c)` — query reads `c` straight from the index, enabling Index-Only Scan |
| **Partial** | `CREATE INDEX ... WHERE status = 'active'` — smaller, faster, only the rows that matter |
| **Expression** | `CREATE INDEX ON users (LOWER(email))` — supports `WHERE LOWER(email) = ?` |
| **Multikey (Mongo) / GIN array (PG)** | One index entry per array element — supports `tag IN array` queries |

**Sargability — what kills index use:**

| Anti-pattern | Why bad | Fix |
|---|---|---|
| `WHERE LOWER(email) = ?` | Function wraps the column | Expression index OR store lowercased |
| `WHERE date::text = '2024-01-01'` | Cast wraps the column | Compare in the column's type |
| `WHERE total + tax > 100` | Computed expression | Generated column + index, or pre-compute |
| `WHERE x LIKE '%foo'` | Leading wildcard | Reverse-string index, trigram (`pg_trgm`), or full-text search |
| `WHERE x <> 'a'` | Negation rarely uses index | Reverse the predicate or accept a scan |
| `OR` across columns without GIN | Each branch needs a separate index | Combine indexes via bitmap, or rewrite as `UNION` |

**Other classic anti-patterns:**

| Anti-pattern | Why it bites | Fix |
|---|---|---|
| `SELECT *` | Forces heap fetch even if index has the cols you need | Project only what you need |
| N+1 (`users.each { u.orders.count }`) | One query per user | Eager loading (`includes`) or single aggregate query |
| Unbounded result | OOM in app, kills cache | `LIMIT` + cursor / keyset pagination |
| `OFFSET 100000` | DB still walks 100k rows | Keyset / cursor pagination (`WHERE id > ?`) |
| Counting hot tables with `COUNT(*)` | Full scan | Approximate count from stats / `pg_class.reltuples` |
| `IN (huge list)` | Plan-time blow-up | Temp table / `VALUES` join |
| Join through ORM without `includes` | N+1 reborn | Eager-load all needed associations |

**When indexes hurt — they aren't free:**

| Cost | Effect |
|---|---|
| Disk space | Each index = a copy of the keyed columns + heap pointer |
| Write amplification | `INSERT` / `UPDATE` writes every index that touches changed columns |
| `VACUUM` cost | Dead-tuple cleanup must walk the index |
| Plan-time | More indexes → more candidate plans for the optimizer to consider |

> **Don't add an index for a query that runs once a week. Do add one for any query that runs every page view.**

**Materialized views — the precomputation hammer:**

```sql
CREATE MATERIALIZED VIEW daily_stats AS
  SELECT date_trunc('day', created_at) AS day, count(*), sum(total)
  FROM orders GROUP BY 1;

REFRESH MATERIALIZED VIEW CONCURRENTLY daily_stats;
```

| Property | Value |
|---|---|
| Storage | Real table — indexable, vacuumable |
| Freshness | Stale until `REFRESH` |
| `REFRESH` lock | Exclusive unless `CONCURRENTLY` (which needs a unique index) |
| Best for | Dashboards, top-N reports, expensive aggregates |

**Finding slow queries (Postgres):**

```sql
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

| Tool | Purpose |
|---|---|
| `pg_stat_statements` | Top consumers by total time |
| `auto_explain` | Auto-log plans for queries above a threshold |
| `pg_stat_user_indexes` | Which indexes are unused (`idx_scan = 0`) — drop them |
| `pg_stat_user_tables` | Bloat / dead-tuple counts; vacuum priorities |
| `EXPLAIN (ANALYZE, BUFFERS)` | Per-query deep dive |

**Workflow when something is slow:**

| Step | Do |
|---|---|
| 1 | `EXPLAIN ANALYZE` the actual prod-shape query |
| 2 | Compare estimated vs actual rows — if off, `ANALYZE table` |
| 3 | Spot `Seq Scan` on big tables → propose index |
| 4 | Check `Buffers` — high disk reads = cache miss problem |
| 5 | Check leftmost prefix on composite indexes |
| 6 | Validate sargability — no functions/casts on the column |
| 7 | Re-run; verify Index Scan / Index Only Scan and `actual time` drop |
| 8 | Add to `pg_stat_statements` watch list |

**Rule of thumb:** **always `EXPLAIN ANALYZE` before you tune.** Index columns used in `WHERE`, `JOIN`, `ORDER BY`. **Equality before range/sort** in composite indexes. **Partial / expression / covering** indexes when they fit. **Indexes are not free** — every write pays. **`SELECT *`, OFFSET pagination, and N+1** are the three antipatterns that show up in 80% of slow Rails apps.
