### Redis — Data Structures & Patterns

**Definition:** Redis is an **in-memory data structure store** — much more than a cache. Six core data types each map cleanly to common patterns: strings (cache, counters), lists (queues), sets (membership), sorted sets (ranking + rate limit), hashes (objects), streams (event log).

**Six core data types:**

| Type | Operations | Time complexity | Common use |
|---|---|---|---|
| **String** | `GET`, `SET`, `INCR`, `EXPIRE` | O(1) | Cache values, counters, sessions, locks |
| **List** | `LPUSH`, `RPUSH`, `LPOP`, `BLPOP`, `LRANGE` | O(1) for ends | Queues, recent items, capped feeds |
| **Set** | `SADD`, `SREM`, `SISMEMBER`, `SINTER` | O(1) | Tags, unique items, social graphs |
| **Sorted Set** | `ZADD`, `ZRANGE`, `ZRANGEBYSCORE`, `ZRANK` | O(log N) | Leaderboards, rate limiting, priority queues |
| **Hash** | `HSET`, `HGET`, `HGETALL`, `HINCRBY` | O(1) per field | User profiles, object storage |
| **Stream** | `XADD`, `XREAD`, `XREADGROUP` | O(log N) | Event streaming, durable queues |

**Common patterns — six recipes:**

| Pattern | Type | Sketch |
|---|---|---|
| Cache-aside | String | `GET` → miss → `SET key val EX 3600` |
| Session store | String / Hash | `SET session:abc {json} EX 1800` |
| Rate limiter (sliding window) | Sorted set | `ZADD` + `ZREMRANGEBYSCORE` + `ZCARD` |
| Leaderboard | Sorted set | `ZADD` score; `ZREVRANGE 0 9` for top 10 |
| Distributed lock | String | `SET key uid NX EX 30` + Lua release |
| Job queue | List | `LPUSH` enqueue, `BRPOP` worker |
| Event log | Stream | `XADD` produce, `XREADGROUP` consume |
| Pub/Sub fan-out | Pub/Sub | `SUBSCRIBE` / `PUBLISH` (no replay) |

**Cache-aside (most common):**

```
GET user:42
   miss → SELECT * FROM users WHERE id=42
        → SET user:42 '<json>' EX 3600
        → return
   hit  → return cached
```

**Sliding-window rate limiter:**

```redis
EVAL "
  redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[1] - ARGV[2])
  local count = redis.call('ZCARD', KEYS[1])
  if count >= tonumber(ARGV[3]) then return 0 end
  redis.call('ZADD', KEYS[1], ARGV[1], ARGV[1])
  redis.call('PEXPIRE', KEYS[1], ARGV[2])
  return 1
" 1 rl:user:42 <now_ms> <window_ms> <limit>
```

**Leaderboard:**

```redis
ZADD scores 1500 "alice"
ZADD scores 2300 "bob"
ZADD scores 1800 "charlie"

ZREVRANGE scores 0 9 WITHSCORES   # top 10
ZRANK    scores "alice"            # position from bottom
ZREVRANK scores "alice"            # position from top
ZSCORE   scores "alice"            # exact score
```

**Distributed lock — atomic acquire + Lua release:**

```redis
SET lock:resource <unique_id> NX EX 30      # acquire (atomic)

EVAL "
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  else
    return 0
  end
" 1 lock:resource <unique_id>               # release (atomic compare-and-delete)
```

**Pub/Sub vs Streams — when to use which:**

| Pub/Sub | Streams |
|---|---|
| Fire-and-forget | Persistent log |
| No replay (subscribers must be online) | Replay supported |
| No consumer groups | Consumer groups (load balancing) |
| Lower latency | Slightly more overhead |
| Lost on disconnect | Durable until trim |
| Good for live notifications | Good for event sourcing, durable queues |

**Persistence options:**

| Mode | Detail | Trade-off |
|---|---|---|
| **RDB** (snapshot) | Periodic point-in-time snapshot | Fast restart; lose minutes-hours since last snapshot |
| **AOF** (append-only file) | Log every write | More durable; larger files; slower writes |
| **RDB + AOF** | Both enabled | **Recommended for production** |
| No persistence | Pure in-memory | Lose all on restart (cache-only) |

**Eviction policies (when memory full):**

