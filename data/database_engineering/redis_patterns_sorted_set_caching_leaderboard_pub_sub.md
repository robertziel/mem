### Redis Data Structures and Patterns

**Core data structures:**

| Type | Operations | Use case |
|------|-----------|----------|
| String | GET, SET, INCR, EXPIRE | Cache, counters, sessions |
| List | LPUSH, RPUSH, LPOP, LRANGE | Queues, recent items |
| Set | SADD, SREM, SISMEMBER, SINTER | Tags, unique items, relationships |
| Sorted Set | ZADD, ZRANGE, ZRANGEBYSCORE, ZRANK | Leaderboards, rate limiting, priority queues |
| Hash | HSET, HGET, HGETALL | Objects, user profiles |
| Stream | XADD, XREAD, XREADGROUP | Event streaming, message queue |

**Common patterns:**

**Caching (cache-aside):**
```
GET user:123                        # check cache
-> miss: query DB, SET user:123 EX 3600 json_data
-> hit: return cached data
```

**Session store:**
```
SET session:abc123 '{"user_id":456,"role":"admin"}' EX 1800
GET session:abc123
```

**Rate limiter (sliding window with sorted sets):**
```
MULTI
  ZADD rate:user:123 <now> <request_id>
  ZREMRANGEBYSCORE rate:user:123 0 <now - window>
  ZCARD rate:user:123
  EXPIRE rate:user:123 <window>
EXEC
-> if count > limit: reject
```

**Leaderboard:**
```
ZADD leaderboard 1500 "player:alice"
ZADD leaderboard 2300 "player:bob"
ZREVRANGE leaderboard 0 9 WITHSCORES    # top 10
ZRANK leaderboard "player:alice"         # rank of alice
```

**Distributed lock:**
```
SET lock:resource unique_id NX EX 30     # acquire
# ... do work ...
# release via Lua script (atomic check + delete)
```

**Pub/Sub:**
```
SUBSCRIBE channel:notifications          # subscriber
PUBLISH channel:notifications "new_order" # publisher
```
- Fire and forget (no persistence, no replay)
- Use Redis Streams for persistent messaging

**Queue (simple):**
```
LPUSH queue:jobs '{"type":"email","to":"user@example.com"}'
BRPOP queue:jobs 0    # blocking pop (worker waits for job)
```

**Persistence options:**
- **RDB (snapshotting)** - periodic point-in-time snapshots (faster restart, some data loss)
- **AOF (append-only file)** - log every write operation (more durable, larger files)
- **RDB + AOF** - best of both (recommended for production)
- **No persistence** - pure cache (data lost on restart)

**Redis eviction policies:**
- `noeviction` - return error when memory full
- `allkeys-lru` - evict least recently used (most common for caching)
- `volatile-lru` - evict LRU among keys with TTL set
- `allkeys-random` - evict random keys
- `volatile-ttl` - evict keys with shortest TTL

**Redis Cluster vs Sentinel:**
- **Sentinel** - HA for single-shard Redis (automatic failover, monitoring)
- **Cluster** - horizontal scaling (data sharded across nodes, 16384 hash slots)

**Rule of thumb:** Use strings for simple caching, sorted sets for ranking/rate limiting, hashes for object storage, streams for persistent messaging. Set TTLs on all cache keys. Use `allkeys-lru` eviction for caching workloads. Enable AOF+RDB persistence for data you can't afford to lose.
