### Rate Limiter — Algorithms (Token Bucket, Sliding Window, Leaky Bucket)

**Definition:** a **rate limiter** caps requests per actor per unit of time. Five common algorithms, each with different burst handling, memory cost, and accuracy. **Token bucket** is the most popular for general API limits; **sliding window with sorted sets** is the most precise; **leaky bucket** smooths outbound traffic.

**Algorithms compared:**

| Algorithm | Burst handling | Memory | Accuracy | Complexity | Best for |
|---|---|---|---|---|---|
| **Token Bucket** | Allows up to bucket size | Low (2 fields per actor) | Good | Low | Per-user steady-state w/ bursts |
| **Leaky Bucket** | None — smooth output rate | Low | Good | Medium | Outbound traffic shaping |
| **Fixed Window Counter** | Burst at boundary (2× rate) | Lowest | Approximate | Lowest | Coarse limits |
| **Sliding Window Log** | None | High (timestamps) | Exact | Medium | Audit / low-volume |
| **Sliding Window Counter** | Minimal | Low | Approximate | Medium | High-throughput APIs |

**1. Token Bucket — burst-friendly:**

```
state per key: { tokens, last_refilled_at }
config:        capacity = 10,  refill_rate = 2/sec

on request:
  refill = (now - last_refilled_at) × rate
  tokens = min(capacity, tokens + refill)
  if tokens >= 1: tokens -= 1; allow
  else: deny
  save state
```

| Property | Detail |
|---|---|
| Bucket holds N tokens | `capacity` |
| Refills at rate R per second | Continuous |
| Each request consumes 1 token | Or more for weighted requests |
| Bursts allowed up to `capacity` | Then drains at refill rate |
| Memory | 2 fields per actor |
| Implementation | Lua script on Redis |

**2. Sliding Window Log — exact:**

```
state: sorted set of request timestamps
config: window = 60s, limit = 100

on request:
  ZREMRANGEBYSCORE key 0 (now - window)   # drop expired
  count = ZCARD key
  if count >= limit: deny
  ZADD key now now
  EXPIRE key window
```

| Property | Detail |
|---|---|
| Stores every request timestamp | Big memory |
| Exact accuracy | No edge effects |
| Memory grows with request count | Cap with EXPIRE |
| O(log N) add | O(M) range removal |

**3. Sliding Window Counter — middle ground:**

```
buckets per key: { current_minute: count, prev_minute: count }
config: limit per minute = 100

on request at time t:
  prev_overlap = (60 - (t % 60)) / 60
  weighted = prev_count × prev_overlap + current_count
  if weighted >= limit: deny
  else: increment current
```

| Property | Detail |
|---|---|
| Two fixed-window counters | Current + previous |
| Weighted overlap | Smooth transitions |
| Approximate | Within ~5% accuracy |
| Memory | 2 counters per actor |
| Used by | Cloudflare's algorithm |

**4. Fixed Window Counter — simple but burst-prone:**

```
key = "ratelimit:user:42:minute:2026042714"
INCR key
EXPIRE key 60
if value > limit: deny
```

| Issue | Detail |
|---|---|
| 2× burst possible at boundary | 100 at end of min 1 + 100 at start of min 2 = 200 in 2 seconds |
| Cheapest implementation | Single counter |
| Use only for coarse limits | Dashboards, summary counts |

**5. Leaky Bucket — output smoothing:**

```
state: queue of pending requests
processed at fixed rate
queue full → reject
```

| Property | Detail |
|---|---|
| Smooths burst into steady output | "Drips" out at rate R |
| Adds latency | Queue holds requests |
| Better for outbound | Vendor API rate respect |
| Inbound: same as token bucket effectively | Just framed differently |

**Visual: token vs leaky:**

```
Token bucket (allows bursts):
  Tokens [▓▓▓▓▓▓▓▓▓▓] full → 5 requests → [▓▓▓▓▓░░░░░] → ...

Leaky bucket (smooths):
  Burst:  ▓▓▓▓▓ all at once
  Output: ▓ . ▓ . ▓ . ▓ . ▓  one per second
```

**Distributed implementation — Redis is the common choice:**

| Architecture | Trade-off |
|---|---|
| Centralized Redis | Simple; SPOF unless clustered |
| Redis Sentinel / Cluster | HA; coordination cost |
| Per-node local + sync | Fast; approximate |
| Sticky session | Simple; uneven load |
| Token bucket in-app | Local; doesn't see global |

