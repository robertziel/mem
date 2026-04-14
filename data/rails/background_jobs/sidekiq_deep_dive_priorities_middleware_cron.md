### Sidekiq Deep Dive

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

**Sidekiq middleware chain:**
```ruby
# Server middleware runs around each job execution
# Client middleware runs when a job is pushed to Redis

# Custom server middleware (e.g., logging, multi-tenancy)
class TenantMiddleware
  def call(worker, job, queue)
    tenant = job["tenant_id"]
    Apartment::Tenant.switch(tenant) do
      yield  # execute the job
    end
  end
end

# Custom client middleware (e.g., inject tenant context)
class TenantClientMiddleware
  def call(worker_class, job, queue, redis_pool)
    job["tenant_id"] = Current.tenant&.id
    yield  # push to Redis
  end
end

# Register middleware
Sidekiq.configure_server do |config|
  config.server_middleware do |chain|
    chain.add TenantMiddleware
  end
end

Sidekiq.configure_client do |config|
  config.client_middleware do |chain|
    chain.add TenantClientMiddleware
  end
end
```

**Retry strategies:**
```ruby
class ImportWorker
  include Sidekiq::Worker
  sidekiq_options retry: 10  # max 10 retries (default is 25)

  # Retry schedule: exponential backoff
  # Attempt 1: ~15s, Attempt 2: ~30s, Attempt 3: ~1m, ...
  # Formula: (count ** 4) + 15 + (rand(10) * (count + 1)) seconds

  sidekiq_retry_in do |count, exception|
    case exception
    when RateLimitError
      60 * (count + 1)  # linear backoff for rate limits
    else
      :default           # use Sidekiq's default exponential backoff
    end
  end

  sidekiq_retries_exhausted do |msg, exception|
    # Called when all retries are used up
    ErrorTracker.notify(exception, job: msg)
    FailedJob.create!(job_class: msg["class"], args: msg["args"], error: exception.message)
  end

  def perform(import_id)
    # work that may fail
  end
end
```

**Scheduled and cron jobs:**
```ruby
# Delayed execution
MyWorker.perform_in(5.minutes, arg1)
MyWorker.perform_at(2.hours.from_now, arg1)

# Cron jobs with sidekiq-cron gem
# Gemfile: gem "sidekiq-cron"

# config/initializers/sidekiq_cron.rb
Sidekiq::Cron::Job.load_from_hash(
  "daily_cleanup" => {
    "cron" => "0 3 * * *",   # 3 AM daily
    "class" => "CleanupWorker",
    "queue" => "low"
  },
  "hourly_sync" => {
    "cron" => "0 * * * *",
    "class" => "SyncWorker",
    "args" => ["full"]
  }
)

# Or with sidekiq-scheduler gem
# config/sidekiq.yml
:schedule:
  daily_cleanup:
    cron: "0 3 * * *"
    class: CleanupWorker
    queue: low
```

**Concurrency tuning:**
```yaml
# config/sidekiq.yml
:concurrency: 10  # number of threads per Sidekiq process

# Rule: Sidekiq concurrency <= DB connection pool size
# If concurrency is 10, pool in database.yml must be >= 10
```

```ruby
# config/database.yml
production:
  pool: <%= ENV.fetch("RAILS_MAX_THREADS", 10) %>
```

**Redis requirements:**
```ruby
# Memory: ~10 KB per enqueued job, plan for peak queue depth
# Persistence: use RDB + AOF for durability
# Separate Redis: keep Sidekiq Redis separate from cache Redis
# Version: Redis 4.0+ required for Sidekiq 7+

# Connection pool sizing
# Sidekiq server needs: concurrency + 5 connections
# Each Rails process (client) needs: ~5 connections
Sidekiq.configure_server do |config|
  config.redis = { url: ENV["REDIS_URL"], size: 15 }  # concurrency(10) + 5
end
```

**Sidekiq Pro/Enterprise features:**
| Feature | Version | What it does |
|---------|---------|-------------|
| Batches | Pro | Group jobs, callback when all complete |
| Rate limiting | Enterprise | Limit job throughput (e.g., API rate limits) |
| Unique jobs | Enterprise | Prevent duplicate enqueues |
| Periodic jobs | Enterprise | Built-in cron (no extra gem) |
| Rolling restarts | Enterprise | Zero-downtime deploys |
| Multi-Redis | Enterprise | Shard across Redis instances |
| Encryption | Enterprise | Encrypt job payloads at rest |

**Monitoring and Web UI:**
```ruby
# config/routes.rb
require "sidekiq/web"

authenticate :user, ->(u) { u.admin? } do
  mount Sidekiq::Web => "/sidekiq"
end

# Monitor these metrics:
# - Queue depth (growing = workers can't keep up)
# - Latency (time from enqueue to start processing)
# - Retry set size (high = jobs keep failing)
# - Dead set size (jobs that exhausted retries)
# - Processed/Failed rate
```

**Best practices:**
```ruby
# 1. Pass primitives, not objects
MyWorker.perform_async(user.id)   # good
MyWorker.perform_async(user)      # bad -- serializes entire object

# 2. Make jobs idempotent
def perform(order_id)
  order = Order.find(order_id)
  return if order.already_processed?
  order.process!
end

# 3. Keep jobs small and fast
# Break large work into multiple jobs
class BulkImportWorker
  def perform(file_id)
    rows = CsvParser.parse(file_id)
    rows.each_slice(100) do |batch|
      ImportBatchWorker.perform_async(batch.map(&:to_h))
    end
  end
end
```

**Rule of thumb:** Set concurrency to match your DB pool size. Use weighted queues to prioritize critical work. Always make jobs idempotent -- they will be retried. Pass IDs not objects. Use separate Redis instances for Sidekiq and caching. Monitor queue depth and latency. Use sidekiq-cron for scheduled tasks. Keep Sidekiq Pro/Enterprise in mind when you need batches, rate limiting, or unique jobs at scale.
