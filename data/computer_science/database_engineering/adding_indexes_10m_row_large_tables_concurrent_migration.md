### Adding Indexes to Large Tables (10M+ Rows) — Concurrent Migrations

**Definition:** adding an index to a busy production table can lock writes for **minutes to hours** with naive `CREATE INDEX`. The fix is **concurrent index builds** + **batched backfills** + **migration discipline** — never block the write path.

**The risk in plain SQL:**

| `CREATE INDEX users(email)` | Effect |
|---|---|
| `ACCESS EXCLUSIVE` lock on table | Blocks reads + writes |
| Duration | Minutes to hours on 10M+ rows |
| Production impact | Hard outage |

**Postgres — `CREATE INDEX CONCURRENTLY`:**

```sql
-- Safe: doesn't block reads or writes
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);

-- Drop the same way:
DROP INDEX CONCURRENTLY idx_users_email;
```

| Property | Detail |
|---|---|
| Locks held | `SHARE UPDATE EXCLUSIVE` only — allows reads + writes |
| Duration | 2–3× longer than non-concurrent |
| Two-phase build | Scan + verify |
| **Cannot run inside a transaction** | Migration must use `disable_ddl_transaction!` |
| If interrupted | Index left `INVALID` — must drop and retry |
| Detect invalid | `SELECT * FROM pg_index WHERE indisvalid = false` |

**Rails migration pattern:**

```ruby
class AddIndexToUsersEmail < ActiveRecord::Migration[7.1]
  disable_ddl_transaction!     # required for CONCURRENTLY

  def change
    add_index :users, :email,
              algorithm: :concurrently,
              if_not_exists: true
  end
end
```

| Setting | Why |
|---|---|
| `disable_ddl_transaction!` | Concurrent index ops can't run inside a transaction |
| `algorithm: :concurrently` | Triggers `CONCURRENTLY` clause |
| `if_not_exists: true` | Re-running migration safe |
| Run during low traffic | Reduces write contention |

**MySQL — online DDL:**

```sql
-- InnoDB online DDL
ALTER TABLE users ADD INDEX idx_email (email), ALGORITHM=INPLACE, LOCK=NONE;

-- Or with pt-online-schema-change (Percona)
pt-online-schema-change --alter "ADD INDEX idx_email (email)" D=db,t=users --execute

-- Or with gh-ost (GitHub)
gh-ost --alter "ADD INDEX idx_email (email)" --table=users --execute
```

| Tool | Mechanism |
|---|---|
| **Online DDL** (InnoDB native) | In-place modification; works for many index ops |
| **`pt-osc`** | Triggers + copy table |
| **`gh-ost`** | Replication-based; no triggers |

**Pre-flight checklist for any large-table index:**

| Check | Why |
|---|---|
| Disk space ≥ 2× index size | Build needs scratch space |
| Off-peak window | Less write contention |
| Lock timeout configured | `SET lock_timeout = '5s'` — fail fast on contention |
| Statement timeout | `SET statement_timeout = '0'` — index build can take long |
| Monitoring in place | Watch lock waits, replication lag |
| Rollback plan | Drop index commands ready |
| Replication lag tolerance | Replica may fall behind during build |

**Lock-light migration patterns:**

```ruby
# Safe migration template — run BEFORE the index, separately:
class SetLockTimeout < ActiveRecord::Migration[7.1]
  def up
    execute "SET lock_timeout = '2s'"
  end
end
```

| Pattern | Detail |
|---|---|
| Use `lock_timeout` to fail fast | Don't queue behind long transactions |
| Retry with backoff | Common in tools like `strong_migrations` |
| Prefer adding columns nullable | Then backfill, then add NOT NULL |
| Avoid combining migration steps | One step per migration file |

**`strong_migrations` gem (Rails) — what it catches:**

| Catches | Detail |
|---|---|
| `add_column ... default: ...` | Postgres < 11 rewrites whole table |
| `add_index` without `concurrently` | Locks writes |
| Removing a column | Breaks running app pre-deploy |
| `change_column` | Rewrites whole table |
| Adding NOT NULL with default to existing column | Long lock |
| Renaming a column | Stale references during rollout |

