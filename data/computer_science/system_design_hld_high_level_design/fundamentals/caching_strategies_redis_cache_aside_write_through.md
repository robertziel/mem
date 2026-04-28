### Caching Strategies — Cache-aside, Write-through, Eviction, Invalidation

**Definition:** five caching patterns each trade **consistency vs performance vs complexity**. **Cache-aside** is the most common general-purpose pattern. Add a TTL or event-driven invalidation strategy, eviction policy (typically LRU), and a thundering-herd defense. Reach for **Redis** over **Memcached** by default — more data structures, persistence, replication.

**Why cache:**

| Win | Detail |
|---|---|
| Reduce latency | RAM is 100× faster than network/disk |
| Offload primary store | DB CPU and IO drop |
| Absorb traffic spikes | Burst protection |
| Lower infra cost | One Redis cheaper than scaling DB |
| Bring data closer | Edge caching (CDN) |

**Five caching patterns:**

| Pattern | How | Use case |
|---|---|---|
| **Cache-aside** | App reads cache; on miss, reads DB and fills cache | **Most common, general purpose** |
| **Read-through** | Cache library fetches from DB on miss | Simpler app code |
| **Write-through** | Write to cache and DB synchronously | Strong consistency, slower writes |
| **Write-behind** | Write to cache, async flush to DB | Low write latency, risk of loss |
| **Write-around** | Write to DB, skip cache | Write-heavy + infrequent reads |

**Cache-aside (the default):**

```
   READ:
     App → Cache.get(key)
       → hit  → return value
       → miss → DB.fetch(key) → Cache.set(key, value, ttl) → return

   WRITE:
     App → DB.update(...) → Cache.invalidate(key)
```

| Property | Detail |
|---|---|
| App-controlled | No magic |
| Lazy population | Only fills cache for accessed data |
| Cache miss = DB hit | First access slow |
| Cache failure = fall back to DB | Resilience built-in |
| **Risk**: stale cache after write | TTL or invalidation |

**Write-through (consistency over speed):**

```
   WRITE:
     App → Cache.set(key, value)
       ↓
       DB.update(key, value)
       ↓
       return success only when both succeed
```

| Property | Detail |
|---|---|
| Cache always up-to-date | Strong consistency |
| Slower writes | Two network hops |
| All writes go through cache | Even cold ones |
| Use when | Read latency critical, accept slower writes |

**Write-behind (async, fast writes):**

```
   WRITE:
     App → Cache.set(key, value) → return immediately
                    ↓ (async)
                    DB.update(key, value)  (eventually)
```

| Property | Detail |
|---|---|
| Fastest writes | DB lag |
| **Risk**: data loss on crash | Cache failure before flush |
| Use when | Throughput > durability for some writes |
| Common in | Counters, analytics, write-heavy with eventual persistence OK |

**Write-around (cold write path):**

| Property | Detail |
|---|---|
| Write directly to DB | Skip cache |
| Cache populated on first read | Lazy |
| Use when | Writes far outnumber reads (logs, audit) |

**Cache invalidation strategies:**

| Strategy | Detail |
|---|---|
| **TTL** | Expire after N seconds (simplest, eventual consistency) |
| **Event-driven** | Invalidate on write/update event |
| **Write-through** | Always up-to-date (slower writes) |
| **Versioning** | Include version in key; bump on change |
| **Stale-while-revalidate** | Serve stale + fetch fresh in background |
| **Probabilistic early expiration** | Refresh before TTL hits |

**Cache key design:**

| Pattern | Example |
|---|---|
| Resource-based | `user:42:profile` |
| Versioned | `user:42:v3:profile` (bump on schema change) |
| Hashed | `query:<sha256(sql)>` |
| Per-tenant | `tenant:9:user:42` |
| User-scoped | `user:42:dashboard` |
| Avoid: too generic | `users` (one big key) — use scoping |

**Cache eviction policies:**

| Policy | Detail | Use |
|---|---|---|
| **LRU** (Least Recently Used) | Evict oldest accessed | **Most common, default** |
| **LFU** (Least Frequently Used) | Evict least accessed | Hot keys stay |
| **FIFO** | Evict oldest inserted | Time-bounded scenarios |
| **Random** | Evict random | Surprisingly OK at scale |
| **TTL-aware** | Evict shortest TTL | Time-sensitive |

**Caching layers (defense in depth):**

```
   ┌────────────────┐
   │ Browser cache   │   Cache-Control headers, service worker
   └────────┬───────┘
            ▼
   ┌────────────────┐
   │ CDN (CloudFront,│   Edge caching of static + cacheable HTML
   │ Cloudflare)     │
   └────────┬───────┘
            ▼
   ┌────────────────┐
   │ Reverse proxy   │   Varnish, NGINX (full HTML)
   └────────┬───────┘
            ▼
   ┌────────────────┐
   │ App layer      │   Fragment cache (Rails), Redis low-level cache
   │ + Redis         │
   └────────┬───────┘
            ▼
   ┌────────────────┐
   │ Database cache  │   Buffer pool, query cache (DB-internal)
   └─────────────────┘
```

