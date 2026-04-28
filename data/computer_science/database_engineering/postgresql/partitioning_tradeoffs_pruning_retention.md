### PostgreSQL Partitioning (Tradeoffs, Pruning, Retention)

**What partitioning is:** splitting one logical table into many physical sub-tables based on a partition key (`created_at`, `tenant_id`, region). Queries see one table; the planner skips irrelevant partitions.

**Cross-ref:** for cross-shard sharding (different boxes) see [sharding_strategies_*.md](../sharding_strategies_consistent_hashing_partition_key.md). Partitioning lives **inside one PostgreSQL server**.

**Three partitioning strategies:**

| Strategy | Mechanism | Use when |
|---|---|---|
| **RANGE** | Each partition holds a value range | Time-series, ordered IDs |
| **LIST** | Each partition holds an explicit value set | Region, tenant tier, country |
| **HASH** | `hash(key) mod N` to a partition | Even distribution by tenant ID, user ID |
| **Composite** (RANGE / LIST + sub-partitions) | Two-level | Per-month within per-region |

**When partitioning helps — the four real wins:**

| Win | Detail |
|---|---|
| **Partition pruning** | Planner skips irrelevant partitions when query filters by partition key |
| **Retention** | Drop old data with `DETACH` / `DROP PARTITION` (instant) instead of `DELETE` (slow + bloat) |
| **Targeted maintenance** | `VACUUM`, `ANALYZE`, `REINDEX` per partition — bounded duration |
| **Bulk operations** | Load / archive / re-index N months of data at once |

**When partitioning **doesn't** help (or makes it worse):**

| Anti-fit | Why |
|---|---|
| Table is moderate size (under ~50 GB / 100 M rows) | Overhead exceeds benefit |
| Real problem is missing index | Add the index first |
| Queries rarely filter by partition key | Pruning never kicks in — scan all partitions |
| Cross-partition aggregates dominate | Planner must touch every partition |
| You're already saturating I/O | Partitions don't add storage; same disk |
| Random write distribution across many partitions | Worse cache hit rate |
| You want it "in case we get big" | YAGNI — convert later if needed (online with `pg_partman`) |

**RANGE example (monthly partitioning):**

```sql
CREATE TABLE events (
  id        bigint generated always as identity,
  occurred_at timestamptz not null,
  payload   jsonb,
  primary key (id, occurred_at)        -- partition key MUST be in PK
) PARTITION BY RANGE (occurred_at);

CREATE TABLE events_2024_04 PARTITION OF events
  FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');

CREATE TABLE events_2024_05 PARTITION OF events
  FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');

-- Default catches anything outside declared ranges
CREATE TABLE events_default PARTITION OF events DEFAULT;
```

**LIST example (per-region):**

```sql
CREATE TABLE customers (
  id bigint, region text, ...
) PARTITION BY LIST (region);

CREATE TABLE customers_us PARTITION OF customers FOR VALUES IN ('us-east','us-west');
CREATE TABLE customers_eu PARTITION OF customers FOR VALUES IN ('eu-west','eu-central');
CREATE TABLE customers_apac PARTITION OF customers FOR VALUES IN ('apac');
```

**HASH example (even tenant distribution):**

```sql
CREATE TABLE messages (...) PARTITION BY HASH (tenant_id);

CREATE TABLE messages_p0 PARTITION OF messages FOR VALUES WITH (modulus 8, remainder 0);
CREATE TABLE messages_p1 PARTITION OF messages FOR VALUES WITH (modulus 8, remainder 1);
-- ... up to 7
```

**Partition pruning — when it works:**

| Query | Pruning? |
|---|---|
| `WHERE occurred_at >= '2024-04-01' AND occurred_at < '2024-05-01'` | ✅ — exact partition |
| `WHERE occurred_at = '2024-04-15'` | ✅ |
| `WHERE occurred_at::date = '2024-04-15'` | ❌ — function on column blocks pruning |
| `WHERE region = 'us-east'` (list partition) | ✅ |
| `WHERE region IN ('us-east','eu-west')` | ✅ — both partitions only |
| `WHERE tenant_id = 42` (hash partition) | ✅ |
| `WHERE LOWER(region) = 'us-east'` | ❌ — function blocks |
| Bind parameter for partition key | ✅ since PG 11+ (runtime pruning) |
| `ORDER BY occurred_at LIMIT 10` without WHERE | Reads all partitions in order; partial pruning |

> Verify with `EXPLAIN`: look for **"Partitions pruned"** count or `Subplans Removed`.

**Index strategy under partitioning:**

