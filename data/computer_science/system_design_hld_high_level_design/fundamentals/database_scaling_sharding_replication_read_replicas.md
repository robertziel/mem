### Database Scaling

**Vertical scaling (scale up):**
- Bigger machine (more CPU, RAM, faster disk)
- Simplest, no code changes
- Hard limit: biggest available machine
- Use first, switch to horizontal when you hit the ceiling

**Read replicas:**
- Asynchronous copies of the primary database
- Route reads to replicas, writes to primary
- Replication lag: replicas may be slightly behind (eventually consistent)
- Use for: read-heavy workloads, reporting queries, geographic distribution

```
Writes -> [Primary]
Reads  -> [Replica 1] [Replica 2] [Replica 3]
```

**Sharding (horizontal partitioning):**
- Split data across multiple database instances
- Each shard holds a subset of the data
- Dramatically increases write capacity

**Sharding strategies:**
| Strategy | How | Pros | Cons |
|----------|-----|------|------|
| Hash-based | `shard = hash(key) % N` | Even distribution | Hard to re-shard |
| Range-based | Shard by range (A-M, N-Z or date) | Range queries easy | Hot spots possible |
| Geographic | Shard by region | Data locality | Cross-region queries hard |
| Directory | Lookup table maps key->shard | Flexible | Lookup table is SPOF |

**Consistent hashing:**
- Solves the re-sharding problem with hash-based sharding
- When adding/removing a shard, only ~1/N keys need to move (not all)
- Used by: DynamoDB, Cassandra, Memcached

**Sharding challenges:**
- **Cross-shard queries** - JOINs across shards are expensive/impossible
- **Transactions** - no native cross-shard transactions (need saga pattern)
- **Rebalancing** - moving data when adding shards
- **Hot shards** - uneven distribution (celebrity problem)
- **Schema changes** - must apply to all shards
- **Operational complexity** - N databases to monitor, backup, upgrade

**When to shard:**
1. First: optimize queries, add indexes
2. Then: read replicas for read scaling
3. Then: caching layer (Redis)
4. Then: vertical scaling
5. Last resort: sharding (highest complexity)

**Connection pooling:**
- PgBouncer, ProxySQL, RDS Proxy
- Reuse DB connections across app instances
- Prevents connection exhaustion (PostgreSQL: ~max 500 connections)
- Transaction mode vs session mode (transaction mode for most web apps)

**Rule of thumb:** Optimize queries -> cache -> read replicas -> vertical scaling -> shard. Sharding is a last resort due to operational complexity. Use consistent hashing if you must shard. Always use connection pooling.
