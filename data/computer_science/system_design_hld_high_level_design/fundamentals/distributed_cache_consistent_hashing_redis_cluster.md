### Distributed Cache (Consistent Hashing, Redis Cluster, Hot Keys)

**Why a cache exists:**

| Goal | Win |
|---|---|
| Sub-millisecond reads | RAM beats disk by 1000× |
| Offload primary DB | Reads served by cache, DB handles writes |
| Smooth traffic spikes | Burst absorbed by cache, not the DB |
| Pre-compute expensive results | Aggregations / ML inference cached |
| Session storage | Stateless app servers |

**Cache topologies — pick by scale + availability needs:**

| Topology | Detail | Use when |
|---|---|---|
| **Single node** | One Redis / Memcached process | Dev, small services |
| **Replicated** (primary + replicas) | One writer, many readers | Read-heavy single-region |
| **Sharded** (multiple primaries) | Each shard owns a key range | Horizontal scaling |
| **Sharded + replicated** (Redis Cluster, Memcached + mcrouter) | Best of both | Production default |
| **Client-side sharded** (consistent hashing in client) | App-level routing | Memcached classic |
| **Multi-region replication** | Cross-region async replication | Global apps with eventual consistency |

**Sharding strategies:**

| Strategy | How | Pros | Cons |
|---|---|---|---|
| **`hash(key) % N`** (naive) | Modulo over node count | Trivial | **Adding a node remaps almost all keys** |
| **Consistent hashing** | Map nodes + keys to a ring; key → first clockwise node | ~`1/N` keys move on add/remove | Distribution can skew; needs **virtual nodes** |
| **Consistent hashing + virtual nodes** | Each physical node has N positions on the ring | Smoother distribution, cheaper rebalance | Slight memory overhead per node |
| **Hash slots** (Redis Cluster) | Fixed 16,384 slots → nodes | Deterministic; supports multi-key ops within a slot | Slot rebalancing requires migration steps |
| **Range partitioning** | Key ranges per node | Supports range scans | Hot-spot risk on time-ordered keys |
| **Directory-based** | Lookup table `key → node` | Per-key flexibility | Lookup table is a SPoF / bottleneck |

> See also: [database_engineering/sharding_strategies_*.md](../../database_engineering/sharding_strategies_consistent_hashing_partition_key.md) — same concepts, applied to a database.

**Consistent hashing — the picture:**

```
Hash ring (0 .. 2^32):
       [N1]
        ▲
  [N3]──┼──[N2]
        │
  hash(key) lands here  ─►  walks clockwise to first node = owner

Add N4: only keys between N3 and N4 move.
Remove N1: keys that mapped to N1 move to next clockwise node.
```

**Why virtual nodes:**

| Without vnodes | With vnodes (e.g. 100 per physical node) |
|---|---|
| Distribution depends on hash luck | Smoother by central limit theorem |
| Removing one node sends all its load to a single neighbor | Load spreads evenly to all surviving nodes |
| Adding a node steals a wedge from one neighbor | Steals a little from each |

**Replication — for availability:**

| Strategy | Detail |
|---|---|
| Primary–replica | One write target, replicas serve reads |
| Async replication | Lower latency, can lose recent writes on failover |
| Sync replication | Stronger durability; blocks on slow replica |
| Quorum (W + R > N) | Tunable; e.g., N=3, W=2, R=2 |
| Multi-region async | Eventual consistency between regions |

**Redis Cluster specifics:**

| Concept | Detail |
|---|---|
| **16384 hash slots** | Each key hashes to a slot (`CRC16(key) mod 16384`) |
| Slots → nodes | Manually or auto-assigned |
| **Hash tags** (`{user:123}.profile`) | Force keys to the same slot — required for multi-key ops |
| **`MOVED`** redirect | Client called wrong node — server tells it where to go |
| **`ASK`** redirect | During slot migration; one-shot redirect |
| **Replicas** | Each primary has 0..N replicas; auto-failover on primary loss |
| **No cross-slot transactions** | `MULTI`/`EXEC` only within one slot |
| **No cross-slot scripts** by default | Lua `EVAL` constrained to slots referenced by keys |
| Gossip protocol | Cluster nodes exchange state every second |
| Quorum on failover | Majority of primaries must agree to promote a replica |