| Concept | Detail |
|---|---|
| **Indexes are per partition** by default | Each partition has its own index |
| `CREATE INDEX ON parent_table` | Cascades — creates matching index on each partition |
| Concurrent index creation | `CREATE INDEX CONCURRENTLY` — must do per partition manually until you `ATTACH PARTITION` of the index |
| **Unique constraints** | Must include the partition key |
| Global uniqueness | Not natively supported — must enforce in app or use unique key including partition column |
| Foreign keys | Supported (PG 12+) — but children of the partitioned table can't be referenced themselves |

**Constraint exclusion vs partition pruning:**

| Mechanism | Era | Detail |
|---|---|---|
| Constraint exclusion (PG ≤ 9.6 inheritance partitioning) | Legacy | Old "fake" partitioning via inheritance + CHECK constraints |
| **Declarative partitioning (PG 10+)** | Current | Native `PARTITION BY`; planner uses metadata directly |
| **Runtime partition pruning (PG 11+)** | Current | Works with bind params + at execution time |

**Retention via partition rotation — the killer feature:**

| Operation | Old way (no partitions) | Partitioning |
|---|---|---|
| Delete 1 month of old data | `DELETE WHERE created_at < ...` (long, bloating) | `DROP TABLE events_2024_01` (instant) |
| Archive | `COPY` + `DELETE` | `DETACH PARTITION events_2024_01` then move it elsewhere |
| Backfill | Insert into main table | Build new partition offline, `ATTACH PARTITION` |

**`DETACH` vs `DROP`:**

| Command | Effect |
|---|---|
| `ALTER TABLE parent DETACH PARTITION p` | Removes from parent — partition becomes a standalone table |
| `ALTER TABLE parent DETACH PARTITION p CONCURRENTLY` (PG 14+) | Online; no exclusive lock |
| `DROP TABLE p` | Permanently deletes the partition |
| `DETACH` then archive elsewhere | Common backfill pattern |

**Maintenance — partition-aware:**

| Task | Why partition-by-partition |
|---|---|
| `VACUUM` | Bounded duration per partition |
| `ANALYZE` | Stats per partition; planner gets fresh data |
| `REINDEX CONCURRENTLY` | Per partition, doesn't lock the whole table |
| `CLUSTER` | Per partition |
| Statistics | `ANALYZE parent` aggregates across partitions; `ANALYZE child` for per-partition |

**Operational tools:**

| Tool | Use |
|---|---|
| **`pg_partman`** | Automated partition management — create future partitions, drop old ones |
| **`pg_cron`** | Schedule partition maintenance |
| **`pg_repack`** | Online table reorganization (per partition or whole) |
| **`pg_squeeze`** | Online VACUUM FULL alternative |
| Native PG10+ DDL | For static or hand-managed partition schemes |

**`pg_partman` setup pattern:**

```sql
-- after CREATE EXTENSION pg_partman;
SELECT partman.create_parent(
  p_parent_table   => 'public.events',
  p_control        => 'occurred_at',
  p_type           => 'native',
  p_interval       => 'monthly',
  p_premake        => 4   -- pre-create 4 months of future partitions
);

-- via pg_cron, run partman maintenance periodically
SELECT cron.schedule('partman-events',  '0 4 * * *',
  $$ SELECT partman.run_maintenance('public.events') $$);
```

| Setting | Effect |
|---|---|
| `p_premake` | How many future partitions to keep ready |
| `p_retention` | When set, partitions older than this are dropped |
| `p_retention_keep_table` | Detach instead of drop |
| `p_constraint_cols` | Build/maintain constraint-exclusion CHECKs (legacy) |

**Migrating an existing huge table to partitioned:**

| Step | Detail |
|---|---|
| 1 | Create new partitioned parent with same schema |
| 2 | Create partitions for the existing date / key ranges |
| 3 | Copy data in batches with `INSERT INTO new SELECT ... FROM old WHERE ...` |
| 4 | Or: rename old to `_legacy`, attach as a partition (PG 12+ `ATTACH PARTITION`) |
| 5 | Switch application reads/writes to the new table |
| 6 | Drop / archive old data |

**Performance gotchas:**

| Gotcha | Effect | Workaround |
|---|---|---|
| Too many partitions (10 000+) | Slow query planning | Cap at hundreds; sub-partition only when needed |
| Cross-partition aggregates | Planner touches every partition | Pre-aggregate (matview / rollup table) |
| Sort across partitions | No global index, must merge | Index on partition key + sort key together |
| `INSERT` route cost | Each row checked against partitions | Negligible up to ~100 partitions |
| `UPDATE` of partition key | Row physically moved | Forbid via app or accept cost |
| Plan caching with `prepared` statements | Old plan with old partition list | Reset connections after partition adds (PG 11+ runtime pruning helps) |

