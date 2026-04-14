### Object Pool Pattern (Reuse Expensive Resources)

Maintain a pool of pre-created objects, check out / check in instead of create / destroy.

```ruby
class ConnectionPool
  def initialize(size:, &block)
    @available = Array.new(size) { block.call }
    @mutex = Mutex.new
  end

  def checkout
    @mutex.synchronize { @available.pop }
  end

  def checkin(conn)
    @mutex.synchronize { @available.push(conn) }
  end

  def with
    conn = checkout
    yield conn
  ensure
    checkin(conn)
  end
end

pool = ConnectionPool.new(size: 5) { PG.connect(dbname: "mydb") }
pool.with { |conn| conn.exec("SELECT 1") }
```

**Real-world examples:**
- **Database connection pools** (ActiveRecord pool, PgBouncer)
- **Thread pools** (Puma, Sidekiq)
- **HTTP connection pools** (Faraday persistent connections)
- **Redis connection pools** (connection_pool gem)

```ruby
# Ruby connection_pool gem (most common)
REDIS_POOL = ConnectionPool.new(size: 10) { Redis.new }
REDIS_POOL.with { |redis| redis.get("key") }
```

**Rule of thumb:** Object Pool for expensive-to-create resources (DB connections, network sockets, threads). Rails uses this internally for ActiveRecord connections. Use the `connection_pool` gem for Redis and other resources.
