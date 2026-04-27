### ActiveJob Basics & Sidekiq Setup

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
HardWorker.perform_async(user)         # Serializes User object

# GOOD: Pass the ID, load fresh in perform
HardWorker.perform_async(user.id)      # Just an integer
def perform(user_id)
  user = User.find(user_id)            # Load fresh from DB
end
```

**Rule of thumb:** Use ActiveJob for portability across backends. Use Sidekiq native workers for Sidekiq-specific features (fine-grained retry, options). Always pass IDs not objects -- Sidekiq serializes arguments to JSON in Redis. Use `perform_later` for async, `perform_now` only in tests or synchronous flows.
