### ActiveJob Retry, Idempotency & Testing

**Retry and error handling:**
```ruby
class ImportJob < ApplicationJob
  retry_on ActiveRecord::Deadlocked, wait: 5.seconds, attempts: 3
  retry_on Net::OpenTimeout, wait: :polynomially_longer, attempts: 10
  discard_on ActiveJob::DeserializationError  # record was deleted

  # Sidekiq native retry
  sidekiq_options retry: 5  # retries with exponential backoff
  # Retry schedule: 15s, ~30s, ~1m, ~2m, ~4m, then dead queue
end
```

**Idempotency (critical for reliability):**
```ruby
class ChargePaymentJob < ApplicationJob
  def perform(order_id, idempotency_key)
    return if Payment.exists?(idempotency_key: idempotency_key)

    order = Order.find(order_id)
    Payment.create!(
      order: order,
      idempotency_key: idempotency_key,
      amount: order.total
    )
    PaymentGateway.charge(order.total, idempotency_key: idempotency_key)
  end
end
```

**Queue design:**
| Queue | Priority | Use for |
|-------|----------|---------|
| critical | Highest | Payments, security alerts |
| default | Normal | Emails, notifications |
| low | Lowest | Reports, analytics, cleanup |

**Monitoring:**
- Sidekiq Web UI: mount in routes for queue/job monitoring
- Track: queue depth, processing time, retry count, dead jobs
- Alert on: growing queue depth, high retry rate, dead jobs

```ruby
# config/routes.rb
require 'sidekiq/web'
mount Sidekiq::Web => '/sidekiq'  # protect with auth in production
```

**Testing:**
```ruby
# RSpec: test that job is enqueued
expect { described_class.perform_later(user.id) }
  .to have_enqueued_job(SendWelcomeEmailJob).with(user.id)

# Test job logic directly
SendWelcomeEmailJob.perform_now(user.id)

# Sidekiq testing modes
Sidekiq::Testing.fake!    # jobs pushed to array, not executed
Sidekiq::Testing.inline!  # jobs execute immediately
```

**Rule of thumb:** Make every job idempotent (safe to retry). Use `retry_on` with specific exceptions and limited attempts -- do not retry forever. Use idempotency keys for payment and other critical operations. Monitor dead jobs. Use `Sidekiq::Testing.fake!` in tests to assert jobs are enqueued without executing them.