**Backfill — when adding a NOT NULL column with default:**

```ruby
# Migration 1: add nullable column
class AddVerifiedToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :verified, :boolean
  end
end

# Migration 2 (separate deploy): backfill in batches
class BackfillUsersVerified < ActiveRecord::Migration[7.1]
  disable_ddl_transaction!

  def up
    User.in_batches(of: 5_000) do |batch|
      batch.update_all(verified: false)
      sleep 0.1   # gentle on replicas
    end
  end
end

# Migration 3 (separate deploy): add NOT NULL + default
class FinalizeUsersVerified < ActiveRecord::Migration[7.1]
  def change
    change_column_default :users, :verified, from: nil, to: false
    change_column_null :users, :verified, false
  end
end
```

| Step | Why split |
|---|---|
| Add nullable column | Fast, no rewrite |
| Backfill in batches | Long but doesn't lock |
| Add NOT NULL | Quick if no NULL rows remain |
| Each in separate deploy | Rollback is per-step |

**Index-strategy decision matrix:**

| Need | Index |
|---|---|
| Equality / range | B-tree |
| Hot subset | Partial index (`WHERE status = 'active'`) |
| Avoid heap fetch | Covering index (`INCLUDE`) |
| JSONB | GIN |
| Geo | GiST / SP-GiST |
| Append-only timestamps | BRIN (tiny, lossy) |
| Full-text | GIN with tsvector |
| Trigram (fuzzy) | GIN with `pg_trgm` |

**Index health checks (post-deploy):**

```sql
-- Find unused indexes
SELECT schemaname, relname, indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE 'pg_%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find duplicate indexes
SELECT pg_size_pretty(SUM(pg_relation_size(idx))::bigint) AS size,
       (array_agg(idx))[1] AS idx1, (array_agg(idx))[2] AS idx2
FROM (
  SELECT indexrelid::regclass AS idx,
         (indrelid::text || E'\n' || indclass::text || E'\n' ||
          indkey::text || E'\n' || COALESCE(indexprs::text,'') || E'\n' ||
          COALESCE(indpred::text,'')) AS key
  FROM pg_index
) sub
GROUP BY key HAVING COUNT(*) > 1;
```

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Plain `CREATE INDEX` on big table | Long lock, downtime |
| `CONCURRENTLY` inside a transaction | Error |
| Interrupted concurrent build | Index left INVALID |
| Adding index, not analyzing usage | Wasted disk + write cost |
| Composite index in wrong column order | Index not used |
| Indexing low-cardinality column | Planner ignores it |
| Forgetting replication lag | Replica falls hours behind |
| Schema migration + data migration in one file | Can't roll back independently |

**Rolling out a risky migration — the pattern:**

| Phase | Action |
|---|---|
| 1 | Schema-only change (additive: add column, add index concurrently) |
| 2 | Deploy app code that **writes** to new column / uses new index |
| 3 | Backfill old rows in batches |
| 4 | Deploy app code that **reads** from new column |
| 5 | Drop old column / old index in a later release |

> "Add → backfill → switch → drop" — five separate deploys for one logical change.

**Cross-references:**

- Postgres slow-query workflow: [slow_query_*.md](postgresql/slow_query_optimization_explain_analyze_pg_stat.md)
- Indexes (B-tree, GIN, BRIN): [postgresql_indexes_*.md](postgresql/postgresql_indexes_btree_gin_brin.md)
- Locking: [locking_*.md](postgresql/locking_optimistic_vs_pessimistic.md)
- Partition tools: [pgslice_partman_*.md](postgresql/pg_slice_vs_pg_partman_partitioning.md)

**Rule of thumb:** **Never `CREATE INDEX` plain on a 10M+ row table — always `CONCURRENTLY` (Postgres) or `gh-ost / pt-osc` (MySQL).** Use **`strong_migrations`** in Rails to catch unsafe patterns. Schema and data changes go in **separate migrations and separate deploys**: add nullable, backfill in batches, then enforce NOT NULL. Set **`lock_timeout`** so a stuck migration fails fast instead of queuing behind a long transaction.
