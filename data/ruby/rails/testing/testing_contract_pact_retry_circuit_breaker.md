### Contract Testing (Pact), Retry & Circuit Breaker Testing

**Contract testing with Pact -- verify API compatibility:**
```ruby
# Using pact-ruby for consumer-driven contract testing
# Gemfile
gem 'pact', group: :test

# Consumer side (your app):
# spec/service_consumers/pacts/myapp-payment_api.json is auto-generated
Pact.service_consumer "MyApp" do
  has_pact_with "PaymentAPI" do
    mock_service :payment_api do
      port 1234
    end
  end
end

RSpec.describe ExternalPaymentService, pact: true do
  before do
    payment_api.given("a valid charge request")
      .upon_receiving("a charge request")
      .with(
        method: :post,
        path: "/v1/charges",
        body: { amount: 1000, currency: "PLN" },
        headers: { "Content-Type" => "application/json" }
      )
      .will_respond_with(
        status: 201,
        body: {
          id: Pact.like("ch_123"),
          status: "succeeded",
          amount: 1000
        }
      )
  end

  it "creates a charge" do
    result = service.charge(amount: 1000, currency: "PLN", idempotency_key: "k")
    expect(result["status"]).to eq("succeeded")
  end
end

# Provider side runs the pact file against real API in staging
```

**Testing retry behavior:**
```ruby
RSpec.describe "retry behavior" do
  it "retries on 503 and succeeds" do
    stub = stub_request(:get, /data/)
      .to_return(status: 503).then
      .to_return(status: 503).then
      .to_return(status: 200, body: { ok: true }.to_json)

    result = service.fetch_data
    expect(result["ok"]).to be true
    expect(stub).to have_been_requested.times(3)
  end

  it "gives up after max retries" do
    stub_request(:get, /data/).to_return(status: 503)

    expect { service.fetch_data }
      .to raise_error(ExternalPaymentService::ServiceUnavailable)
  end
end
```

**Testing circuit breaker (with Stoplight):**
```ruby
RSpec.describe "circuit breaker" do
  before { Stoplight::Light.default_data_store = Stoplight::DataStore::Memory.new }
  after  { Stoplight("payment-api").lock(Stoplight::State::UNLOCKED) }

  it "opens circuit after repeated failures" do
    stub_request(:post, /charges/).to_timeout

    5.times do
      service.charge(**params) rescue nil
    end

    expect { service.charge(**params) }
      .to raise_error(Stoplight::Error::RedLight)
  end
end
```

**Strategy summary:**

| Approach | Use for | Pros | Cons |
|----------|---------|------|------|
| WebMock | Unit tests, error scenarios | Fast, full control | Can drift from real API |
| VCR | Integration tests, happy paths | Realistic responses | Cassettes go stale |
| Contract (Pact) | API compatibility | Catches breaking changes | Setup overhead |
| Sandbox/staging API | End-to-end tests | Most realistic | Slow, flaky, costs |

**Rule of thumb:** Use Pact contract testing for critical integrations where API changes would break your app. Test retry behavior with WebMock sequential responses and verify the request count. Test circuit breakers with an in-memory data store and reset state after each test. Choose your testing strategy based on the tradeoff: WebMock for speed and control, VCR for realism, Pact for cross-team API safety.
