### Reading PostgreSQL EXPLAIN Output

**Running EXPLAIN:**
```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, COUNT(o.id)
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE u.active = true
GROUP BY u.name;
```

**Key output components:**
```
Hash Join  (cost=10.50..120.00 rows=500 width=36) (actual time=0.5..5.2 rows=480 loops=1)
  Hash Cond: (o.user_id = u.id)
  -> Seq Scan on orders o  (cost=0.00..80.00 rows=5000 width=8) (actual time=0.01..2.1 rows=5000 loops=1)
  -> Hash  (cost=8.50..8.50 rows=200 width=36) (actual time=0.3..0.3 rows=180 loops=1)
       -> Index Scan using idx_users_active on users u  (cost=0.29..8.50 rows=200 width=36)
             Filter: active = true
             Rows Removed by Filter: 20
Planning Time: 0.15 ms
Execution Time: 5.5 ms
Buffers: shared hit=150 read=10
```

**Scan types (how PostgreSQL reads data):**
| Scan | How | When | Good/Bad |
|------|-----|------|----------|
| **Seq Scan** | Read every row in table | No useful index, or small table | Bad on large tables |
| **Index Scan** | Use index to find rows, then fetch from table | Selective filter with index | Good |
| **Index Only Scan** | All data from index alone (no table fetch) | Covering index | Best |
| **Bitmap Index Scan** | Build bitmap from index, then fetch matching rows | Moderate selectivity | Good for multiple conditions |

**Join types:**
| Join | How | When |
|------|-----|------|
| **Nested Loop** | For each outer row, scan inner | Small outer set, indexed inner |
| **Hash Join** | Build hash table from one side, probe with other | Medium-large joins, no index |
| **Merge Join** | Both sides sorted, merge in order | Pre-sorted data, large joins |

**Reading cost numbers:**
```
(cost=0.29..8.50 rows=200 width=36)
      ↑         ↑      ↑        ↑
  startup   total   estimated  avg row
  cost      cost    rows       size (bytes)

(actual time=0.01..2.1 rows=180 loops=1)
              ↑        ↑         ↑       ↑
          startup   total    actual    times
          time(ms)  time(ms) rows      executed
```

**Red flags in EXPLAIN:**
| Red flag | Meaning | Fix |
|----------|---------|-----|
| Seq Scan on large table | Missing index | Add index on filter/join columns |
| `rows=1000` actual `rows=500000` | Bad row estimate | Run `ANALYZE table` to update stats |
| Nested Loop with Seq Scan inner | O(n²) join | Add index on join column |
| `Rows Removed by Filter: 99999` | Index returns too many rows | More selective index or partial index |
| `Buffers: read=10000` | Heavy disk I/O | Not enough `shared_buffers` or cold cache |
| High `Planning Time` | Complex query | Simplify query or use prepared statement |

**Buffers output (with BUFFERS option):**
```
Buffers: shared hit=150 read=10 written=5
  hit=150   → pages found in shared_buffers cache (fast)
  read=10   → pages read from disk (slow)
  written=5 → pages written to disk
```
High `read` count = cache misses = slow. Increase `shared_buffers` or optimize query to read fewer pages.

**Rule of thumb:** Always use `EXPLAIN (ANALYZE, BUFFERS)` — not just `EXPLAIN`. Look for: Seq Scans on large tables, row estimate mismatches (run ANALYZE), Nested Loops with Seq Scan inner. The actual time and rows matter more than cost estimates. Buffers `read` count tells you how much disk I/O occurred.
