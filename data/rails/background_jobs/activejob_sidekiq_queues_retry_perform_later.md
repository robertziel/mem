### ActiveJob & Sidekiq (Background Jobs)

**ActiveJob (Rails abstraction):**
```ruby
class SendWelcomeEmailJob < ApplicationJob
  queue_as :default
  retry_on Net::SMTPError, wait: :polynomially_longer, attempts: 5
  discard_on ActiveJob::DeserializationError

  def perform(user)
    UserMailer.welcome(user).deliver_now
  end
end

# Enqueue
SendWelcomeEmailJob.perform_later(user)           # async
SendWelcomeEmailJob.set(wait: 5.minutes).perform_later(user)  # delayed
SendWelcomeEmailJob.set(queue: :mailers).perform_later(user)  # specific queue
```

**Sidekiq (most popular backend):**
```ruby
# config/application.rb
config.active_job.queue_adapter = :sidekiq

# config/sidekiq.yml
:concurrency: 10
:queues:
  - [critical, 3]    # weight 3
  - [default, 2]     # weight 2
  - [low, 1]         # weight 1
```

**Sidekiq native worker (skip ActiveJob):**
```ruby
class HardWorker
  include Sidekiq::Worker
  sidekiq_options queue: :default, retry: 5, dead: true

  def perform(user_id)
    user = User.find(user_id)
    # ... heavy work
  end
end

HardWorker.perform_async(user.id)                # enqueue
HardWorker.perform_in(5.minutes, user.id)        # delayed
HardWorker.perform_at(1.hour.from_now, user.id)  # scheduled
```

**Critical Sidekiq rules:**
```ruby
# ALWAYS pass primitive types (IDs, strings), NOT objects
# BAD: Sidekiq serializes the entire object to Redis
HardWorker.perform_async(user)         # ❌ Serializes User object

# GOOD: Pass the ID, load fresh in perform
HardWorker.perform_async(user.id)      # ✅ Just an integer
def perform(user_id)
  user = User.find(user_id)            # Load fresh from DB
end
```

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

**Rule of thumb:** Pass IDs not objects. Make every job idempotent (safe to retry). Use separate queues by priority. Set retry limits (don't retry forever). Monitor dead jobs. Use `perform_later` for async, `perform_now` only in tests or synchronous flows.
