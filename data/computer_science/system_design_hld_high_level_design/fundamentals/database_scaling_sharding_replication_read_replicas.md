### Database Scaling — Vertical, Read Replicas, Sharding, Connection Pooling

**Definition:** scaling a database has a **clear cheap-to-expensive order**: optimize queries → cache → vertical scale → read replicas → connection pooling → sharding. **Sharding is a last resort** because it's hard to undo and adds permanent operational complexity.

**The scaling order (cheapest → most expensive):**

| Step | Action | Cost / risk |
|---|---|---|
| 1 | **Optimize queries + add indexes** | Low |
| 2 | **Cache hot reads** (Redis) | Low |
| 3 | **Vertical scale** (bigger box) | Medium |
| 4 | **Read replicas** | Medium |
| 5 | **Connection pooling** (PgBouncer) | Low |
| 6 | **Materialized views / rollups** | Medium |
| 7 | **Partitioning** (within one DB) | Medium |
| 8 | **Sharding** (across DBs) | High — last resort |

**Vertical scaling — scale up first:**

| Property | Detail |
|---|---|
| Bigger machine | More CPU, RAM, NVMe |
| No code changes | Just a config + restart |
| Simple operationally | One box to manage |
| Hard limit | Whatever cloud offers (e.g. db.r6i.32xlarge) |
| Diminishing returns | $$$ for last 10% performance |
| Common stop point | 32–64 vCPU, 256–512 GB RAM |

**Read replicas — fan out reads:**

```
Writes ─► [Primary]
              │ async replication
              ▼
Reads  ─► [Replica 1]  [Replica 2]  [Replica 3]
```

| Property | Detail |
|---|---|
| Async replication | Replicas eventually consistent |
| Replication lag | Can be ms to seconds |
| Read-after-write inconsistency | Same user sees old data after write |
| Use cases | Read-heavy workloads, reporting, geo-distribution |
| Replica count | 1–5 typical; more for read-heavy |

**Replication lag mitigation:**

| Pattern | Detail |
|---|---|
| **Read-your-writes** | Send read to primary if recent write |
| **Sticky session to primary briefly** | Until lag catches up |
| **`max_replica_lag` checks** | Skip replicas that fall behind |
| **Use primary for critical reads** | Auth, payments |
| **Application-aware routing** | Pin user to primary for N seconds after write |

**Sharding — the last resort:**

```
                ┌──── shard 1: ids 0–1B
                │
   App ─► Router ──── shard 2: ids 1B–2B
                │
                └──── shard 3: ids 2B–3B
```

**Sharding strategies:**

| Strategy | How | Pros | Cons |
|---|---|---|---|
| **Hash-based** | `shard = hash(key) % N` | Even distribution | Hard to re-shard (most keys move) |
| **Range-based** | A–M to shard 1, N–Z to shard 2 | Range queries efficient | Hot spots possible |
| **Geographic** | Shard by region | Data locality | Cross-region queries hard |
| **Directory** | Lookup table maps key → shard | Flexible, easy rebalancing | Lookup table is SPOF |
| **Consistent hashing** | Hash + virtual nodes | Few keys move on resize | More complex |

**Consistent hashing — the resharding superpower:**

```
   Hash ring (0 to 2^32):
     ●────●────●────●────●        ← virtual nodes around the ring
       ↑    ↑    ↑    ↑    ↑
     shard1 shard2 shard1 shard3 shard2

   On adding shard4: only ~1/N keys move (those near new node)
```

| Property | Detail |
|---|---|
| When adding/removing shard, ~1/N keys move | Not all keys |
| Used by | DynamoDB, Cassandra, Memcached, Riak |
| Virtual nodes per physical | Better balance |
| Avoids the "all keys move on resize" problem | Major win |

