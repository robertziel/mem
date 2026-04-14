### Circuit Breaker, Idempotency Keys & Bulkhead Pattern

**Problem:** When external services fail, your app must prevent cascading failures, avoid duplicate mutations, and isolate faults per service.

**1. Circuit Breaker — stop calling a broken service:**
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

**2. Idempotency keys — safe retries for mutations:**
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

**3. Bulkhead pattern — isolate failures:**
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

**Rule of thumb:** Use circuit breakers (CLOSED/OPEN/HALF-OPEN) for critical dependencies to fail fast instead of waiting. Make mutations idempotent with idempotency keys to safely retry POST/PUT requests. Apply the bulkhead pattern — separate connection pools and job queues per external service so one slow API cannot exhaust resources for others.
