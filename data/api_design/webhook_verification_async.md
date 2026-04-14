### Webhook Verification & Async Processing

**Problem:** Webhooks are fire-and-forget HTTP callbacks from external services. Your handler must verify authenticity and respond fast.

**1. Respond fast, process later:**
```ruby
# ❌ Process in the request — slow, webhook sender may timeout and retry
class WebhooksController < ApplicationController
  def stripe
    event = verify_signature(request)
    process_payment(event)           # slow — hits DB, calls APIs
    head :ok                         # sender already timed out
  end
end

# ✅ Acknowledge immediately, process in background
class WebhooksController < ApplicationController
  skip_before_action :verify_authenticity_token  # webhooks are external POST

  def stripe
    payload = request.body.read
    sig_header = request.headers["Stripe-Signature"]

    begin
      event = Stripe::Webhook.construct_event(payload, sig_header, ENV["STRIPE_WEBHOOK_SECRET"])
    rescue Stripe::SignatureVerificationError
      head :bad_request and return
    end

    # Store raw event and process async
    WebhookEvent.create!(
      source: "stripe",
      external_id: event["id"],
      event_type: event["type"],
      payload: event.to_json,
      status: "pending"
    )
    ProcessWebhookJob.perform_later(event["id"])

    head :ok  # respond in < 500ms
  end
end
```

**2. Signature verification — never skip:**
```ruby
# Stripe: HMAC-SHA256
def verify_stripe(payload, sig_header)
  Stripe::Webhook.construct_event(payload, sig_header, ENV["STRIPE_WEBHOOK_SECRET"])
end

# Generic HMAC verification (many services use this pattern)
def verify_hmac(payload, signature, secret)
  expected = OpenSSL::HMAC.hexdigest("SHA256", secret, payload)
  return false unless signature.present?

  # Constant-time comparison to prevent timing attacks
  ActiveSupport::SecurityUtils.secure_compare(expected, signature)
end

# GitHub: X-Hub-Signature-256
def verify_github(payload, signature)
  expected = "sha256=" + OpenSSL::HMAC.hexdigest("SHA256", ENV["GITHUB_WEBHOOK_SECRET"], payload)
  ActiveSupport::SecurityUtils.secure_compare(expected, signature)
end

# ⚠️ Read body ONCE — request.body.read consumes the stream
# If you need it again, save it to a variable first
```

**3. Multi-provider webhook router:**
```ruby
# routes.rb
post "/webhooks/:provider", to: "webhooks#receive"

class WebhooksController < ApplicationController
  skip_before_action :verify_authenticity_token

  HANDLERS = {
    "stripe"  => Webhooks::StripeHandler,
    "github"  => Webhooks::GithubHandler,
    "twilio"  => Webhooks::TwilioHandler,
  }.freeze

  def receive
    handler = HANDLERS[params[:provider]]
    head :not_found and return unless handler

    payload = request.body.read
    unless handler.verify(payload, request.headers)
      head :unauthorized and return
    end

    handler.enqueue(payload)
    head :ok
  end
end

# Each handler implements verify + enqueue
module Webhooks
  class StripeHandler
    def self.verify(payload, headers)
      Stripe::Webhook.construct_event(
        payload, headers["Stripe-Signature"], ENV["STRIPE_WEBHOOK_SECRET"]
      )
    rescue Stripe::SignatureVerificationError
      false
    end

    def self.enqueue(payload)
      event = JSON.parse(payload)
      WebhookEvent.create!(source: "stripe", external_id: event["id"],
                           event_type: event["type"], payload: payload)
      ProcessWebhookJob.perform_later(event["id"])
    end
  end
end
```

**Rule of thumb:** Respond 200 immediately, process in background. Always verify signatures using constant-time comparison to prevent timing attacks. Store raw events before processing. Use a multi-provider router with per-provider verify + enqueue for clean webhook architecture.
