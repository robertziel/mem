### WebMock: HTTP Request Stubbing for Tests

**Problem:** Tests must not hit real external APIs -- they're slow, flaky, rate-limited, and may cost money. But mocks must stay realistic.

**Setup:**
```ruby
# Gemfile
gem 'webmock', group: :test

# spec/spec_helper.rb
require 'webmock/rspec'
WebMock.disable_net_connect!(allow_localhost: true)  # block all external HTTP
```

**Basic stubbing:**
```ruby
stub_request(:get, "https://api.example.com/users/1")
  .to_return(
    status: 200,
    body: { id: 1, name: "Jan" }.to_json,
    headers: { 'Content-Type' => 'application/json' }
  )
```

**Pattern matching:**
```ruby
stub_request(:post, "https://api.example.com/charges")
  .with(
    body: hash_including(amount: 1000, currency: "PLN"),
    headers: { 'Authorization' => /^Bearer .+/ }
  )
  .to_return(status: 201, body: { id: "ch_123", status: "succeeded" }.to_json)
```

**Timeout and error simulation:**
```ruby
# Timeout simulation
stub_request(:get, "https://api.example.com/slow")
  .to_timeout

# Connection failure
stub_request(:get, "https://api.example.com/down")
  .to_raise(Faraday::ConnectionFailed)
```

**Sequential responses:**
```ruby
stub_request(:get, "https://api.example.com/flaky")
  .to_return(status: 503).then
  .to_return(status: 503).then
  .to_return(status: 200, body: { ok: true }.to_json)
```

**Verification:**
```ruby
# Verify request was made
expect(WebMock).to have_requested(:post, "https://api.example.com/charges")
  .with(body: hash_including(amount: 1000))
  .once
```

**Shared response fixtures:**
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

**Testing the service wrapper thoroughly:**
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

**Rule of thumb:** Use WebMock for unit-testing your service wrapper including all error paths: timeout, connection failure, 4xx, 5xx. Use `hash_including` and regex patterns for flexible matching. Extract shared response fixtures into helper modules. Always call `WebMock.disable_net_connect!` to ensure no real HTTP requests leak through.
