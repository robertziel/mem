### Database Connection Pool: Basics & Sizing

**What is the connection pool?**
ActiveRecord maintains a pool of database connections. Each thread that needs to talk to the database checks out a connection from the pool and returns it when done. If the pool is exhausted, threads wait (up to `checkout_timeout`) and then raise an error.

**Basic configuration:**
```yaml
# config/database.yml
production:
  adapter: postgresql
  pool: <%= ENV.fetch("RAILS_MAX_THREADS", 5) %>
  checkout_timeout: 5   # seconds to wait for a connection (default: 5)
  reaping_frequency: 10  # seconds between dead connection checks (default: 60)
  url: <%= ENV["DATABASE_URL"] %>
```

**Pool size vs Puma threads:**
```ruby
# The pool must be >= the number of threads that can run concurrently

# Puma config (config/puma.rb)
threads_count = ENV.fetch("RAILS_MAX_THREADS", 5).to_i
threads threads_count, threads_count
workers ENV.fetch("WEB_CONCURRENCY", 2).to_i

# Each Puma WORKER (process) gets its own connection pool
# Each THREAD within a worker needs one connection
# So: pool >= threads per worker

# Example: 2 workers x 5 threads = 10 threads total
# But pool only needs to be 5 (per-worker, not total)
# Total DB connections = workers * pool = 2 * 5 = 10
```

**The math:**
```
Total DB connections = Puma workers * pool size
                     + Sidekiq concurrency * 1 (Sidekiq pool)
                     + other processes (console, cron, etc.)

Example:
  Puma: 3 workers * 5 threads/pool = 15 connections
  Sidekiq: 10 threads               = 10 connections
  Console/cron:                      =  2 connections
  Total:                             = 27 connections

  PostgreSQL max_connections default = 100
  Remaining for other apps:          = 73
```

| Component | Connections needed |
|-----------|-------------------|
| Puma worker | pool size (= thread count) |
| Sidekiq process | concurrency setting |
| Rails console | 1 |
| Rake tasks | 1 |
| Total | Sum of all the above |

**Rule of thumb:** Set pool size equal to Puma thread count (per worker). Total DB connections = (Puma workers * pool) + Sidekiq concurrency + overhead. Always check PostgreSQL `max_connections` can handle the total. If your math puts you above 100 connections, you need PgBouncer or need to reduce pool sizes.
