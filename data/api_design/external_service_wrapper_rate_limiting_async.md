### Service Wrapper Pattern, Async External Calls & Pattern Summary

**Problem:** External API integration code gets scattered across controllers and models. External calls block user requests. You need a clean architecture.

**1. Service wrapper pattern — encapsulate integration:**
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

**2. Async external calls — don't block the request:**
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

**3. Pattern summary:**

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

**Rule of thumb:** Wrap each external API in a dedicated service class with custom error classes, timeouts, and retry logic. Use handle_response to map HTTP statuses to domain errors. Offload external calls to background jobs so users get instant responses. Log every external interaction (request, response, timing) for debugging.
