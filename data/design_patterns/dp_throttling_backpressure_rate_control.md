### Throttling & Backpressure Pattern

Control the rate of processing to prevent overload.

**Throttling (limit incoming rate):**
```ruby
# Rack middleware throttle
class RateLimiter
  def initialize(app, limit: 100, window: 60)
    @app = app
    @limit = limit
    @window = window
  end

  def call(env)
    ip = env["REMOTE_ADDR"]
    count = Redis.current.incr("rate:#{ip}")
    Redis.current.expire("rate:#{ip}", @window) if count == 1

    if count > @limit
      [429, { "Retry-After" => @window.to_s }, ["Rate limited"]]
    else
      @app.call(env)
    end
  end
end
```

**Backpressure (slow down producer when consumer can't keep up):**
```
Producer (fast) → [Buffer/Queue] → Consumer (slow)

Without backpressure: buffer grows unbounded → OOM
With backpressure: producer slows down when buffer is full
```

**Backpressure strategies:**
| Strategy | How | Example |
|----------|-----|---------|
| Drop | Discard excess messages | UDP, lossy streaming |
| Buffer + reject | Reject when buffer full | SQS max messages, 429 response |
| Slow producer | Signal producer to wait | TCP flow control, reactive streams |
| Sample | Process every Nth message | Metrics, high-volume logging |
| Scale consumers | Add more workers | K8s HPA on queue depth |

**Rule of thumb:** Throttling for external-facing rate limits (API, login). Backpressure for internal systems where consumer can't keep up. Always prefer backpressure over unbounded buffering (prevents OOM). Scale consumers when possible, drop/sample when not.
