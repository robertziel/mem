### `pgslice` vs `pg_partman` — Postgres Partitioning Tools

**Both manage Postgres declarative partitioning, but they solve different problems:** `pgslice` is an **external CLI for one-shot migrations** of an existing table; `pg_partman` is a **Postgres extension for ongoing partition lifecycle**.

**Core comparison:**

| Property | **`pgslice`** | **`pg_partman`** |
|---|---|---|
| Form | External CLI (Ruby gem) | Postgres extension (`CREATE EXTENSION`) |
| Install location | Developer machine / app server | The database server |
| Primary job | Migrate **existing** table → partitioned | **Maintain** partitions over time |
| Partition creation | Manual / one-shot per migration step | Automatic — pre-creates future partitions |
| Retention / drop old partitions | Not provided | Built-in retention policy |
| Server-side privileges | None — runs as a regular user | Needs extension install (superuser) |
| Migration of legacy data | Strong (analyze → fill → swap) | Weaker — focused on new tables |
| Operational complexity | Lower upfront | Higher upfront, lower ongoing |

**`pgslice` migration workflow:**

```
1. pgslice prep table column period   → creates table_intermediate (partitioned)
2. pgslice add_partitions              → creates partition tables
3. pgslice fill                        → backfill data into partitions
4. pgslice analyze                     → vacuum/analyze
5. pgslice swap                        → rename intermediate → original
```

| Step | What happens |
|---|---|
| `prep` | Create new partitioned parent + first partitions |
| `add_partitions` | Generate partitions for the date range |
| `fill` | Copy rows from old → new in batches |
| `analyze` | Stats refresh |
| `swap` | Atomic table rename; minimal downtime |

**`pg_partman` workflow:**

```sql
CREATE EXTENSION pg_partman;

-- One-time: tell pg_partman to manage this table
SELECT partman.create_parent(
  p_parent_table => 'public.events',
  p_control      => 'created_at',
  p_type         => 'native',
  p_interval     => 'daily',
  p_premake      => 7    -- pre-create 7 future partitions
);

-- Ongoing: cron a maintenance job
SELECT partman.run_maintenance('public.events');

-- Retention: drop old partitions automatically
UPDATE partman.part_config
   SET retention = '90 days', retention_keep_table = false
 WHERE parent_table = 'public.events';
```

**When to pick `pgslice`:**

| Signal | Detail |
|---|---|
| Have a large legacy table to migrate | `prep + fill + swap` is the strongest tool for this |
| Can't install extensions (managed RDS limits, policy) | Pure CLI |
| One-time migration | Don't need ongoing automation |
| Want simple, scripted, reviewable steps | Each command is explicit |

**When to pick `pg_partman`:**

| Signal | Detail |
|---|---|
| Greenfield partitioned table | Set it up at creation, no migration needed |
| Need automatic future partitions | High-throughput append-only tables (events, logs, metrics) |
| Need automatic retention | Drop partitions older than X automatically |
| Postgres 13+ native partitioning available | `pg_partman` integrates with native partitioning |
| Ops team comfortable installing extensions | Rare blocker on self-managed Postgres |

**Migrate then maintain (common combo):**

| Phase | Tool | Why |
|---|---|---|
| 1. Convert legacy table | `pgslice` | Best at migration |
| 2. Hand off ongoing maintenance | `pg_partman` | Best at lifecycle |

**Compatibility with managed Postgres:**

| Provider | `pgslice` | `pg_partman` |
|---|---|---|
| AWS RDS / Aurora Postgres | Works (CLI is external) | Available as supported extension |
| Google Cloud SQL | Works | Available |
| Azure Postgres | Works | Available |
| Supabase | Works | Available |
| Crunchy Bridge | Works | Available |

**Native Postgres partitioning (the substrate both use):**

| Feature | Postgres version |
|---|---|
| `PARTITION BY RANGE / LIST / HASH` | 10+ |
| Partition pruning | 10+, much better in 11+ |
| Default partitions | 11+ |
| Indexes on parent | 11+ |
| `ATTACH PARTITION` low-lock | 12+ |
| Better partition-wise joins | 13+ |

**Decision matrix:**

| Need | Pick |
|---|---|
| Migrate a busy production table to partitions, minimal downtime | **`pgslice`** |
| Greenfield events / logs table with 90-day retention | **`pg_partman`** |
| Both: migrate, then maintain | **`pgslice` → `pg_partman`** |
| Everything custom, no extension allowed | **`pgslice` + manual cron jobs** |
| Inherited partitioning (Postgres < 10 style) | Migrate to declarative first; both tools assume native |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Running `pgslice swap` while writes hit old table | Lost rows — coordinate with the app |
| `pg_partman` retention without backups | Data lost when partitions drop |
| Premake too low | Out-of-range inserts fail |
| Forgetting indexes on partitions | Query plans fall back to seq scans |
| Mixing inheritance + declarative partitioning | Both tools require declarative |
| Time-zone mismatch between `created_at` and partition bounds | Edge inserts go to wrong partition |

**Cross-references:**

- Adding indexes on large tables: [adding_indexes_*.md](../adding_indexes_10m_row_large_tables_concurrent_migration.md)
- Query optimization (partition pruning): [query_optimization_*.md](../query_optimization_explain_analyze_indexes.md)
- Slow-query analysis: [slow_query_*.md](slow_query_optimization_explain_analyze_pg_stat.md)

**Rule of thumb:** **`pgslice` to migrate, `pg_partman` to maintain.** Use **`pgslice`** when converting an existing busy table with minimal downtime — its `prep / fill / swap` flow is purpose-built. Use **`pg_partman`** for any new partitioned table you'll keep around — it handles future-partition creation and retention. Combining them is common: migrate with `pgslice`, hand off ongoing lifecycle to `pg_partman`.