**Multi-key operations under sharding:**

| Operation | Across slots? |
|---|---|
| `MGET k1 k2 k3` | ❌ unless hash-tagged into same slot |
| `MULTI`/`EXEC` transaction | ❌ same |
| `EVAL` Lua script | ❌ keys must be in same slot |
| `SUNIONSTORE`, `ZUNIONSTORE` | ❌ keys must be in same slot |
| Hash-tag pattern `user:{1234}:cart` and `user:{1234}:profile` | ✅ same slot |

**Eviction policies (when memory full):**

| Policy | Picks |
|---|---|
| `noeviction` (default-ish in Redis 4+) | Refuse new writes — errors |
| `allkeys-lru` | Least recently used across all keys |
| `volatile-lru` | LRU among keys with TTL |
| `allkeys-lfu` | Least frequently used (better for steady hot keys) |
| `volatile-lfu` | LFU with TTL |
| `allkeys-random` | Random victim |
| `volatile-random` | Random among TTL'd |
| `volatile-ttl` | Shortest TTL first |

> Redis 4+ default for cache use cases: `allkeys-lru` (or `allkeys-lfu` for stable workloads).

**TTL strategies:**

| Strategy | When |
|---|---|
| Fixed TTL (e.g., 5 min) | General-purpose freshness |
| Sliding TTL (refresh on read) | Sessions |
| TTL with **jitter** | Prevents synchronized expiry → cache stampede |
| No TTL + explicit invalidation | When freshness is event-driven |
| Short TTL on hot keys | Allow correction without stale serving |

**Cache update patterns — how the cache stays current:**

| Pattern | How |
|---|---|
| **Cache-aside** (lazy-load, most common) | App reads cache → miss → reads DB → writes cache |
| **Read-through** | Cache library fetches from DB on miss |
| **Write-through** | Write to cache + DB synchronously |
| **Write-back** (write-behind) | Write to cache, async write to DB later — risk of loss |
| **Refresh-ahead** | Background refresh of soon-to-expire hot keys |

**Cache-aside example (Ruby/Python pseudo):**

```python
def get_user(uid):
    v = cache.get(f"user:{uid}")
    if v is not None:
        return v
    v = db.fetch_user(uid)
    cache.set(f"user:{uid}", v, ex=300)
    return v
```

**Invalidation strategies:**

| Strategy | Detail |
|---|---|
| TTL expiration | Cheap, simple, eventually consistent |
| Explicit `DEL` on write | Pair with the write transaction |
| Pub/sub fan-out | Notify all caches of an invalidation |
| CDC (Debezium) | DB changes drive cache invalidation events |
| Versioning the key | Bump key suffix on schema change to retire old |
| Tagged invalidation | Group keys by tag; invalidate the tag |

> "There are only two hard things in CS: cache invalidation and naming things." — pick a strategy at design time, not after a stale-data bug.

**Cache stampede / thundering herd:**

| Cause | Mitigation |
|---|---|
| Many requests miss the same key simultaneously | **Single-flight / lock-and-load** — one fetcher, others wait |
| Synchronized expiry on a popular key | Add jitter to TTL |
| Cold start after a flush | Pre-warm cache; tier with local L1 |
| Hot key falls out under LRU pressure | Pin via separate eviction class or replicate |

**Hot-key problem — one key dominates:**

| Mitigation | Detail |
|---|---|
| **L1 in-process cache** | Each app server caches the hot key locally with very short TTL (1–10 s) |
| **Key replication / fan-out** | Store the key with a random suffix (`hot:1`, `hot:2`...); reads pick a random replica |
| **Read from replicas** | Spread reads across primary + replicas |
| **Sharding the value** | Split a hot list into chunks (`feed:0..n`) |
| **Edge cache / CDN** | Serve at the edge for read-mostly content |

**Cache failure modes:**

