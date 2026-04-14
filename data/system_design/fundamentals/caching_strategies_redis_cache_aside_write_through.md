### Caching Strategies

**Why cache:**
- Reduce latency (memory vs disk/network)
- Reduce load on databases and downstream services
- Absorb traffic spikes

**Caching patterns:**

| Pattern | How it works | Use case |
|---------|-------------|----------|
| **Cache-aside** | App reads cache; on miss, reads DB and fills cache | Most common, general purpose |
| **Read-through** | Cache itself fetches from DB on miss | Simpler app code, cache library handles |
| **Write-through** | Write to cache and DB synchronously | Strong consistency, higher write latency |
| **Write-behind** | Write to cache, async flush to DB | Low write latency, risk of data loss |
| **Write-around** | Write directly to DB, bypass cache | Write-heavy with infrequent reads |

**Cache-aside (most common):**
```
Read:  App -> Cache hit? -> return
              Cache miss? -> read DB -> write to cache -> return

Write: App -> write DB -> invalidate cache
```

**Cache invalidation strategies:**
- **TTL (Time-To-Live)** - expire after N seconds (simplest, eventual consistency)
- **Event-driven** - invalidate on write/update event
- **Write-through** - cache always up-to-date (but adds write latency)
- **Versioning** - include version in cache key, bump on change

**Cache eviction policies:**
- **LRU (Least Recently Used)** - evict oldest accessed (most common)
- **LFU (Least Frequently Used)** - evict least accessed overall
- **FIFO** - evict oldest inserted
- **Random** - surprisingly effective at scale

**Caching layers:**
1. **Browser cache** - Cache-Control headers, service worker
2. **CDN** - edge caching for static assets and cacheable responses
3. **Application cache** - Redis/Memcached for computed results, sessions
4. **Database cache** - query cache, buffer pool (internal to DB)

**Cache thundering herd:**
- Problem: cache expires, thousands of requests hit DB simultaneously
- Solutions:
  - **Lock/mutex**: first request locks, fetches from DB, fills cache; others wait
  - **Stale-while-revalidate**: serve stale data while one request refreshes
  - **Jittered TTL**: randomize expiry to avoid simultaneous invalidation

**Redis vs Memcached:**
| Feature | Redis | Memcached |
|---------|-------|-----------|
| Data structures | Strings, lists, sets, hashes, sorted sets | Strings only |
| Persistence | Optional (RDB, AOF) | None |
| Replication | Built-in | None |
| Pub/Sub | Yes | No |
| Threading | Single-threaded (mostly) | Multi-threaded |
| Best for | Versatile caching, sessions, queues | Simple key-value, large cache pools |

**Rule of thumb:** Start with cache-aside + TTL (simplest). Use Redis over Memcached unless you only need simple string caching. Always plan for cache failure (fallback to DB). Never cache without an invalidation strategy.
