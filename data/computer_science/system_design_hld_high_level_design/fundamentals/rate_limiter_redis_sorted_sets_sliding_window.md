### Rate Limiter — Redis Sorted Sets, Sliding Window

**Definition:** a **rate limiter** caps requests per actor per window. The standard distributed implementation uses **Redis sorted sets** keyed by `(actor, action)` with timestamps as scores — a true **sliding window** with O(log N) add + range operations.

**Algorithms compared:**

| Algorithm | Pros | Cons | Where it fits |
|---|---|---|---|
| **Fixed window** | Simplest counter | Burst at window boundaries (2× limit at edges) | Coarse limits, dashboards |
| **Sliding log** | Most accurate | Stores every timestamp; memory heavy | Low-volume APIs, audit needs |
| **Sliding window counter** | Accurate, cheap | Approximate at edges | High-throughput APIs |
| **Token bucket** | Allows bursts, smooth refill | Stateful, harder distributed | Per-user steady-state with burst |
| **Leaky bucket** | Smooth output rate | No burst | Outbound calls (vendor APIs) |

**Sliding window with sorted sets — the algorithm:**

```
key = "ratelimit:user:42:POST:/api/orders"
now = current epoch ms
window = 60_000   (1 minute)
limit = 100

# Atomic block (Lua / MULTI):
ZREMRANGEBYSCORE key 0 (now - window)     # drop expired
ZADD key now now                            # add this request
ZCARD key                                   # count remaining
EXPIRE key window                           # auto-cleanup
```

| Step | Cost | Purpose |
|---|---|---|
| `ZREMRANGEBYSCORE` | O(log N + M) | Remove timestamps outside window |
| `ZADD` | O(log N) | Stamp this request |
| `ZCARD` | O(1) | Read count |
| `EXPIRE` | O(1) | Reclaim memory automatically |

**If `ZCARD > limit` → `429 Too Many Requests`.**

**Atomicity matters — use Lua:**

```lua
-- KEYS[1] = bucket key, ARGV: now, window, limit
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[1] - ARGV[2])
local count = redis.call('ZCARD', KEYS[1])
if count >= tonumber(ARGV[3]) then
  return {0, count}    -- denied
end
redis.call('ZADD', KEYS[1], ARGV[1], ARGV[1])
redis.call('PEXPIRE', KEYS[1], ARGV[2])
return {1, count + 1}  -- allowed
```

| Property | Detail |
|---|---|
| Single round-trip | All steps in one Lua call |
| Atomic | No interleaving across servers |
| Idempotent on retry | Same timestamp → no double-count |

**Keying strategy — what's the actor + action?**

| Limit | Key shape |
|---|---|
| Per IP | `rl:ip:1.2.3.4` |
| Per user | `rl:user:42` |
| Per API key | `rl:apikey:abc` |
| Per endpoint | `rl:user:42:POST:/orders` |
| Per tenant + endpoint | `rl:tenant:9:POST:/orders` |
| Global (one bucket for everyone) | `rl:global:POST:/orders` |

> **Key by actor + action**, not just actor — abusive `POST /login` shouldn't burn the user's `GET /products` budget.

**Tiered limits — overlay multiple windows:**

| Tier | Limit | Window |
|---|---|---|
| Burst | 10 | 1 second |
| Steady | 100 | 1 minute |
| Hourly | 1000 | 1 hour |
| Daily | 10000 | 1 day |

> Check all four. Reject if **any** is exceeded. Each is a separate sorted set.

**Where to put the limiter:**

| Layer | Pros | Cons |
|---|---|---|
| **Edge (CDN, WAF, API Gateway)** | Cheap, blocks before app | Less business context |
| **Reverse proxy (NGINX, Envoy)** | Cheap, no app changes | Limited keying |
| **App middleware (Rack, Express)** | Full request context | Burns app workers |
| **Service-level (per route)** | Most precise | Most code |

> Defense in depth — coarse at the edge, fine in the app.

**Response — be kind, be informative:**

```
HTTP/1.1 429 Too Many Requests
Retry-After: 30
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1714400000
```

