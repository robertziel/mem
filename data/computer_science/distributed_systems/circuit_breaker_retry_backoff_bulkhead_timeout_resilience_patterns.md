### Resilience Patterns (Timeout, Retry + Backoff, Circuit Breaker, Bulkhead, Fallback, Rate Limit)

**Why each pattern exists — match symptom to pattern:**

| Symptom | Pattern | What it does |
|---|---|---|
| Outbound call hangs forever | **Timeout** | Bound the wait; free the thread/connection |
| Transient blip (network glitch, 503) | **Retry + backoff + jitter** | Wait, try again; don't hammer |
| Downstream is broken — every retry fails | **Circuit breaker** | Stop calling; fail fast |
| One slow dependency exhausts shared resources | **Bulkhead** | Isolate pools per dependency |
| Some answer is better than none | **Fallback** | Stale cache / default / queued reply |
| You're overwhelming a recovering service | **Rate limit (client-side)** | Cap outbound rate |
| Duplicate work from retries | **Idempotency key** | Sender-stable key; receiver dedupes |

**Composition order — outside in:**

```
Request → Rate limiter → Circuit breaker → Retry+Backoff → Timeout → Service call
                                  ↓                                       ↓
                            (Open: fallback)                     (All retries fail: error or fallback)
```

> **Order matters.** Putting retry *outside* the circuit breaker amplifies bad load when the breaker opens. Always: rate-limit → breaker → retry → timeout → call.

**Timeout — the foundation:**

| Knob | Means | Sane default |
|---|---|---|
| Connect (open) timeout | TCP handshake deadline | 1–5 s |
| Read timeout | Response within this window | 1–30 s, lower for hot paths |
| Total deadline | End-to-end budget | Set explicitly per call |

> **No timeout = infinite wait = thread/connection pool leak under any upstream slowdown.**

**Retry + exponential backoff + jitter:**

| Element | Purpose |
|---|---|
| **Exponential backoff** (`base · 2^attempt`) | Spaced retries; transient outages clear |
| **Jitter** (random component) | Prevents thundering herd when many clients retry in lockstep |
| `max_retries` | Bound total work; usually 3–5 |
| Per-attempt timeout (≠ total deadline) | Don't double a slow call's pain |
| **Honor `Retry-After`** header on `429` / `503` | The server told you when to come back |

**Retry decision matrix — what to retry:**

| Error class | Retry? |
|---|---|
| Network timeout / connection reset | ✅ |
| `500`, `502`, `503`, `504` | ✅ |
| `429 Too Many Requests` | ✅ — honor `Retry-After` |
| `408 Request Timeout` | ✅ |
| `400`, `401`, `403`, `404`, `409`, `422` | ❌ — client error, retry won't help |
| Non-idempotent without idempotency key | ❌ — risk double-work |
| Already past total deadline | ❌ — propagate failure |

**Circuit breaker — three states:**

```
        failures ≥ threshold
[CLOSED] ──────────────────► [OPEN]
   ▲                            │
   │                       cool-off elapses
   │                            ▼
   └── successes ≥ N ── [HALF-OPEN] ── any failure ──► [OPEN]
```

| State | Behavior | Transitions |
|---|---|---|
| **CLOSED** | Calls flow; failures counted | → OPEN at threshold |
| **OPEN** | All calls fail fast (no upstream traffic); fallback / error | → HALF-OPEN after cool-off |
| **HALF-OPEN** | One probe call allowed | → CLOSED on success / OPEN on failure |

**Breaker tuning knobs:**

| Knob | Typical |
|---|---|
| Failure threshold | 5 failures within 60 s, **or** 50% error rate over a window of N requests |
| Min volume threshold | Don't open on 1 failure out of 1 — require N requests in window |
| Cool-off (open → half-open) | 10–60 s |
| Half-open probe count | 1–3 successes to close |
| What counts as "failure" | Server errors + timeouts; **not** client errors (400s) |

**Bulkhead — isolate so a slow dep doesn't sink everyone:**

| Resource | Bulkhead form |
|---|---|
| Outbound HTTP | Per-vendor connection pool |
| Threads in worker process | Separate pool / executor per dep |
| Worker queues | Dedicated queue + concurrency limit per integration |
| DB connections | Per-tenant or per-service connection pool slice |
| In a service mesh | Per-destination outlier detection + connection limits |

**Fallback strategies (ordered cheapest → most graceful):**

| Strategy | Example |
|---|---|
| Default value | Empty list, `0`, `null`, "Unavailable" |
| Cached / stale value | Last successful response, marked stale |
| Degraded computation | Skip personalization; show generic |
| Queued for later | Accept request, process when service recovers |
| Hand-off to async path | Return `202 Accepted` + status URL |
| Graceful refusal | "We can't process this right now — try again in N min" |

**Client-side rate limiting (token bucket — most common):**

| Property | Effect |
|---|---|
| `tokens_per_second` (refill rate) | Steady-state allowed throughput |
| `bucket_size` (burst) | Headroom for spikes |
| Per-host vs per-tenant vs per-route | Pick the dimension that maps to actual contention |

**Idempotency — non-negotiable for safe retries:**

| Direction | Mechanism |
|---|---|
| Outbound mutations (POST / PATCH) | Send `Idempotency-Key: <stable hash>` header |
| Receiving duplicates | Dedupe on a unique external event id; `INSERT ... ON CONFLICT` or transactional dedupe table |
| Stable key generation | Derive from `(resource_id, version)` so the same retry produces the same key |

**Deadline propagation — across services:**

| Mechanism | Effect |
|---|---|
| `Deadline` / `X-Deadline` header | Each hop checks remaining budget; aborts early when dead |
| Budget split across hops | Don't let any hop consume the whole budget |
| Cancel on client disconnect | Worker stops doing work for a gone caller |

**Tooling — popular libraries:**

| Language | Libraries |
|---|---|
| Java / JVM | Resilience4j, Hystrix (deprecated), Failsafe |
| Go | `cenkalti/backoff`, `sony/gobreaker`, `uber/ratelimit` |
| Python | Tenacity, pybreaker, aiobreaker |
| Ruby | Stoplight, Circuitbox, Faraday retry middleware |
| Node | `cockatiel`, `opossum`, `bottleneck` |
| Service-mesh-provided (no library) | Istio, Linkerd, Consul — retries, timeouts, breakers in Envoy |

**Anti-patterns:**

| Pitfall | Why it bites |
|---|---|
| Retry without backoff | Thundering herd, makes a failing service worse |
| Retry without jitter | Synchronized retries from many clients |
| Retry inside the breaker (wrong order) | Multiplies failure load when breaker opens |
| Retry on non-idempotent ops without idempotency keys | Double-charge, double-write |
| One global breaker for all dependencies | One bad dep trips everything |
| Breaker + no fallback | All you've achieved is faster failure |
| Timeouts longer than upstream's deadline | Wasted threads waiting for cancelled work |
| Retrying past the request deadline | Caller already gave up |
| Bulkhead with too-small pools | Healthy traffic blocked by your own limits |

**Rule of thumb:** **always set a timeout.** Retry **only idempotent** operations with **exponential backoff + jitter**, honoring `Retry-After`. **Circuit breaker for critical dependencies**, paired with a fallback (stale cache or default). **Bulkhead by dependency** so one slow upstream can't exhaust shared pools. **Compose outside-in: rate limit → breaker → retry → timeout → call.** Without idempotency keys, retry is a footgun.
