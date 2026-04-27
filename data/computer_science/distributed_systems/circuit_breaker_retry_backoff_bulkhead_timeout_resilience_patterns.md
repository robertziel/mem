### Circuit Breaker, Retry, and Resilience Patterns

**Retry with exponential backoff:**
- Don't hammer a failing service
- Wait longer between each retry: 1s, 2s, 4s, 8s, ...
- Add jitter to prevent thundering herd

```python
import random, time

def retry_with_backoff(fn, max_retries=5, base_delay=1):
    for attempt in range(max_retries):
        try:
            return fn()
        except TransientError:
            if attempt == max_retries - 1:
                raise
            delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
            time.sleep(delay)
```

**When to retry:**
- Transient errors: network timeout, 503, 429 (with Retry-After)
- **Do NOT retry**: 400, 401, 403, 404, 409 (client errors, retrying won't help)
- Idempotent operations only (or use idempotency keys)

**Circuit breaker:**
- Prevent cascading failures by stopping calls to a failing service
- Three states:

```
[Closed] -- failure threshold reached --> [Open]
   ^                                        |
   |                                    timeout expires
   |                                        v
   +---- success ----- [Half-Open] -- failure --> [Open]
```

- **Closed** - requests flow normally, count failures
- **Open** - immediately reject requests (fail fast), don't call downstream
- **Half-Open** - allow one test request; if success -> Closed, if failure -> Open

**Circuit breaker parameters:**
- Failure threshold: 5 failures in 60 seconds -> open
- Timeout: 30 seconds in open state before trying half-open
- Success threshold: 3 consecutive successes in half-open -> closed

**Bulkhead pattern:**
- Isolate resources per dependency (thread pools, connection pools)
- If Service A is slow, it doesn't exhaust resources for Service B
- Like ship bulkheads: flooding one compartment doesn't sink the ship

```
[App] -> [Thread Pool A (max 10)] -> Service A
      -> [Thread Pool B (max 10)] -> Service B
Service A slow -> Pool A exhausted, but Pool B unaffected
```

**Timeout:**
- Always set timeouts on outbound calls (HTTP, DB, cache)
- No timeout = waiting forever = thread/connection leak
- Set aggressive timeouts: 1-5s for most service calls
- Distinguish: connection timeout (establishing) vs read timeout (waiting for response)

**Fallback:**
- When dependency fails, return a degraded response
- Cache fallback: serve stale cached data
- Default fallback: return default value or empty result
- Queue fallback: accept request, process later when service recovers

**Rate limiting (client-side):**
- Limit outbound requests to protect downstream
- Token bucket: consume tokens per request, refill at steady rate
- Prevents overloading a recovering service

**Combining patterns:**
```
Request -> Rate Limiter -> Circuit Breaker -> Retry with Backoff -> Service Call
                              |                                        |
                          [Open: fallback]                       [All retries failed]
                              |                                        |
                              v                                        v
                        Return cached/default                    Return error
```

**Rule of thumb:** Retry transient errors with exponential backoff + jitter. Circuit breaker to fail fast and protect cascading failure. Always set timeouts. Bulkhead to isolate dependencies. Combine all four for production resilience.
