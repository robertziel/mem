### External API Resilience in Ruby (Timeout, Retry, Circuit Breaker, Bulkhead, Idempotency)

**Cross-ref:** for the conceptual patterns (states, why each exists), see [distributed_systems/circuit_breaker_retry_backoff_bulkhead_timeout_resilience_patterns.md](../distributed_systems/circuit_breaker_retry_backoff_bulkhead_timeout_resilience_patterns.md). This file is the Ruby/Rails operational layer — gems, knobs, gotchas.

**Pattern → Ruby tooling:**

| Pattern | Solves | Ruby gem / approach | Always-on? |
|---|---|---|---|
| Timeout (connect + read) | Hanging requests, blocked workers | `Faraday` (`open_timeout`, `timeout`), `Net::HTTP`, `HTTParty` | **Yes — every call** |
| Retry + exponential backoff + jitter | Transient 5xx / network blips | `Faraday::Request::Retry` middleware, manual `retry` | Idempotent ops only |
| Circuit breaker | Cascading failure, fail-fast on broken upstream | `stoplight` (in-process), `circuitbox` (Redis-backed) | Critical externals |
| Idempotency key | Safe POST/PUT retries (no double-charge) | `Idempotency-Key` header + sender-side stable key | All mutations |
| Bulkhead | Slow service exhausting shared pool | Separate `Faraday` connections, separate Sidekiq queues | Multi-vendor systems |
| Rate limiting (response side) | Hitting upstream quota | Honor `Retry-After` and `X-RateLimit-Remaining` headers | Rate-limited APIs |
| Service wrapper | Scattered HTTP code | `class ExternalXService` with typed errors | Every external API |
| Async via background job | Don't block user requests on slow upstream | `ActiveJob.perform_later` / Sidekiq | Non-critical externals |

**Timeout settings (Faraday):**

| Knob | Meaning | Sane default |
|---|---|---|
| `open_timeout` | TCP connect deadline | 5 s |
| `timeout` | Read deadline (whole response) | 10 s (15 s for payments) |

> A missing timeout = a hung request = a stuck Puma thread = an outage.

**Retry middleware (Faraday) parameters:**

| Param | Meaning | Default to use |
|---|---|---|
| `max` | Number of retries (excluding first attempt) | 3 |
| `interval` | Initial wait | 0.5 s |
| `interval_randomness` | Jitter fraction (0–1) | 0.5 (jitters ±50%) |
| `backoff_factor` | Exponent base | 2 → 0.5 → 1 → 2 s |
| `retry_statuses` | HTTP codes to retry | `[429, 500, 502, 503, 504]` |
| `retry_if` | Custom predicate | Skip non-idempotent (`POST`) unless idempotency key present |

**Circuit breaker — gem comparison:**

| | `stoplight` | `circuitbox` |
|---|---|---|
| Storage | In-process (or Redis adapter) | Redis (designed for it) |
| Multi-instance coordination | Optional | Native |
| Threshold model | Failure count | Failure rate (%) over window |
| Key knobs | `with_threshold`, `with_cool_off_time`, `with_fallback` | `time_window`, `volume_threshold`, `error_threshold`, `sleep_window` |
| Best for | Simple in-process apps | Multi-process Rails / Sidekiq fleets |

**Circuit breaker states (mnemonic):**

| State | Behavior | Transitions to |
|---|---|---|
| CLOSED | Calls pass; failures counted | OPEN (threshold hit) |
| OPEN | All calls fail fast (no upstream traffic) | HALF-OPEN (cool-off elapsed) |
| HALF-OPEN | One probe call allowed | CLOSED (success) / OPEN (fail) |

**Idempotency — two sides:**

| Direction | Mechanism | Where to do it |
|---|---|---|
| Outbound (we retry safely) | Send `Idempotency-Key: <stable-id>` header; key based on resource + version (e.g. `charge:#{order.id}:#{order.updated_at.to_i}`) | HTTP client wrapper |
| Inbound (we receive duplicates) | Dedupe on a unique external event id; `INSERT ... ON CONFLICT` or `ProcessedEvent.find_or_create_by!` inside a txn | Webhook controller / job |

**Bulkhead in Rails:**

| Resource | How to isolate |
|---|---|
| HTTP connections | One `Faraday` constant per vendor; per-vendor timeouts |
| Sidekiq throughput | Dedicated queue per integration; queue concurrency limit; separate worker process if blast radius matters |
| DB connections | Pool size + per-tenant or per-region pools (rare) |

**Rate-limit headers to honor:**

| Header | Action |
|---|---|
| `Retry-After: 30` | Sleep 30 s, retry once |
| `X-RateLimit-Remaining: 5` | Log + slow down; don't burst |
| `429 Too Many Requests` | Treat as transient; back off harder than a 503 |

**Service wrapper skeleton (the one piece of code worth keeping):**

```ruby
class ExternalPaymentService
  class ServiceUnavailable < StandardError; end
  class InvalidRequest < StandardError; end

  def charge(amount:, currency:, idempotency_key:)
    res = conn.post("/v1/charges") do |req|
      req.headers["Idempotency-Key"] = idempotency_key
      req.body = { amount:, currency: }
    end
    case res.status
    when 200..299 then res.body
    when 400..499 then raise InvalidRequest, res.body["error"]
    when 500..599 then raise ServiceUnavailable
    end
  rescue Faraday::TimeoutError, Faraday::ConnectionFailed
    raise ServiceUnavailable
  end
end
```

What that wrapper is doing: timeouts on `conn`, retry middleware on `conn`, idempotency key on POST, typed exceptions, status-code → error mapping. All in one place per vendor.

**Decision shortcuts:**

| Situation | Reach for |
|---|---|
| Any external HTTP call | Timeouts + service wrapper |
| Idempotent (GET, PUT) | + retry + backoff + jitter |
| Mutation (POST/PATCH) | + idempotency key (then retry safely) |
| Critical dependency that can take down others | + circuit breaker |
| Multiple independent vendors | + bulkhead (per-vendor pools/queues) |
| User waits on slow upstream | + background job |

**Rule of thumb:** **Timeout always.** Retry + jitter only on idempotent ops (or after attaching an idempotency key). Circuit-break the critical few, not everything. One service wrapper per vendor — that's where timeout/retry/error-mapping live. Bulkhead by **vendor** (separate pools/queues), not by call type. Push slow upstream to background jobs so users never wait on someone else's outage.
