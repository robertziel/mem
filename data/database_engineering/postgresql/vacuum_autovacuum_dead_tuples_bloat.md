### PostgreSQL VACUUM & Autovacuum

**Why VACUUM exists:**
- PostgreSQL uses MVCC — UPDATE/DELETE don't remove old rows immediately
- Old row versions ("dead tuples") remain on disk until vacuumed
- Without VACUUM: table bloat, wasted disk space, slower queries

**How MVCC creates dead tuples:**
```
UPDATE users SET name = 'Bob' WHERE id = 1;

Before: Row(id=1, name='Alice', xmax=null)     ← visible
After:  Row(id=1, name='Alice', xmax=100)      ← dead tuple (invisible to new transactions)
        Row(id=1, name='Bob', xmin=100)         ← new visible row

The old 'Alice' row stays on disk until VACUUM removes it.
```

**VACUUM types:**
| Command | What it does | Locks |
|---------|-------------|-------|
| `VACUUM table` | Reclaim dead tuples, mark space reusable | No lock (concurrent reads/writes OK) |
| `VACUUM FULL table` | Rewrite entire table, reclaim disk space to OS | **Exclusive lock** (blocks everything) |
| `VACUUM ANALYZE table` | Vacuum + update planner statistics | No lock |
| `ANALYZE table` | Update statistics only (no dead tuple cleanup) | No lock |

**Autovacuum (automatic, always enabled):**
```sql
-- Key autovacuum settings
autovacuum = on                              -- never turn off
autovacuum_vacuum_threshold = 50             -- min dead tuples before vacuum
autovacuum_vacuum_scale_factor = 0.2         -- vacuum when 20% of rows are dead
autovacuum_analyze_threshold = 50
autovacuum_analyze_scale_factor = 0.1        -- analyze when 10% changed

-- Trigger: vacuum when dead_tuples > threshold + (scale_factor × table_rows)
-- 1M row table: vacuum after 200,050 dead tuples (50 + 0.2 × 1,000,000)
```

**Per-table autovacuum tuning (for hot tables):**
```sql
ALTER TABLE orders SET (
  autovacuum_vacuum_scale_factor = 0.01,    -- vacuum at 1% dead (not 20%)
  autovacuum_vacuum_threshold = 1000,
  autovacuum_analyze_scale_factor = 0.005
);
```

**Monitoring bloat:**
```sql
-- Dead tuples per table
SELECT relname, n_dead_tup, n_live_tup,
  round(n_dead_tup::numeric / NULLIF(n_live_tup, 0) * 100, 1) AS dead_pct,
  last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 20;

-- Check if autovacuum is running
SELECT * FROM pg_stat_activity WHERE query LIKE 'autovacuum%';
```

**Transaction ID wraparound (critical):**
- PostgreSQL uses 32-bit transaction IDs (4 billion max)
- VACUUM marks old transactions as "frozen" (no longer tracked)
- If VACUUM falls behind → PostgreSQL **forcibly shuts down writes** (refuses new transactions) to prevent corruption. No data loss — but outage until emergency single-user VACUUM completes.
- Monitor: `age(datfrozenxid)` should not approach 2 billion (warning at ~10M before wraparound)

**Rule of thumb:** Never disable autovacuum. Tune per-table for high-write tables (lower scale_factor). VACUUM FULL only as last resort (blocks everything). Monitor dead tuples and autovacuum frequency. Transaction ID wraparound is the #1 PostgreSQL operational risk — ensure autovacuum keeps up.
