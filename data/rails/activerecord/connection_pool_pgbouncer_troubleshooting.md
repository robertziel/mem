### Connection Pool: PgBouncer, Sidekiq & Troubleshooting

**checkout_timeout (connection wait):**
```ruby
# When all connections are in use, a thread waits this long
# before raising ActiveRecord::ConnectionTimeoutError
production:
  pool: 5
  checkout_timeout: 5  # default: 5 seconds

# If you see ConnectionTimeoutError:
# 1. Increase pool size (if DB can handle more)
# 2. Reduce long-running queries
# 3. Ensure connections are returned (avoid leaking)
```

**Reaping dead connections:**
```ruby
# Dead connections: checked out but the thread that held them died
# Reaper periodically reclaims these

production:
  reaping_frequency: 10  # check every 10 seconds (default: 60)

# Manual reap (useful in debugging)
ActiveRecord::Base.connection_pool.reap

# Check pool status
pool = ActiveRecord::Base.connection_pool
pool.size          # configured pool size
pool.connections.size  # actual open connections
pool.stat          # { size: 5, connections: 3, busy: 2, dead: 0, idle: 1, waiting: 0, checkout_timeout: 5 }
```

**PgBouncer interaction:**
```ruby
# PgBouncer is a PostgreSQL connection pooler that sits between
# your app and PostgreSQL, multiplexing many app connections
# through fewer database connections.

# App (50 connections) --> PgBouncer (10 connections) --> PostgreSQL

# Transaction mode (most common):
# - Connection assigned only during a transaction
# - Released back to PgBouncer pool between transactions
# - CANNOT use: prepared statements, session-level settings, LISTEN/NOTIFY

# Session mode:
# - Connection held for entire session (like no PgBouncer)
# - Safe for all PostgreSQL features
# - Less multiplexing benefit

# Rails + PgBouncer in transaction mode:
production:
  url: <%= ENV["DATABASE_URL"] %>
  pool: 10
  prepared_statements: false  # REQUIRED for transaction mode
  advisory_locks: false        # REQUIRED for transaction mode
```

**Sidekiq connection pool:**
```ruby
# Sidekiq needs its own connection pool
# config/database.yml -- Sidekiq inherits this, or set via initializer

# config/initializers/sidekiq.rb
Sidekiq.configure_server do |config|
  config.redis = { url: ENV["REDIS_URL"] }

  # Ensure Sidekiq's pool matches its concurrency
  pool_size = Sidekiq[:concurrency] + 2  # extra for Sidekiq internals
  ActiveRecord::Base.connection_pool.disconnect!

  ActiveSupport.on_load(:active_record) do
    config = ActiveRecord::Base.configurations.resolve(Rails.env)
    config_hash = config.configuration_hash.merge(pool: pool_size)
    ActiveRecord::Base.establish_connection(config_hash)
  end
end
```

**Troubleshooting connection issues:**
```ruby
# 1. "could not obtain a connection from the pool within 5 seconds"
# ActiveRecord::ConnectionTimeoutError
# Fix: increase pool size or reduce concurrent DB usage

# 2. "too many connections for role"
# PostgreSQL max_connections exceeded
# Fix: use PgBouncer or reduce total pool across all processes

# 3. "PG::ConnectionBad: connection is closed"
# Stale connections (network blip, DB restart)
# Fix: enable reconnect or verify connections

# Check for connection leaks
ActiveRecord::Base.connection_pool.stat
# Look for: busy > expected, dead > 0

# Force clear all connections (use cautiously)
ActiveRecord::Base.connection_pool.disconnect!

# Verify connection on checkout (Rails 7.1+)
production:
  pool: 5
  retry_deadline: 5  # retry reconnecting for 5 seconds after failure
```

**Monitoring connections:**
```ruby
# PostgreSQL: check active connections
# SELECT count(*) FROM pg_stat_activity;
# SELECT usename, application_name, state, count(*)
# FROM pg_stat_activity GROUP BY 1, 2, 3;

# Rails: check pool stats
ActiveRecord::Base.connection_pool.stat
# => { size: 5, connections: 3, busy: 1, dead: 0, idle: 2, waiting: 0 }

# Log slow checkouts (add to an initializer)
ActiveSupport::Notifications.subscribe("!connection.active_record") do |*args|
  event = ActiveSupport::Notifications::Event.new(*args)
  if event.duration > 100  # ms
    Rails.logger.warn "Slow DB checkout: #{event.duration.round(1)}ms"
  end
end
```

**Rule of thumb:** Use PgBouncer in transaction mode when you need more app connections than PostgreSQL can handle -- but disable prepared statements and advisory locks. Set Sidekiq's pool to concurrency + 2. Monitor `pool.stat` and watch for growing `waiting` or `dead` counts. When you see ConnectionTimeoutError, increase pool size or find the long-running query that is hogging connections.