| Failure | Impact | Defense |
|---|---|---|
| Cache down | All reads hit DB → meltdown | Circuit breaker; serve stale; degrade gracefully |
| Cache partitioned (split brain) | Inconsistent state across clients | Quorum elections; client retries with `MOVED` |
| Cold start after restart | Stampede on warm-up | Pre-warm; tier with local L1 |
| Slow eviction | Latency spikes | Use Redis 6+ multithreaded I/O; size memory headroom |
| Memory full | Writes fail (with `noeviction`) | Tune eviction; alert at 80% used |
| Replication lag | Stale read on replica | Read from primary if strict freshness needed |

**L1 + L2 cache pattern (very common in production):**

| Tier | Where | Latency | Capacity | Use |
|---|---|---|---|---|
| L1 | In-process (Caffeine, Guava, sync.Map) | nanoseconds | MB | Hottest keys, short TTL |
| L2 | Distributed (Redis, Memcached) | < 1 ms | GB–TB | Most keys |
| L3 | Source (DB, API) | 5–100 ms | "infinite" | Source of truth |

**Tooling map:**

| Tool | Notes |
|---|---|
| **Redis** | Most popular; rich data structures (sets, sorted sets, streams, bitmap, geo) |
| **Redis Cluster** | Native sharding |
| **Redis Sentinel** | HA without sharding |
| **Memcached** | Simpler, stateless, multithreaded; client-side sharding |
| **DynamoDB DAX** | AWS-managed in-front-of DynamoDB |
| **Hazelcast / Apache Ignite** | JVM-friendly distributed caches with compute |
| **CDN (CloudFront, Fastly, Cloudflare)** | Edge cache for HTTP responses |
| **Caffeine** (JVM) / **lru-cache** (Node) | Local in-process L1 |
| **mcrouter** | Memcached proxy with consistent hashing |
| **Twemproxy / nutcracker** | Older sharding proxy |

**Observability — metrics that matter:**

| Metric | Healthy |
|---|---|
| **Hit rate** | > 95% for caches that have run-up time; < 50% means something's wrong |
| Latency p99 | < 1–2 ms |
| Memory used | < 80% of `maxmemory` |
| Eviction rate | Low and steady; spikes mean working set exceeds capacity |
| Connection count | Below client + cluster limits |
| Replica lag | Bounded |
| `MOVED` / `ASK` redirect rate | Should be near zero in steady state |
| Slow log | Inspect periodically for offending commands |

**Capacity sizing rough rules:**

| Decision | Rule |
|---|---|
| Memory per node | Working set + 30% headroom for fragmentation + replication |
| Number of replicas | At least 1 for HA; 2 for cross-AZ |
| `maxmemory-policy` | `allkeys-lru` for cache; `noeviction` for queue / structure-heavy use |
| Slot count (Redis Cluster) | 16384 fixed; can't change |
| Connection pool size | Per-app-pod, not per-thread; reuse |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| `hash(key) % N` sharding | All keys remap when N changes |
| No virtual nodes | Skewed distribution after rebalance |
| Caching non-idempotent computations | Wrong results across hits |
| Long TTL + no invalidation | Stale data forever |
| Same TTL for every key | Synchronized expiry cliff |
| No jitter | Stampede |
| Cache as primary store | Eviction = data loss; use real DB |
| Multi-key ops without hash tags in cluster | Cross-slot errors |
| Ignoring `MOVED` redirects | Client treats them as errors |
| Storing huge values (`> 1 MB`) | Memory + bandwidth blow-up; chunk or move to object store |
| No monitoring on hit rate | Hidden regression after a code change |
| Single Redis node serving prod | One restart = outage |

**Rule of thumb:** **consistent hashing with virtual nodes** for distribution; **Redis Cluster's 16384 slots** if you want native sharding + HA. **Cache-aside is the default**; pair with **TTL + jitter + invalidation on writes**. Always run **L1 (in-process) + L2 (distributed)** for hot reads. Watch **hit rate** and **eviction rate** — they're the early warning. Plan for cache failure: **circuit breaker + degraded path to the DB**, never let one Redis blip take down the app.
