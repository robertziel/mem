### External API Integration Patterns (Circuit Breaker, Retry, Timeout, Idempotency)

**Problem:** External services are unreliable — they timeout, return errors, go down entirely. Your app must handle this gracefully without cascading failures.

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

**3. Circuit Breaker — stop calling a broken service:**
```ruby
# Concept:
# CLOSED  → normal operation, count failures
# OPEN    → service is down, fail fast (don't even try)
# HALF-OPEN → after cooldown, try one request to test recovery

# Using stoplight gem
require 'stoplight'

light = Stoplight("payment-api") {
  PaymentGateway.charge(amount)
}
  .with_threshold(5)           # open after 5 failures
  .with_cool_off_time(30)     # try again after 30 seconds
  .with_error_handler do |error, handler|
    raise error unless error.is_a?(Faraday::Error)
    handler.call(error)  # only track Faraday errors as failures
  end
  .with_fallback { |_error| PaymentResult.new(status: :unavailable) }

result = light.run  # raises Stoplight::Error::RedLight when circuit is open

# Using circuitbox gem (Redis-backed, good for distributed systems)
Circuitbox.circuit("payment-api",
  exceptions: [Faraday::TimeoutError, Faraday::ConnectionFailed],
  time_window: 60,      # failure window
  volume_threshold: 10,  # min requests before tripping
  error_threshold: 50,   # % errors to trip
  sleep_window: 30       # seconds before half-open
) do
  PaymentGateway.charge(amount)
end
```

**4. Idempotency keys — safe retries for mutations:**
```ruby
# Problem: retry a POST that creates a charge — might double-charge
# Solution: idempotency key — same key = same result

class PaymentService
  def charge(order, amount)
    idempotency_key = "charge:#{order.id}:#{order.updated_at.to_i}"

    conn.post("/v1/charges") do |req|
      req.headers["Idempotency-Key"] = idempotency_key
      req.body = { amount: amount, currency: "PLN" }.to_json
    end
  end
end

# Store idempotency keys to prevent duplicate processing on YOUR side
class IncomingWebhookProcessor
  def process(event_id, payload)
    return if ProcessedEvent.exists?(external_id: event_id)

    ActiveRecord::Base.transaction do
      ProcessedEvent.create!(external_id: event_id)
      handle_event(payload)
    end
  end
end
```

**5. Bulkhead pattern — isolate failures:**
```ruby
# Use separate connection pools / thread pools per external service
# If payment API is slow, it shouldn't exhaust your email API connections

# Separate Faraday connections per service
PAYMENT_API = Faraday.new("https://payment.api.com") do |f|
  f.options.timeout = 15  # payment can be slow
end

EMAIL_API = Faraday.new("https://email.api.com") do |f|
  f.options.timeout = 5   # email should be fast
end

# In Sidekiq: use separate queues per integration
class PaymentSyncJob < ApplicationJob
  queue_as :payments  # dedicated queue with limited concurrency
end

class EmailSendJob < ApplicationJob
  queue_as :emails    # separate queue
end

# sidekiq.yml — limit concurrency per queue
# :queues:
#   - [payments, 3]   # max 3 concurrent payment API calls
#   - [emails, 10]
#   - [default, 5]
```

**6. Service wrapper pattern — encapsulate integration:**
```ruby
# Single responsibility class per external service
class ExternalPaymentService
  MAX_RETRIES = 3
  TIMEOUT = 15

  class PaymentError < StandardError; end
  class ServiceUnavailable < PaymentError; end
  class InvalidRequest < PaymentError; end

  def initialize
    @conn = Faraday.new(url: ENV["PAYMENT_API_URL"]) do |f|
      f.request  :json
      f.response :json
      f.request  :retry, max: MAX_RETRIES, retry_statuses: [502, 503, 504]
      f.options.timeout = TIMEOUT
      f.options.open_timeout = 5
      f.headers["Authorization"] = "Bearer #{ENV['PAYMENT_API_KEY']}"
    end
  end

  def charge(amount:, currency:, idempotency_key:)
    response = @conn.post("/v1/charges") do |req|
      req.headers["Idempotency-Key"] = idempotency_key
      req.body = { amount: amount, currency: currency }
    end

    handle_response(response)
  rescue Faraday::TimeoutError
    raise ServiceUnavailable, "Payment API timeout"
  rescue Faraday::ConnectionFailed
    raise ServiceUnavailable, "Payment API unreachable"
  end

  private

  def handle_response(response)
    case response.status
    when 200..299 then response.body
    when 400..499 then raise InvalidRequest, response.body["error"]
    when 500..599 then raise ServiceUnavailable, "Payment API error: #{response.status}"
    end
  end
end
```

**7. Rate limiting — respect API limits:**
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

**8. Async external calls — don't block the request:**
```ruby
# ❌ Calling external API in controller (blocks user response)
class OrdersController < ApplicationController
  def create
    @order = Order.create!(order_params)
    PaymentGateway.charge(@order.total)   # user waits for this
    ShippingAPI.create_label(@order)       # and this
    NotificationService.send_sms(@order)  # and this
  end
end

# ✅ Offload to background jobs
class OrdersController < ApplicationController
  def create
    @order = Order.create!(order_params)
    ProcessOrderJob.perform_later(@order.id)  # instant response
    render json: @order, status: :created
  end
end

class ProcessOrderJob < ApplicationJob
  retry_on ExternalPaymentService::ServiceUnavailable, wait: :polynomially_longer

  def perform(order_id)
    order = Order.find(order_id)
    ExternalPaymentService.new.charge(
      amount: order.total,
      currency: "PLN",
      idempotency_key: "order:#{order.id}"
    )
    order.update!(status: "paid")
  end
end
```

**Pattern summary:**

| Pattern | Problem it solves | When to use |
|---------|------------------|-------------|
| Timeout | Hanging requests | Always |
| Retry + backoff | Transient failures | GET and idempotent operations |
| Circuit breaker | Cascading failures | Critical external dependencies |
| Idempotency key | Duplicate mutations | POST/PUT retries |
| Bulkhead | Resource exhaustion | Multiple external services |
| Service wrapper | Scattered integration code | Every external API |
| Rate limiting | API quota exhaustion | Rate-limited APIs |
| Async (background job) | Slow user responses | Non-critical external calls |

**Rule of thumb:** Always set timeouts. Retry with exponential backoff + jitter (never retry in a tight loop). Use circuit breakers for critical services. Make mutations idempotent. Wrap each external API in a dedicated service class. Offload external calls to background jobs. Log every external interaction (request, response, timing) for debugging.