**Sharding challenges (why it's hard):**

| Challenge | Detail |
|---|---|
| **Cross-shard queries** | JOINs across shards are slow / impossible |
| **Cross-shard transactions** | No native support; need saga pattern |
| **Rebalancing** | Moving data when adding shards |
| **Hot shards** | Celebrity user concentrates load |
| **Schema changes** | Apply to N shards consistently |
| **Operational complexity** | N databases to monitor, backup, upgrade |
| **App complexity** | Routing logic in client or proxy |
| **Backup time** | N parallel backups |

**Connection pooling — almost always needed:**

| Tool | Detail |
|---|---|
| **PgBouncer** | Postgres external pooler |
| **ProxySQL** | MySQL proxy + pool |
| **RDS Proxy** | AWS-managed |
| **Application-level** (HikariCP, Rails AR pool) | Per-process pool |

**Why pooling matters:**

| Without pooler | With PgBouncer |
|---|---|
| 500 app conns × 10MB = 5GB Postgres backends | 500 app conns → 50 backends, 500MB |
| Postgres struggles past ~500 conns | PgBouncer multiplexes |
| App pool sizing tied to DB | Decoupled |

> **PgBouncer transaction mode** is the typical default. Session mode only when needed (LISTEN/NOTIFY, advisory locks).

**Multi-region — three patterns:**

| Pattern | Detail |
|---|---|
| **Single primary** + read replicas globally | Writes to one region; reads local |
| **Multi-master** (DynamoDB Global Tables, Spanner, CockroachDB) | Writes anywhere; consensus or LWW |
| **Per-region shards** | Different tenants/regions separate |

**Database scaling decision tree:**

```
Slow queries?
   → Add indexes / rewrite (step 1)

Same data read repeatedly?
   → Cache (step 2)

DB CPU > 80%?
   → Scale up (step 3)

Read-heavy ratio (>10:1)?
   → Read replicas (step 4)

Many connections?
   → PgBouncer (step 5)

Repeated expensive aggregates?
   → Materialized view / rollup table (step 6)

Single huge table?
   → Partition (step 7)

Hit vertical limit AND can't shard logically?
   → Last resort: shard (step 8)
```

**Specific tools:**

| Need | Tool |
|---|---|
| Postgres horizontal scale | Citus, pg_shard |
| MySQL horizontal scale | Vitess (used by YouTube, GitHub) |
| New SQL with scale built-in | CockroachDB, YugabyteDB, Spanner, TiDB |
| Multi-master KV | DynamoDB Global Tables, Cassandra |
| Caching layer | Redis, Memcached |
| Read replica routing | Application-side, ProxySQL, pgpool-II |

**Materialized views vs rollup tables:**

| Mechanism | Detail |
|---|---|
| **Materialized view** | DB-managed cached query; refresh on schedule or trigger |
| **Rollup table** | App-managed denormalized summary table |
| Both | Trade staleness for fast reads |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Sharding before exhausting cache + replicas | Operational pain for premature optimization |
| Wrong shard key (low cardinality) | Hot shards |
| Cross-shard JOIN at scale | Performance cliff |
| Not handling replica lag in app | Users see their writes disappear |
| No connection pooler | Hits Postgres connection limit |
| App pool > Postgres `max_connections` | "Too many connections" |
| Schema change deployed to one shard, not others | Data inconsistency |
| Picking shard key that doesn't appear in most queries | Random shard hit per query |
| Read replica for write target | "Database is read-only" errors |
| Multi-region writes without conflict resolution | Lost writes |

**Cross-references:**

- Postgres locking + transactions: [transactions_*.md](../../database_engineering/transaction_isolation_levels_acid_mvcc_serializable.md)
- PgBouncer details: [pgbouncer_*.md](../../database_engineering/postgresql/pgbouncer_transaction_mode_vs_session_mode.md)
- Partitioning tools: [pgslice_partman_*.md](../../database_engineering/postgresql/pg_slice_vs_pg_partman_partitioning.md)
- Concurrent migrations: [adding_indexes_*.md](../../database_engineering/adding_indexes_10m_row_large_tables_concurrent_migration.md)
- Caching strategies: [caching_strategies_*.md](../patterns/caching_strategies_redis_memcached_invalidation.md)

**Rule of thumb:** **Optimize → cache → scale up → replicas → pool → partition → shard.** Sharding is the **most expensive** scaling move and **never reverses cleanly** — exhaust everything else first. **Always use a connection pooler** (PgBouncer / RDS Proxy) above ~50 app processes. **Read replicas + read-your-writes routing** handles most read-heavy workloads. Use **consistent hashing** if you must shard.