**Atomic Lua (so multi-step is one operation):**

```lua
-- KEYS[1] = bucket key, ARGV: now, refill_rate, capacity
local data = redis.call('HMGET', KEYS[1], 'tokens', 'last')
local tokens = tonumber(data[1]) or tonumber(ARGV[3])
local last   = tonumber(data[2]) or tonumber(ARGV[1])

local refill = (tonumber(ARGV[1]) - last) * tonumber(ARGV[2])
tokens = math.min(tonumber(ARGV[3]), tokens + refill)

if tokens < 1 then
  return 0   -- denied
end

redis.call('HMSET', KEYS[1], 'tokens', tokens - 1, 'last', ARGV[1])
redis.call('EXPIRE', KEYS[1], 60)
return 1
```

**Where to enforce — defense in depth:**

| Layer | Tool | Strength |
|---|---|---|
| **Edge / WAF** | Cloudflare, AWS WAF | Cheapest, blocks early |
| **API Gateway** | Kong, AWS API Gateway, Apigee | Centralized policy |
| **Reverse proxy** | NGINX `limit_req`, Envoy | No app code |
| **App middleware** | Rack-attack (Rails), Express middleware | Business context |
| **Service-level** | Per-route fine-grained | Most precise |

**Tiered limits — overlay multiple windows:**

| Tier | Limit | Window |
|---|---|---|
| Burst | 10 | 1 second |
| Steady | 100 | 1 minute |
| Hourly | 1000 | 1 hour |
| Daily | 10000 | 1 day |

> Check all tiers; reject if any exceeded. Each is its own bucket.

**Response — be informative:**

```
HTTP/1.1 429 Too Many Requests
Retry-After: 30
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1714400000
```

| Header | Purpose |
|---|---|
| `Retry-After` | Seconds to wait |
| `RateLimit-Limit` | Cap |
| `RateLimit-Remaining` | What's left |
| `RateLimit-Reset` | Epoch when bucket resets |

**Keying strategies:**

| Limit | Key shape |
|---|---|
| Per IP | `rl:ip:1.2.3.4` |
| Per user | `rl:user:42` |
| Per API key | `rl:apikey:abc` |
| Per user + endpoint | `rl:user:42:POST:/orders` |
| Per tenant | `rl:tenant:9` |

> Key by **actor + action**, not just actor.

**Failure handling:**

| Failure | Strategy |
|---|---|
| Redis down | **Fail open** (allow) for general APIs; **fail closed** for audit-critical |
| Redis slow | Tight timeout; degrade gracefully |
| Spike on bucket key | Pre-allocated buckets; sharding |
| Clock skew across nodes | Server-side `now` from Redis |

**Decision matrix:**

| Need | Algorithm |
|---|---|
| User API quota with bursts allowed | **Token bucket** |
| Strict "no burst" outbound | **Leaky bucket** |
| Exact-count accountability | **Sliding window log** |
| High-throughput, approximate | **Sliding window counter** |
| Simple coarse limit | **Fixed window** |
| Multi-tier (burst + steady + hourly) | **Multiple token buckets** |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Non-atomic increment + check | Race; over-limit slips |
| No `EXPIRE` | Memory leaks |
| Single bucket per IP at NAT | Whole office blocked |
| Limiting only at app, not edge | DDoS reaches workers |
| No `Retry-After` header | Clients hammer immediately |
| Same bucket across endpoints | Login abuse blocks reads |
| Different limit per region | Multi-region users get N× |
| Counting failed auth in same bucket | Should be separate, lower limit |

**Cross-references:**

- Redis sliding window deep dive: [rate_limiter_redis_*.md](rate_limiter_redis_sorted_sets_sliding_window.md)
- Caching strategies: [caching_strategies_*.md](../patterns/caching_strategies_redis_memcached_invalidation.md)
- Resilience patterns: [circuit_breaker_*.md](../../distributed_systems/circuit_breaker_retry_backoff_bulkhead_timeout_resilience_patterns.md)

**Rule of thumb:** **Token bucket** is the default for API rate limiting (allows bursts up to N, refills at rate R). Use **sliding window with sorted sets** for exact accuracy, **leaky bucket** for outbound smoothing, **fixed window** only for coarse stats. Implement with **Redis + Lua** for atomicity, key by **actor + action**, return **`Retry-After`** + `RateLimit-*` headers, and apply **defense in depth** (edge + gateway + app).