**Thundering herd — the cache-stampede problem:**

```
T0: Cache key expires
T1: 1000 simultaneous requests miss cache
T2: All 1000 hit DB at once → DB overloaded
```

**Solutions:**

| Solution | Detail |
|---|---|
| **Lock / mutex** | First request locks, fetches DB, fills cache; others wait |
| **Stale-while-revalidate** | Serve stale data while one request refreshes |
| **Jittered TTL** | Randomize expiry to avoid simultaneous invalidation |
| **Probabilistic early expiration** | Refresh before TTL hits |
| **Request coalescing** | Library de-dupes concurrent requests for same key |

**Redis vs Memcached:**

| Feature | **Redis** | **Memcached** |
|---|---|---|
| Data structures | Strings, lists, sets, hashes, sorted sets, streams | Strings only |
| Persistence | Optional (RDB, AOF) | None |
| Replication | Built-in | None |
| Pub/Sub | Yes | No |
| Threading | Single-threaded (mostly) | Multi-threaded |
| Atomic ops | Many (`INCR`, transactions, Lua) | Limited |
| Use case | **Versatile caching, sessions, queues, locks** | Pure key-value, large pools |

> **Default to Redis.** Pick Memcached only if you need pure-string KV at extreme scale.

**Cache-friendly data patterns:**

| Pattern | Detail |
|---|---|
| Hot keys + cold tail (Pareto) | 80/20 — small set of hot keys serves most traffic |
| Read-heavy | Reads >> writes (cache pays off) |
| Computable from inputs | Cacheable by canonical key |
| Stable for > seconds | Worth caching (vs sub-second changes) |

**Anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| No TTL | Memory leak, stale forever |
| Caching dynamic per-request data | Cache miss on every request |
| Caching with bad keys (too granular) | Low hit rate |
| Caching with bad keys (too coarse) | Stale on small changes |
| Cache as source of truth | Data loss on cache failure |
| No fallback to DB | Cache outage = app outage |
| Caching user-specific in shared cache without scoping | Cross-user leak |
| Massive single key | Hot-key throttling |
| Forgetting cache invalidation in event handlers | Stale data |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Negative caching (caching "not found") needed | First request still hits DB on misses |
| Cold-start after deploy | Empty cache → DB stampede |
| Cache region misaligned with DB region | Cross-region latency |
| Single Redis without HA | SPOF |
| Same Redis as DB (in tests / dev) | False confidence |
| Forgetting to monitor cache hit ratio | Don't know if cache is helping |
| TTL too short | Constant DB hits |
| TTL too long | Stale data lingers |

**Observability:**

| Metric | Why |
|---|---|
| **Hit ratio** | Goal: > 80% for hot path |
| **Miss ratio** | Track increases |
| **Memory used** | Approaching maxmemory? |
| **Eviction rate** | Are you sized right? |
| **Latency p99** | Should be sub-ms |
| **Connection count** | Pool sizing |
| **Error rate** | Outages |

**Decision matrix:**

| Need | Pick |
|---|---|
| General-purpose caching | **Cache-aside + TTL + Redis** |
| Strong consistency | Write-through |
| Latency-critical writes | Write-behind (with durability concession) |
| Write-heavy, infrequent reads | Write-around |
| Multi-tenant SaaS | Cache-aside + per-tenant scoping |
| Static + edge | CDN + cache-aside |

**Cross-references:**

- Redis data structures: [redis_data_structures_*.md](../../database_engineering/redis_data_structures_patterns_sorted_set_caching_leaderboard_pub_sub.md)
- Database scaling (caching → replicas → shard): [database_scaling_*.md](database_scaling_sharding_replication_read_replicas.md)
- Distributed locks (cache-fill stampede): [distributed_locks_*.md](../../distributed_systems/distributed_locks_redis_redlock_fencing_token.md)
- HTTP caching (CDN, ETag): [http_caching_*.md](../../frontend/web_fundamentals/http_caching_etag_cache_control_validation.md)

**Rule of thumb:** **Start with cache-aside + TTL — simplest pattern, fits 80% of cases.** Use **Redis** over Memcached unless you need pure string KV at extreme scale. Always plan for **cache failure** (fallback to DB). **Never cache without an invalidation strategy** (TTL is the easiest). Defend against **thundering herd** with **mutex** or **stale-while-revalidate**. Monitor **hit ratio** as your primary cache health signal.
