### VCR: Recording and Replaying HTTP Interactions

**Configuration:**
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
```

**Usage in specs:**
```ruby
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
```

**VCR record modes:**
```ruby
# :once    — record first run, replay after (default, good for CI)
# :new_episodes — record new requests, replay known ones
# :none    — only replay, error on unrecorded requests (strict CI)
# :all     — always re-record (use to refresh cassettes)
```

**Managing cassettes:**
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
```

**Custom matchers for dynamic URLs:**
```ruby
VCR.configure do |config|
  config.register_request_matcher :path_only do |request1, request2|
    URI(request1.uri).path == URI(request2.uri).path
  end
end

# Use: vcr: { cassette_name: "...", match_requests_on: [:method, :path_only] }
```

**Rule of thumb:** Use VCR for integration tests with realistic responses. Filter secrets from cassettes with `filter_sensitive_data`. Use `:once` record mode for CI stability. Organize cassettes by service in subdirectories. Re-record cassettes when the external API changes. Use WebMock directly (with `vcr: false`) for error scenarios like timeouts and connection failures.
