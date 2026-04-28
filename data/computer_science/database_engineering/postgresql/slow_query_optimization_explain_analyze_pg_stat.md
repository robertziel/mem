### Postgres — Slow-Query Optimization Workflow

**Definition:** the **evidence-driven loop** for fixing a slow Postgres query — find the offender via `pg_stat_statements`, read the plan via `EXPLAIN (ANALYZE, BUFFERS)`, fix the worst signal, verify. Never optimize on a hunch.

**The workflow at a glance:**

```
   ┌──────────────────────────┐
   │  1. Find slow queries    │  ← pg_stat_statements / APM / slow log
   └──────────────┬───────────┘
                  ▼
   ┌──────────────────────────┐
   │  2. Read the actual plan │  ← EXPLAIN (ANALYZE, BUFFERS)
   └──────────────┬───────────┘
                  ▼
   ┌──────────────────────────┐
   │  3. Identify the signal  │  ← seq scan? bad estimate? big sort?
   └──────────────┬───────────┘
                  ▼
   ┌──────────────────────────┐
   │  4. Fix one thing        │  ← index, rewrite, ANALYZE, materialize
   └──────────────┬───────────┘
                  ▼
   ┌──────────────────────────┐
   │  5. Verify with ANALYZE  │  ← re-run, compare timings
   └──────────────────────────┘
```

**Step 1 — Find the offender:**

| Tool | Use |
|---|---|
| **`pg_stat_statements`** | Top queries by total time, mean time, calls |
| **APM** (Datadog / New Relic / Scout) | Per-endpoint DB call breakdown |
| `auto_explain` | Logs full plan for queries over a threshold |
| Slow query log (`log_min_duration_statement`) | Capture queries above N ms |
| `bullet` (Rails) | N+1 detection in dev/test |

**Useful `pg_stat_statements` queries:**

```sql
-- Top 10 by total time
SELECT query, calls, total_exec_time, mean_exec_time, rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Top by mean time (slow per call)
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Reset between experiments
SELECT pg_stat_statements_reset();
```

**Step 2 — Read the plan:**

| Form | What it gives you |
|---|---|
| `EXPLAIN q` | Estimated plan only (no execution) |
| `EXPLAIN ANALYZE q` | **Actually runs**; shows real timings |
| `EXPLAIN (ANALYZE, BUFFERS) q` | Adds I/O — disk vs cache reads |
| `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT json) q` | Full detail; pipe to a visualizer |
| `EXPLAIN (ANALYZE, BUFFERS, SETTINGS) q` | Includes non-default GUCs |

> **Always use `ANALYZE` for real numbers, `BUFFERS` to see I/O.** Plain `EXPLAIN` only shows estimates.

**Plan-reading cheat sheet:**

| Look for | Means | Fix direction |
|---|---|---|
| `Seq Scan` on big table | No usable index, or planner chose to skip | Add index, check WHERE shape |
| `Rows: <est> vs <actual>` huge gap | Stale stats or skewed data | `ANALYZE`, `default_statistics_target`, extended stats |
| `Sort` with high memory or "external merge Disk" | Sort spilling to disk | Bump `work_mem`, add ordered index |
| `Hash Join` with huge build | Joining big to big | Add filter earlier, denormalize, materialize |
| `Nested Loop` with many iterations | Wrong join in N+1 territory | Plan favors NL on small inner — verify estimates |
| `Filter:` removes most rows | Index could've narrowed earlier | Index the filter column |
| `Bitmap Heap Scan` + Recheck | OK in many cases | Healthy when filter narrows |
| `Index Cond` vs `Filter` | `Index Cond` uses the index, `Filter` does not | Move predicate into a sargable shape |
| `actual time` >> `total cost` | Cost model fooled | Often stats issue |
| Buffers: `read` >> `hit` | Cache-cold | More RAM or hotter shared_buffers |

**Common signals → likely fix:**

| Signal | Likely fix |
|---|---|
| Seq Scan + low cardinality filter | Partial index on `WHERE status = 'active'` |
| Seq Scan + high cardinality | Composite or covering index |
| Sort > work_mem | Index covering `ORDER BY`, or bump work_mem |
| Mis-estimated rows by 100× | `ANALYZE table`, set `default_statistics_target = 1000` |
| `LIKE 'foo%'` slow | B-tree works for prefix; use `varchar_pattern_ops` if locale fights you |
| `LIKE '%foo%'` slow | `pg_trgm` GIN index |
| `IN (subquery)` slow | Rewrite as JOIN or EXISTS |
| `OFFSET 100000` slow | Keyset pagination (`WHERE id > last_seen_id`) |
| Aggregations on millions of rows | Materialized view or rollup table |
| JSONB containment | GIN index with `jsonb_ops` or `jsonb_path_ops` |

