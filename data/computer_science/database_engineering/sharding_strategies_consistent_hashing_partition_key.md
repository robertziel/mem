### Database Sharding (Strategies, Consistent Hashing, Partition Key)

**Sharding vs partitioning — don't conflate:**

| | **Partitioning** | **Sharding** |
|---|---|---|
| Where the split lives | One database server, multiple physical partitions | Multiple database servers |
| Operational complexity | Low — DB-engine feature (PG declarative partitioning, MySQL RANGE/HASH) | High — app routing, cross-shard ops |
| Solves | Big tables, query pruning, cheap drops of old data | Single-server write/storage limit |
| Order to apply | **First** | **Only after partitioning + read replicas + caching no longer cope** |

**Before sharding — exhaust these first:**

| Step | Why try first |
|---|---|
| Query optimization (indexes, EXPLAIN) | Often the real problem |
| Read replicas | Splits read load without app changes |
| Caching (Redis, materialized views) | Removes hot reads from the DB entirely |
| Vertical scaling (bigger box) | Cheap until you hit the largest instance |
| Table partitioning inside one DB | Solves big-table issues without distribution |

**Picking the partition key — the single most important decision:**

| Property | Why it matters | Example |
|---|---|---|
| **High cardinality** | Many distinct values → fine-grained distribution | `user_id` ✅, `country` ❌ (only ~200) |
| **Even distribution** | No hot shards | Avoid `created_at` (newest is hottest) as raw key |
| **Used in queries** | Most queries route to one shard | If you mostly query `WHERE user_id=…`, shard by `user_id` |
| **Stable** | Doesn't change after row creation | `user_id` ✅, `email` ❌ (users change email) |
| **Co-locates related data** | Joins/transactions stay within a shard | Tenant ID for multi-tenant SaaS |

**Sharding strategies:**

| Strategy | Mapping | Distribution | Range queries | Add shards | Hot-spot risk | Best for |
|---|---|---|---|---|---|---|
| **Hash-based (mod)** | `shard = hash(key) % N` | Even | ❌ Cross-shard | Rehash everything (bad) | Low | Naive starting point — don't ship to prod |
| **Consistent hashing** | Hash key → ring → next node | Even (with virtual nodes) | ❌ Cross-shard | **~1/N keys move** | Low | **Default for hash-style sharding** |
| **Range-based** | `[min..max]` of key per shard | Can be uneven | ✅ Within shard | Split a range — easy | High (newest data is hot) | Time-ordered data with bounded recency |
| **Geographic** | Region → shard | Uneven (region sizes differ) | ✅ Within region | Per-region capacity | Low if traffic mirrors regions | Compliance, latency-sensitive global apps |
| **Directory (lookup table)** | `key → shard_id` map | Fully flexible | ❌ | Move individual keys | Per-key control | Hot-tenant isolation, "noisy neighbor" rebalancing |
| **Hierarchical / composite** | Hash by tenant, range within | Even across tenants | ✅ Within tenant | Per-tenant | Low | Multi-tenant SaaS (the common shape) |

> **Consistent hashing matters because plain `hash % N` requires re-hashing nearly every key when N changes.** Consistent hashing places nodes on a ring; adding or removing a node only moves the keys between adjacent points — O(K/N) keys instead of O(K). **Virtual nodes** smooth distribution and reduce hot-spotting.

**Cross-shard problems and what to do:**

| Problem | Fix |
|---|---|
| **Cross-shard JOINs** | Denormalize (store joined fields), or do app-level joins (multi-shard fan-out + merge), or co-locate related rows on same shard via shared partition key |
| **Cross-shard transactions** | Saga pattern (compensating actions), eventual consistency with outbox + reconciliation, or 2PC (slow, fragile — last resort) |
| **Cross-shard count / aggregate** | Per-shard query + merge in app; or precompute via async pipeline |
| **Cross-shard secondary index** | Per-shard local indexes; for global lookup, maintain a separate shard-of-indexes (or a search engine like Elasticsearch) |
| **Cross-shard ordering / pagination** | Cursor-based pagination per shard with a heap-merge in the app; absolute "page 47" is not feasible |

**Rebalancing — when a shard outgrows or runs hot:**

| Strategy | Cost | Notes |
|---|---|---|
| Consistent hashing + virtual nodes | Low — ~1/N keys move | Default for new systems |
| Range-based: split the range | Medium — half the data moves | Plan for online split (dual-write) |
| Directory-based: move specific keys | Per-key — minimal data motion | Ideal for moving one noisy tenant |
| Resharding (add 2× shards, halve ranges) | High but predictable | Common for planned growth steps |

**ID generation — the "no auto-increment across shards" problem:**

| Approach | Pros | Cons |
|---|---|---|
| **UUID v4** (random) | No coordination | 16 bytes, random → bad PK locality (page splits in InnoDB) |
| **UUID v7** (time-ordered) | No coordination, sortable | Requires v7-aware lib |
| **Snowflake ID** (Twitter) | 64-bit, time-ordered, decentralized | Need worker-id allocation |
| **Sequence service** (e.g., ZooKeeper, etcd, dedicated DB) | Strict ordering possible | Service is hot path, SPoF |
| **Per-shard range allocation** | Simple, local | Sequences not global-ordered |

**Snowflake ID layout (64 bits):**

| Bits | Field | Range |
|---|---|---|
| 1 | sign (unused) | always 0 |
| 41 | timestamp (ms since custom epoch) | ~69 years |
| 10 | machine id (datacenter 5 + worker 5) | 1024 workers |
| 12 | sequence within ms | 4096 IDs / ms / worker |

Result: globally unique, time-sortable, BIGINT-compatible, no coordination across shards.

**Pitfalls:**

| Pitfall | Why it bites |
|---|---|
| Sharding before exhausting cheaper options | Operational cost is huge; partition + replicate first |
| Choosing a low-cardinality key (e.g. `country`) | Few hot shards; impossible to balance |
| Choosing a key that mutates (e.g. `email`) | Row "moves" between shards on update |
| Using `hash % N` instead of consistent hashing | Adding capacity rebuilds the world |
| Cross-shard JOINs left in code | Fan-out destroys latency at scale |
| Forgetting global secondary indexes | Need per-shard scans for non-key lookups |
| One giant tenant on one shard | Hot shard — directory-based moves help |
| Auto-increment PKs across shards | ID collisions; use Snowflake / UUID v7 |

**Rule of thumb:** **partition first, shard when one box can't keep up.** For SaaS, **shard by `tenant_id` (composite with `user_id` if needed)** — co-locates one tenant's data, makes most queries shard-local. Use **consistent hashing with virtual nodes** so adding capacity moves ~1/N of the keys, not all of them. **Snowflake or UUID v7** for primary keys. Plan cross-shard operations (joins, aggregates) **before** they become emergencies — they're hard to retrofit.
