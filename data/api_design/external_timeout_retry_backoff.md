### External API Timeouts, Retry & Rate Limiting

**Problem:** External services are unreliable — they timeout, return errors, go down entirely. Always set timeouts and retry intelligently.

**1. Timeouts — always set them:**
```ruby
# ❌ No timeout — request can hang forever, blocking a thread/worker
response = HTTP.get("https://api.external.com/data")

# ✅ Always set connect + read timeouts
require 'faraday'

conn = Faraday.new(url: "https://api.external.com") do |f|
  f.options.open_timeout = 5   # connection timeout (seconds)
  f.options.timeout = 10       # read timeout (seconds)
  f.adapter Faraday.default_adapter
end

# Net::HTTP
uri = URI("https://api.external.com/data")
http = Net::HTTP.new(uri.host, uri.port)
http.open_timeout = 5
http.read_timeout = 10
http.use_ssl = true

# HTTParty
HTTParty.get("https://api.external.com/data", timeout: 10)
```

**2. Retry with exponential backoff:**
```ruby
# Using Faraday with retry middleware
conn = Faraday.new(url: "https://api.external.com") do |f|
  f.request :retry, {
    max: 3,
    interval: 0.5,                  # initial wait (seconds)
    interval_randomness: 0.5,       # jitter (0.25s - 0.75s)
    backoff_factor: 2,              # 0.5s → 1s → 2s
    retry_statuses: [429, 500, 502, 503, 504],
    retry_if: ->(env, _exc) { env.method != :post }  # don't retry non-idempotent
  }
  f.options.timeout = 10
  f.adapter Faraday.default_adapter
end

# Manual retry with exponential backoff
def call_with_retry(max_retries: 3)
  retries = 0
  begin
    yield
  rescue Faraday::TimeoutError, Faraday::ConnectionFailed => e
    retries += 1
    raise if retries > max_retries

    sleep_time = (2**retries) + rand(0.0..1.0)  # exponential + jitter
    Rails.logger.warn("Retry #{retries}/#{max_retries} after #{sleep_time.round(1)}s: #{e.message}")
    sleep(sleep_time)
    retry
  end
end
```

**3. Rate limiting — respect API limits:**
```ruby
# Track rate limits from response headers
class RateLimitedClient
  def request(method, path, **opts)
    response = conn.public_send(method, path, **opts)

    if response.status == 429
      retry_after = response.headers["Retry-After"]&.to_i || 60
      Rails.logger.warn("Rate limited, retry after #{retry_after}s")
      sleep(retry_after)
      return request(method, path, **opts)  # retry once
    end

    # Track remaining quota
    remaining = response.headers["X-RateLimit-Remaining"]&.to_i
    Rails.logger.warn("API quota low: #{remaining}") if remaining && remaining < 10

    response
  end
end
```

**Rule of thumb:** Always set connect + read timeouts on every external call. Retry with exponential backoff + jitter (never in a tight loop). Respect Retry-After headers and track remaining quota. Only retry idempotent operations automatically.
