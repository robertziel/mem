### Sidekiq Middleware & Retry Strategies

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

**Rule of thumb:** Use server middleware for cross-cutting concerns (tenancy, logging, metrics). Use client middleware to inject context before jobs hit Redis. Always handle `sidekiq_retries_exhausted` to track permanently failed jobs. Use `sidekiq_retry_in` for custom backoff when dealing with rate-limited APIs. Use sidekiq-cron for recurring scheduled tasks.