| Header | Purpose |
|---|---|
| `Retry-After` | Seconds (or HTTP date) — clients honor this |
| `RateLimit-Limit` | The cap |
| `RateLimit-Remaining` | What's left (when not 429) |
| `RateLimit-Reset` | Epoch when bucket resets |

**Failure modes — what if Redis is down?**

| Strategy | Behavior |
|---|---|
| **Fail open** | Allow traffic when limiter unavailable | Safer for availability |
| **Fail closed** | Reject when limiter unavailable | Safer for downstream |
| **Local fallback** | In-process counter | Per-instance only — leaky |
| **Graceful degrade** | Coarser limit at the edge | Hybrid |

> **Most APIs fail open** for the limiter — losing the limit is better than a global outage. Audit-critical paths fail closed.

**Distributed gotchas:**

| Gotcha | Mitigation |
|---|---|
| Clock skew across app servers | Send `now` from Redis (`TIME` command) or use server-side script |
| Hot key (one user → one shard) | Sharding — `rl:user:42:shard:N` with consistent hashing |
| Sorted set unbounded growth on bug | Always `EXPIRE`; alert on key size |
| Cross-region replication lag | Per-region limiters; reconcile async if needed |
| Lua script not loaded | Use `EVALSHA` with fallback to `EVAL` |

**Token bucket alternative (when burst matters):**

```
state per key: { tokens, last_refilled_at }

on request:
  refill = (now - last_refilled_at) * rate
  tokens = min(capacity, tokens + refill)
  if tokens >= 1:
    tokens -= 1; allow
  else:
    deny
  save state
```

| Property | Detail |
|---|---|
| Allows bursts up to `capacity` | Better UX for occasional spikes |
| Smooth refill rate | No window-edge thrash |
| Two values per key | Smaller memory than sorted set |
| Slightly more complex | Lua script ~15 lines |

**Cost model:**

| Property | Sliding window (sorted set) | Token bucket |
|---|---|---|
| Memory per actor | O(requests_in_window) | 2 fields |
| Ops per request | 4 Redis ops in Lua | 3 Redis ops in Lua |
| Allows bursts | No | Yes |
| Accurate at edges | Yes | N/A |
| Complexity | Lower | Slightly higher |

**Decision matrix:**

| Need | Algorithm |
|---|---|
| API quota, exact "100 / minute" | **Sliding window sorted set** |
| Allow burst, smooth steady-state | **Token bucket** |
| Outbound vendor calls (smooth output) | **Leaky bucket** |
| Cheap, approximate | **Fixed window counter** |
| Audit / compliance, every request matters | **Sliding log** |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Non-atomic `ZADD + ZCARD` | Race condition, over-limit slips through |
| Forgetting `EXPIRE` | Memory leak |
| Single bucket per IP at carrier-grade NAT | Whole office blocked |
| Limiting only at app, not edge | DDOS reaches app workers |
| No `Retry-After` | Clients hammer immediately |
| Same bucket across endpoints | Login abuse blocks reads |
| Counting failed-auth attempts in same bucket | Worth a separate, lower limit |
| Per-region limiters that don't share state | Multi-region users get N× the limit |

**Cross-references:**

- Caching strategy: [caching_strategies_*.md](../patterns/caching_strategies_redis_memcached_invalidation.md)
- Resilience patterns (circuit breaker, retry): [circuit_breaker_*.md](../../distributed_systems/circuit_breaker_retry_backoff_bulkhead_timeout_resilience_patterns.md)
- API observability: [api_observability_*.md](../../api_design/observability_logging_metrics_tracing.md)

**Rule of thumb:** **Sliding window with Redis sorted sets** is the standard distributed rate limiter — atomic via **Lua**, keyed by **actor + action**, with **tiered windows** (burst / steady / hourly). Always set **`EXPIRE`** for cleanup, return **`Retry-After`** + `RateLimit-*` headers, and **fail open** unless the path is audit-critical. Reach for **token bucket** when bursts are wanted; **leaky bucket** for smoothing outbound calls.