| Policy | Behavior | Use case |
|---|---|---|
| `noeviction` | Return error | Strict — refuses new writes |
| `allkeys-lru` | LRU across all keys | **Default for caching** |
| `allkeys-lfu` | LFU (least frequently used) | Hot keys stay |
| `volatile-lru` | LRU among keys with TTL | Mixed cache + persistent |
| `volatile-lfu` | LFU among keys with TTL | Mixed |
| `allkeys-random` | Random | Rarely used |
| `volatile-ttl` | Soonest-to-expire wins | Time-sensitive |

**Topology — single, Sentinel, Cluster:**

| Topology | Use |
|---|---|
| **Single instance** | Dev, small workloads |
| **Replica(s)** (read scaling) | One primary + N replicas |
| **Sentinel** (HA) | Auto-failover for single-shard primary |
| **Cluster** (sharding) | 16384 hash slots split across N primary nodes; HA per shard |
| **Managed** (ElastiCache, Memorystore, Upstash) | Operational handoff |

**Cluster vs Sentinel:**

| Property | Sentinel | Cluster |
|---|---|---|
| Sharding | No (one primary) | Yes (16384 slots) |
| Failover | Yes | Yes (per shard) |
| Multi-key ops | Full support | Limited (must hash to same slot) |
| Use case | HA single-shard | Horizontal write scale |

**Memory tips:**

| Tip | Detail |
|---|---|
| Always set TTLs on cache keys | Prevent unbounded growth |
| Use Hash for many small fields per object | More compact than many Strings |
| Pipelining for batch operations | Massive throughput win |
| Avoid `KEYS *` in production | O(N), blocks; use `SCAN` |
| Watch `INFO memory` regularly | Eviction warnings |
| Use `MEMORY USAGE key` to debug | Per-key size |

**Pipelining vs MULTI/EXEC:**

| Mechanism | Atomic? | Use |
|---|---|---|
| Pipelining | No (just batched) | Throughput |
| `MULTI / EXEC` | Yes | Atomic ops |
| `EVAL` (Lua) | Yes | Atomic logic |
| `WATCH` | Optimistic | Conditional update |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| `KEYS *` in prod | Blocks Redis (use `SCAN`) |
| No TTL on cache keys | OOM eviction surprises |
| Storing huge values | Slow ops, network choke |
| Pub/Sub for durable messaging | Messages lost on disconnect — use Streams |
| Ignoring eviction policy default (`noeviction`) | OOM errors |
| Lock without Lua release | Releases someone else's lock |
| Single Redis without replica | SPOF |
| Hot keys (one tenant) | Single shard saturated |
| Multi-key ops in Cluster across slots | Cross-slot error — use hash tags `{user}:profile` |

**Decision matrix:**

| Need | Type |
|---|---|
| Cache value | String + TTL |
| Counter | String + INCR |
| Session | Hash or String |
| Rate limit (sliding window) | Sorted Set + Lua |
| Top-N ranking | Sorted Set |
| Membership / dedup | Set |
| Recent N items | List with `LTRIM` |
| Object with many fields | Hash |
| Job queue (simple) | List |
| Event log / durable queue | Stream |
| Distributed lock | String + Lua |
| Live notifications | Pub/Sub |

**Cross-references:**

- Caching strategies (cache-aside, write-through, etc.): [caching_strategies_*.md](../../system_design_hld_high_level_design/patterns/caching_strategies_redis_memcached_invalidation.md)
- Rate limiter (Redis-based): [rate_limiter_redis_*.md](../../system_design_hld_high_level_design/fundamentals/rate_limiter_redis_sorted_sets_sliding_window.md)
- Distributed locks (Redis + correctness): [distributed_locks_*.md](../../distributed_systems/distributed_locks_redis_redlock_fencing_token.md)
- Kafka vs Redis Streams: [event_streaming_*.md](../../data_engineering/kafka_event_streaming_topic_partition_offset.md)

**Rule of thumb:** **Strings for cache, Sorted Sets for ranking and rate limiting, Hashes for objects, Streams for persistent messaging.** Always set **TTLs** on cache keys, use **`allkeys-lru`** eviction, enable **AOF + RDB** persistence in production. Reach for **Cluster** when you need to shard writes; **Sentinel** for HA on a single primary. Never use Pub/Sub when messages must survive disconnects — use Streams.