**Step 3 — Indexing strategies:**

| Strategy | Use when |
|---|---|
| **B-tree** (default) | Equality, range, ORDER BY |
| **GIN** | JSONB containment, full-text, arrays |
| **GiST** | Range types, geo, exclusion constraints |
| **BRIN** | Very large append-only tables (timestamps) — tiny, low-precision |
| **Hash** | Equality only (rarely beats B-tree in practice) |
| **Partial** | Hot subset (e.g. `WHERE status = 'active'`) |
| **Covering** (`INCLUDE (cols)`) | Index-only scans, avoid heap fetches |
| **Expression** | `((data->>'role'))`, `lower(email)` |
| **Composite** | Match leading column of WHERE / ORDER BY |

**Sargability — the rule writes must be index-friendly:**

| Bad (not sargable) | Good (sargable) |
|---|---|
| `WHERE LOWER(email) = 'a@b'` | Index on `lower(email)` OR store lowercase |
| `WHERE date_trunc('day', t) = ...` | `WHERE t >= '2026-01-01' AND t < '2026-01-02'` |
| `WHERE col + 1 = 5` | `WHERE col = 4` |
| `WHERE col::text = '5'` | `WHERE col = 5` |
| `WHERE EXTRACT(year FROM t) = 2026` | Range on `t` |

**Step 4 — Beyond indexes:**

| Technique | When |
|---|---|
| **Rewrite query** | Smaller result set, simpler joins |
| **`ANALYZE` table** | Stats are stale |
| **`VACUUM`** | Bloat after heavy update/delete |
| **Increase `work_mem`** (per-query) | Sort / hash spill to disk |
| **Materialized view** | Expensive aggregate read repeatedly |
| **Denormalize** | Avoid an expensive join hot-path |
| **Partial index** | Skewed data; mostly inactive |
| **Partition** | Multi-billion rows; pruning by date |
| **Read replica** | Reads dominate; eventual consistency OK |
| **Cache (Redis)** | Same query, low write rate |

**`work_mem` per-query bump:**

```sql
BEGIN;
SET LOCAL work_mem = '256MB';
SELECT ... -- previously spilled to disk
COMMIT;
```

**Useful catalog queries:**

| Need | Query |
|---|---|
| Index usage stats | `SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0` (unused) |
| Table I/O | `SELECT * FROM pg_stat_user_tables ORDER BY seq_tup_read DESC` |
| Cache hit ratio | `sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))` |
| Bloat estimate | Use `pgstattuple` extension |
| Locks blocking | `SELECT * FROM pg_stat_activity WHERE wait_event_type = 'Lock'` |

**Visualization tools:**

| Tool | Detail |
|---|---|
| **explain.depesz.com** | Paste the plan; highlights worst nodes |
| **pgMustard** | Commercial; great suggestions |
| **pev2 / explain.dalibo.com** | Tree visualizer |
| `\timing` in psql | Quick wall-clock |

**Anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| Adding indexes blindly | Bloat, slower writes |
| Trusting `EXPLAIN` (no ANALYZE) | Estimates can be wildly wrong |
| Optimizing one slow query while ignoring N+1 | Dominant cost is elsewhere |
| `SELECT *` everywhere | Heap fetches, network bytes, no index-only |
| Using a function on indexed column in WHERE | Kills index use |
| `OFFSET` for deep pagination | O(offset) cost |
| Forgetting to `ANALYZE` after big load | Plans stay bad |
| Indexing columns the planner won't use | Wasted disk + writes |

**Cross-references:**

- General query optimization (cross-DB principles): [query_optimization_*.md](../query_optimization_explain_analyze_indexes.md)
- N+1 in Rails / ActiveRecord: [n_plus_one_*.md](../../ruby/rails/activerecord/n_plus_one_eager_loading.md)
- Adding indexes on huge tables (concurrent migration): [adding_indexes_*.md](../adding_indexes_10m_row_large_tables_concurrent_migration.md)
- JSONB indexes: [jsonb_*.md](jsonb_when_to_use_indexes_metadata.md)

**Rule of thumb:** **Read the plan first.** Use **`pg_stat_statements`** to find the offender, **`EXPLAIN (ANALYZE, BUFFERS)`** to see what Postgres actually does, and fix the **most obvious signal** first — usually a sequential scan, a stale stats estimate, or a sort spilling to disk. Indexes solve most problems; **`ANALYZE` and partial / covering indexes** handle the rest. **Sargable WHERE clauses** + **keyset pagination** + **materialized rollups** are the bigger structural moves.
