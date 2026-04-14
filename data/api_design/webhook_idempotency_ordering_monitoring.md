### Webhook Idempotency, Ordering & Monitoring

**Problem:** Webhooks can arrive out of order, be duplicated, or fail silently. Your processing must be idempotent, order-aware, and observable.

**1. Idempotency — handle duplicate deliveries:**
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

**2. Handling out-of-order events:**
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

**3. Retry failed webhooks:**
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

**4. Monitoring and alerting:**
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

**Rule of thumb:** Use unique constraint on external_id for idempotency. Lock before processing to prevent races. Handle out-of-order events by checking current state (not event sequence) or using timestamp-based last-write-wins. Keep webhook processing jobs retryable and idempotent. Monitor failed/stuck webhooks and alert when thresholds are exceeded.
