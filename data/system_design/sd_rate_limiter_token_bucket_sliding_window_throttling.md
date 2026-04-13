### System Design: Rate Limiter

**Requirements:**
- Limit requests per user/IP/API key within a time window
- Return 429 Too Many Requests when exceeded
- Low latency (must not slow down allowed requests)
- Distributed (works across multiple servers)

**Rate limiting algorithms:**

**1. Token Bucket:**
- Bucket holds N tokens, refills at rate R tokens/sec
- Each request consumes one token
- If bucket empty -> reject
- Allows bursts up to bucket size
```
Bucket: capacity=10, refill=2/sec
Request arrives -> token available? -> allow (remove token) : reject (429)
```

**2. Sliding Window Log:**
- Store timestamp of each request
- Count requests in window [now - window_size, now]
- Precise but memory-intensive (stores every timestamp)

**3. Sliding Window Counter:**
- Combine fixed window counts with weighted overlap
- `count = prev_window_count * overlap% + current_window_count`
- Good balance of accuracy and memory

**4. Fixed Window Counter:**
- Count requests in fixed time buckets (e.g., per minute)
- Simple but allows burst at window boundary (2x rate possible)

**5. Leaky Bucket:**
- Requests enter a queue, processed at fixed rate
- Queue full -> reject
- Smooths traffic but adds latency

**Comparison:**
| Algorithm | Burst handling | Memory | Accuracy |
|-----------|---------------|--------|----------|
| Token Bucket | Allows controlled burst | Low | Good |
| Sliding Window Log | No burst | High | Exact |
| Sliding Window Counter | Minimal burst | Low | Approximate |
| Fixed Window | Burst at boundary | Lowest | Approximate |
| Leaky Bucket | No burst | Low | Good |

**Redis implementation (sliding window):**
```
MULTI
  ZADD key timestamp timestamp        # add request timestamp to sorted set
  ZREMRANGEBYSCORE key 0 (now - window)  # remove old entries
  ZCARD key                            # count requests in window
  EXPIRE key window_seconds            # auto-cleanup
EXEC
-> if count > limit: reject
```

**Distributed rate limiting:**
- Centralized: single Redis instance (simple, potential SPOF)
- Per-node with sync: each node has local counter, sync periodically (approximate)
- Sticky sessions: route same user to same node (avoids distributed state)

**Where to enforce:**
- **API Gateway** - centralized, no app code changes (AWS API Gateway, Kong)
- **Middleware** - per-service, fine-grained control
- **Load Balancer** - basic rate limiting (Nginx `limit_req`)

**Response headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1704067200    # Unix timestamp when window resets
Retry-After: 30                   # seconds to wait (on 429)
```

**Rule of thumb:** Token bucket is the most common (allows bursts, simple). Use Redis for distributed rate limiting. Apply at API gateway for global limits, at service level for fine-grained. Always return rate limit headers.
