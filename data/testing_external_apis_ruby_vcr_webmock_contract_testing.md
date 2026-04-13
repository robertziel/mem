### Testing External APIs in Ruby (VCR, WebMock, Contract Testing)

**Problem:** Tests must not hit real external APIs — they're slow, flaky, rate-limited, and may cost money. But mocks must stay realistic.

**1. WebMock — stub HTTP requests at the lowest level:**
```ruby
# Gemfile
gem 'webmock', group: :test

# spec/spec_helper.rb
require 'webmock/rspec'
WebMock.disable_net_connect!(allow_localhost: true)  # block all external HTTP

# Basic stubbing
stub_request(:get, "https://api.example.com/users/1")
  .to_return(
    status: 200,
    body: { id: 1, name: "Jan" }.to_json,
    headers: { 'Content-Type' => 'application/json' }
  )

# Pattern matching
stub_request(:post, "https://api.example.com/charges")
  .with(
    body: hash_including(amount: 1000, currency: "PLN"),
    headers: { 'Authorization' => /^Bearer .+/ }
  )
  .to_return(status: 201, body: { id: "ch_123", status: "succeeded" }.to_json)

# Timeout simulation
stub_request(:get, "https://api.example.com/slow")
  .to_timeout

# Connection failure
stub_request(:get, "https://api.example.com/down")
  .to_raise(Faraday::ConnectionFailed)

# Sequential responses
stub_request(:get, "https://api.example.com/flaky")
  .to_return(status: 503).then
  .to_return(status: 503).then
  .to_return(status: 200, body: { ok: true }.to_json)

# Verify request was made
expect(WebMock).to have_requested(:post, "https://api.example.com/charges")
  .with(body: hash_including(amount: 1000))
  .once
```

**2. VCR — record real HTTP interactions, replay in tests:**
```ruby
# Gemfile
gem 'vcr', group: :test
gem 'webmock', group: :test

# spec/support/vcr.rb
VCR.configure do |config|
  config.cassette_library_dir = "spec/cassettes"
  config.hook_into :webmock
  config.configure_rspec_metadata!

  # Filter sensitive data from recordings
  config.filter_sensitive_data('<API_KEY>') { ENV['EXTERNAL_API_KEY'] }
  config.filter_sensitive_data('<AUTH_TOKEN>') { ENV['AUTH_TOKEN'] }

  # Default record mode
  config.default_cassette_options = {
    record: :once,                    # record first time, replay after
    match_requests_on: [:method, :uri, :body]
  }

  # Ignore localhost (for integration tests with local services)
  config.ignore_localhost = true
end

# Usage in specs
RSpec.describe ExternalPaymentService do
  describe "#charge" do
    it "creates a charge", vcr: { cassette_name: "payment/charge_success" } do
      service = ExternalPaymentService.new
      result = service.charge(amount: 1000, currency: "PLN", idempotency_key: "test-123")

      expect(result["status"]).to eq("succeeded")
      expect(result["amount"]).to eq(1000)
    end

    it "handles timeout", vcr: false do
      # Use WebMock directly for error scenarios (don't record errors)
      stub_request(:post, /payment/).to_timeout

      expect {
        ExternalPaymentService.new.charge(amount: 1000, currency: "PLN", idempotency_key: "t")
      }.to raise_error(ExternalPaymentService::ServiceUnavailable)
    end
  end
end

# VCR record modes:
# :once    — record first run, replay after (default, good for CI)
# :new_episodes — record new requests, replay known ones
# :none    — only replay, error on unrecorded requests (strict CI)
# :all     — always re-record (use to refresh cassettes)
```

**Managing VCR cassettes:**
```ruby
# Re-record all cassettes (when API changes)
# Delete spec/cassettes/ and run tests with record: :once

# Organize cassettes by service
# spec/cassettes/
#   payment/
#     charge_success.yml
#     charge_declined.yml
#     refund_success.yml
#   shipping/
#     create_label.yml
#     track_package.yml

# Custom matcher for dynamic URLs
VCR.configure do |config|
  config.register_request_matcher :path_only do |request1, request2|
    URI(request1.uri).path == URI(request2.uri).path
  end
end

# Use: vcr: { cassette_name: "...", match_requests_on: [:method, :path_only] }
```

**3. Shared response fixtures — test helpers:**
```ruby
# spec/support/api_fixtures.rb
module ApiFixtures
  def payment_success_response
    {
      id: "ch_#{SecureRandom.hex(8)}",
      status: "succeeded",
      amount: 1000,
      currency: "PLN"
    }
  end

  def payment_declined_response
    {
      error: {
        type: "card_error",
        code: "card_declined",
        message: "Your card was declined"
      }
    }
  end
end

RSpec.configure { |c| c.include ApiFixtures }

# Use in tests
stub_request(:post, /charges/)
  .to_return(status: 200, body: payment_success_response.to_json)
```

**4. Testing the service wrapper thoroughly:**
```ruby
RSpec.describe ExternalPaymentService do
  subject(:service) { described_class.new }

  describe "#charge" do
    let(:params) { { amount: 1000, currency: "PLN", idempotency_key: "key-123" } }

    context "when API returns success" do
      before do
        stub_request(:post, "#{ENV['PAYMENT_API_URL']}/v1/charges")
          .to_return(status: 200, body: { id: "ch_1", status: "succeeded" }.to_json)
      end

      it "returns parsed response" do
        result = service.charge(**params)
        expect(result["status"]).to eq("succeeded")
      end

      it "sends idempotency key header" do
        service.charge(**params)
        expect(WebMock).to have_requested(:post, /charges/)
          .with(headers: { "Idempotency-Key" => "key-123" })
      end
    end

    context "when API returns 400" do
      before do
        stub_request(:post, /charges/)
          .to_return(status: 400, body: { error: "invalid_amount" }.to_json)
      end

      it "raises InvalidRequest" do
        expect { service.charge(**params) }
          .to raise_error(ExternalPaymentService::InvalidRequest)
      end
    end

    context "when API returns 500" do
      before { stub_request(:post, /charges/).to_return(status: 500) }

      it "raises ServiceUnavailable" do
        expect { service.charge(**params) }
          .to raise_error(ExternalPaymentService::ServiceUnavailable)
      end
    end

    context "when API times out" do
      before { stub_request(:post, /charges/).to_timeout }

      it "raises ServiceUnavailable" do
        expect { service.charge(**params) }
          .to raise_error(ExternalPaymentService::ServiceUnavailable)
      end
    end

    context "when connection fails" do
      before { stub_request(:post, /charges/).to_raise(Faraday::ConnectionFailed) }

      it "raises ServiceUnavailable" do
        expect { service.charge(**params) }
          .to raise_error(ExternalPaymentService::ServiceUnavailable)
      end
    end
  end
end
```

**5. Contract testing — verify API compatibility:**
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

**6. Testing retry and circuit breaker behavior:**
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

# Testing circuit breaker (with Stoplight)
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

**Rule of thumb:** Use WebMock for unit-testing your service wrapper (including all error paths). Use VCR for integration tests with realistic responses. Filter secrets from VCR cassettes. Re-record cassettes when the external API changes. Test every error path: timeout, connection failure, 4xx, 5xx. Consider Pact for critical integrations where API changes would break your app.
