### Webhook Handling Patterns (Verification, Idempotency, Async Processing)

**Problem:** Webhooks are fire-and-forget HTTP callbacks from external services. They can arrive out of order, be duplicated, or fail silently. Your handler must be secure, idempotent, and reliable.

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

**3. Idempotency — handle duplicate deliveries:**
```ruby
class ProcessWebhookJob < ApplicationJob
  def perform(external_event_id)
    webhook = WebhookEvent.find_by!(external_id: external_event_id)

    # Skip if already processed
    return if webhook.status == "processed"

    # Lock to prevent concurrent processing of same event
    webhook.with_lock do
      return if webhook.status == "processed"

      case webhook.event_type
      when "payment_intent.succeeded"
        handle_payment_succeeded(webhook)
      when "customer.subscription.deleted"
        handle_subscription_cancelled(webhook)
      end

      webhook.update!(status: "processed", processed_at: Time.current)
    end
  rescue StandardError => e
    webhook&.update!(status: "failed", error_message: e.message)
    raise  # re-raise for Sidekiq retry
  end
end

# Migration for webhook events table
class CreateWebhookEvents < ActiveRecord::Migration[6.1]
  def change
    create_table :webhook_events do |t|
      t.string  :source,        null: false                # "stripe", "github"
      t.string  :external_id,   null: false                # event ID from provider
      t.string  :event_type,    null: false                # "payment.succeeded"
      t.jsonb   :payload,       null: false                # raw event data
      t.string  :status,        null: false, default: "pending"  # pending/processed/failed
      t.text    :error_message
      t.datetime :processed_at

      t.timestamps
      t.index [:source, :external_id], unique: true  # prevent duplicate storage
      t.index [:status, :created_at]                 # for retry queries
    end
  end
end
```

**4. Handling out-of-order events:**
```ruby
# Webhooks can arrive out of order:
# "invoice.created" might arrive AFTER "invoice.paid"

# Strategy 1: Check current state, not event sequence
def handle_invoice_paid(webhook)
  invoice_id = webhook.payload.dig("data", "object", "id")

  # Fetch current state from Stripe API (source of truth)
  invoice = Stripe::Invoice.retrieve(invoice_id)

  case invoice.status
  when "paid"
    mark_order_as_paid(invoice)
  when "void"
    # Already cancelled — ignore the "paid" webhook
    Rails.logger.info("Ignoring paid webhook for voided invoice #{invoice_id}")
  end
end

# Strategy 2: Timestamp-based last-write-wins
def handle_customer_updated(webhook)
  event_time = Time.at(webhook.payload["created"])
  customer_id = webhook.payload.dig("data", "object", "id")

  customer = Customer.find_by(stripe_id: customer_id)
  return unless customer

  # Only apply if this event is newer than our last update
  return if customer.last_webhook_at && customer.last_webhook_at > event_time

  customer.update!(
    email: webhook.payload.dig("data", "object", "email"),
    last_webhook_at: event_time
  )
end
```

**5. Retry failed webhooks:**
```ruby
# Retry job for failed webhooks
class RetryFailedWebhooksJob < ApplicationJob
  def perform
    WebhookEvent
      .where(status: "failed")
      .where("created_at > ?", 7.days.ago)  # don't retry ancient events
      .find_each do |webhook|
        ProcessWebhookJob.perform_later(webhook.external_id)
      end
  end
end

# Cron: run every hour
# Or let Sidekiq retry handle it (set retry count on ProcessWebhookJob)
class ProcessWebhookJob < ApplicationJob
  sidekiq_options retry: 5  # exponential backoff: 15s, 30s, ~1m, ~2m, ~4m
  # After 5 retries → dead queue for manual inspection
end
```

**6. Monitoring and alerting:**
```ruby
# Track webhook health
class WebhookMonitor
  def self.check
    # Failed webhooks in last hour
    failed = WebhookEvent.where(status: "failed")
                         .where("created_at > ?", 1.hour.ago).count

    # Pending webhooks older than 5 minutes (stuck?)
    stuck = WebhookEvent.where(status: "pending")
                        .where("created_at < ?", 5.minutes.ago).count

    # Alert if thresholds exceeded
    AlertService.notify("#{failed} failed webhooks in last hour") if failed > 10
    AlertService.notify("#{stuck} stuck webhooks") if stuck > 5
  end
end
```

**7. Multi-provider webhook router:**
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

**Rule of thumb:** Respond 200 immediately, process in background. Always verify signatures (constant-time comparison). Store raw events before processing. Use unique constraint on external_id for idempotency. Lock before processing to prevent races. Handle out-of-order by checking current state, not event sequence. Monitor failed/stuck webhooks. Keep webhook processing jobs retryable and idempotent.
