### Sidekiq Architecture & Queues

**Architecture overview:**
Sidekiq is a multi-threaded background job processor for Ruby. It uses Redis as a job queue. A Sidekiq process fetches jobs from Redis queues and executes them in threads. This is far more memory-efficient than process-based alternatives (Resque).

```
Client (Rails app) --> Redis (queue storage) --> Sidekiq server (thread pool)
```

**Basic setup:**
```ruby
# Gemfile
gem "sidekiq"

# config/application.rb
config.active_job.queue_adapter = :sidekiq

# config/initializers/sidekiq.rb
Sidekiq.configure_server do |config|
  config.redis = { url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0") }
end

Sidekiq.configure_client do |config|
  config.redis = { url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0") }
end
```

**Queues and priorities:**
```yaml
# config/sidekiq.yml
:concurrency: 10
:queues:
  - [critical, 6]    # weight 6 -- checked 6x more often
  - [default, 3]     # weight 3
  - [low, 1]         # weight 1
  - [mailers, 2]     # weight 2

# Strict ordering (process queues left to right, not weighted)
:queues:
  - critical         # fully drained before moving to default
  - default
  - low
```

```ruby
# Assign jobs to queues
class PaymentJob < ApplicationJob
  queue_as :critical

  def perform(order_id)
    # process payment
  end
end

# Sidekiq native
class ReportWorker
  include Sidekiq::Worker
  sidekiq_options queue: :low, retry: 3

  def perform(report_id)
    # generate report
  end
end
```

| Queue | Weight | Use for |
|-------|--------|---------|
| critical | Highest | Payments, security, auth |
| default | Normal | General background work |
| mailers | Normal | Email delivery |
| low | Lowest | Reports, analytics, cleanup |

**Rule of thumb:** Use weighted queues to prioritize critical work. Set weights proportional to importance. Use strict ordering only when critical jobs must always run first. Assign every job to an explicit queue rather than relying on the default.
