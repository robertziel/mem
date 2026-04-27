### Sidekiq Tuning & Monitoring

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

**Rule of thumb:** Set concurrency to match your DB pool size. Use separate Redis instances for Sidekiq and caching. Monitor queue depth and latency -- growing queues mean workers cannot keep up. Always make jobs idempotent and pass IDs not objects. Keep Sidekiq Pro/Enterprise in mind when you need batches, rate limiting, or unique jobs at scale.