**Statistics — keep them fresh:**

| Practice | Detail |
|---|---|
| `ANALYZE` after bulk loads | Otherwise plans are wrong |
| Per-partition autovacuum settings | Tune frequency on hot partitions |
| Cross-partition extended statistics | `CREATE STATISTICS` for correlations |

**Sub-partitioning (composite — when you need it):**

```sql
-- Two-level: per-month and per-region
CREATE TABLE events PARTITION BY RANGE (occurred_at);

CREATE TABLE events_2024_04 PARTITION OF events
  FOR VALUES FROM ('2024-04-01') TO ('2024-05-01')
  PARTITION BY LIST (region);

CREATE TABLE events_2024_04_us PARTITION OF events_2024_04 FOR VALUES IN ('us-east','us-west');
CREATE TABLE events_2024_04_eu PARTITION OF events_2024_04 FOR VALUES IN ('eu-west');
```

> Sub-partitioning multiplies overhead — only do it when both axes drive frequent filters.

**Multi-tenant patterns:**

| Pattern | Detail |
|---|---|
| **Hash partition by `tenant_id`** | Even distribution, good for many small tenants |
| **List partition by `tenant_id`** for whales | One whale gets its own partition; others share a "rest" partition |
| **Schema-per-tenant** | Different model — not partitioning, but related |
| **Database-per-tenant** | Heaviest isolation — fully separate |

**Comparison with non-PostgreSQL partitioning:**

| Database | Partitioning |
|---|---|
| PostgreSQL | Declarative (since PG10), strong since PG12+ |
| MySQL | RANGE / LIST / HASH / KEY since 5.1; per-engine specifics |
| Oracle | RANGE / LIST / HASH / interval; mature |
| BigQuery | Time-unit + integer-range partitioning + clustering |
| Snowflake | Micro-partitions auto-managed |
| ClickHouse | Per-table partitioning by expression |

**Decision shortcuts:**

| Need | Pick |
|---|---|
| Time-series with retention | RANGE on timestamp + `pg_partman` retention |
| Multi-tenant SaaS, balanced | HASH on `tenant_id` |
| Region-scoped data | LIST on region |
| Slow queries on a 10 GB table | First add indexes; partitioning rarely helps at this size |
| 1 TB+ table with date filters | Strong case for RANGE partitioning |
| Audit / log table where old rows are dropped | RANGE + drop monthly |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Partitioning a table that's not large | Adds complexity without payoff |
| Queries don't filter by partition key | No pruning — same scan as before |
| Forgetting partition key in unique constraint | Constraint can't be enforced |
| `DEFAULT` partition is the catch-all that grows | Add explicit ranges; alarm on default growth |
| Function on partition key in `WHERE` | Blocks pruning |
| Adding partitions manually (no automation) | Eventually you forget |
| Too few future partitions premade | Inserts fail when crossing into next month |
| Querying across partitions repeatedly | Planning overhead becomes noticeable |
| Forgot to `ANALYZE` after bulk load | Plans are wrong |
| Sequential PK without partition key | Hot writes on one partition |

**Verification queries:**

| Goal | SQL |
|---|---|
| List partitions of a table | `\d+ events` (psql) or query `pg_partition_tree('events')` |
| Per-partition row counts | `SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE relname LIKE 'events_%'` |
| Per-partition size | `SELECT relname, pg_size_pretty(pg_relation_size(oid)) FROM pg_class WHERE relname LIKE 'events_%'` |
| Did a query prune partitions? | `EXPLAIN (ANALYZE, BUFFERS) SELECT ...` — look for `Partitions removed` / `Subplans Removed` |

**Quick checklist:**

| Check | Pass? |
|---|---|
| Table is genuinely large enough (>50 GB / >100 M rows) | ✅ |
| Most queries filter by partition key | ✅ |
| Partition key is in primary key + every unique constraint | ✅ |
| Future partitions premade (manual or `pg_partman`) | ✅ |
| Retention strategy decided (drop / detach / archive) | ✅ |
| `ANALYZE` after bulk loads + per-partition autovacuum tuned | ✅ |
| `DEFAULT` partition monitored | ✅ |
| `EXPLAIN` confirms pruning works on representative queries | ✅ |
| Sub-partitioning only when both axes filter frequently | ✅ |

**Rule of thumb:** **partition because you need pruning, retention, or per-partition maintenance** — not because the table feels "big". **RANGE on time** is the most common shape; pair with **`pg_partman` + `pg_cron`** for automated rolling. **Always include the partition key in your primary key + unique constraints**. Verify pruning with **`EXPLAIN`** — if queries don't filter on the partition key, you've added complexity without benefit.
