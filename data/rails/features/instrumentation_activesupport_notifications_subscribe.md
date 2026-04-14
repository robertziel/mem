### Rails Instrumentation (ActiveSupport::Notifications)

**What ActiveSupport::Notifications does:**
- Provides a pub/sub system for instrumenting events in Rails
- Rails core emits events for every request, SQL query, cache operation, mail delivery
- You can subscribe to built-in events or create your own
- Foundation for logging, monitoring, APM tools (New Relic, Datadog, Skylight)

**Subscribing to events:**
```ruby
# Subscribe to all controller actions
ActiveSupport::Notifications.subscribe("process_action.action_controller") do |event|
  event.name       # "process_action.action_controller"
  event.duration   # 123.45 (milliseconds)
  event.payload    # { controller: "PostsController", action: "index", ... }

  Rails.logger.info "#{event.payload[:controller]}##{event.payload[:action]} " \
                    "took #{event.duration.round(1)}ms " \
                    "status=#{event.payload[:status]}"
end

# Subscribe to SQL queries
ActiveSupport::Notifications.subscribe("sql.active_record") do |event|
  payload = event.payload
  unless payload[:name] == "SCHEMA"  # skip schema queries
    Rails.logger.debug "SQL (#{event.duration.round(1)}ms): #{payload[:sql]}"
  end
end
```

**Common built-in events:**
```ruby
# Controller events
"process_action.action_controller"   # full request processing
"start_processing.action_controller" # request starts
"redirect_to.action_controller"      # redirect
"halted_callback.action_controller"  # callback chain halted

# ActiveRecord events
"sql.active_record"                  # every SQL query
"instantiation.active_record"        # record instantiation

# Cache events
"cache_read.active_support"          # cache read
"cache_write.active_support"         # cache write
"cache_fetch_hit.active_support"     # cache hit
"cache_generate.active_support"      # cache miss, generated

# ActionMailer events
"deliver.action_mailer"              # email sent

# ActiveJob events
"perform.active_job"                 # job executed
"enqueue.active_job"                 # job enqueued

# View rendering
"render_template.action_view"        # template rendered
"render_partial.action_view"         # partial rendered
```

**Custom instrumentation:**
```ruby
# Instrument your own code
class PaymentService
  def charge(user, amount)
    ActiveSupport::Notifications.instrument(
      "charge.payment_service",
      user_id: user.id,
      amount: amount
    ) do
      # The actual work goes inside the block
      gateway.charge(user.payment_method, amount)
      # Block return value is passed through
    end
  end
end

# Subscribe to your custom event
ActiveSupport::Notifications.subscribe("charge.payment_service") do |event|
  StatsD.measure("payment.charge.duration", event.duration)
  StatsD.increment("payment.charge.count")

  if event.payload[:exception]
    StatsD.increment("payment.charge.failure")
  end
end
```

**Using a LogSubscriber (class-based subscriber):**
```ruby
# More structured than block-based subscribers
class PaymentLogSubscriber < ActiveSupport::LogSubscriber
  def charge(event)
    info do
      amount = event.payload[:amount]
      user_id = event.payload[:user_id]
      "Payment charged: user=#{user_id} amount=#{amount} " \
        "duration=#{event.duration.round(1)}ms"
    end
  end

  def refund(event)
    info do
      "Payment refunded: #{event.payload[:amount]} " \
        "duration=#{event.duration.round(1)}ms"
    end
  end
end

# Attach to the namespace
PaymentLogSubscriber.attach_to(:payment_service)

# Now these events trigger the subscriber:
# "charge.payment_service" -> PaymentLogSubscriber#charge
# "refund.payment_service" -> PaymentLogSubscriber#refund
```

**Monotonic subscribe (for timing only):**
```ruby
# Uses monotonic clock -- immune to system clock changes
ActiveSupport::Notifications.monotonic_subscribe("sql.active_record") do |event|
  # event.duration uses monotonic time, more accurate for benchmarking
  if event.duration > 100  # slow query threshold (ms)
    SlowQueryLogger.log(
      sql: event.payload[:sql],
      duration: event.duration,
      caller: event.payload[:connection]
    )
  end
end
```

**Practical examples:**
```ruby
# Track slow requests in an initializer
# config/initializers/slow_request_logger.rb
ActiveSupport::Notifications.subscribe("process_action.action_controller") do |event|
  if event.duration > 500  # 500ms threshold
    Rails.logger.warn(
      "[SLOW REQUEST] #{event.payload[:controller]}##{event.payload[:action]} " \
      "took #{event.duration.round(0)}ms " \
      "params=#{event.payload[:params].except('controller', 'action')}"
    )
  end
end

# Count N+1 queries per request
class QueryCounter
  def initialize
    @count = 0
    @subscriber = ActiveSupport::Notifications.subscribe("sql.active_record") do |event|
      @count += 1 unless event.payload[:name] == "SCHEMA"
    end
  end

  def count
    @count
  end

  def teardown
    ActiveSupport::Notifications.unsubscribe(@subscriber)
  end
end

# Usage in middleware or around_action
around_action :track_queries

def track_queries
  counter = QueryCounter.new
  yield
  if counter.count > 20
    Rails.logger.warn "[HIGH QUERY COUNT] #{counter.count} queries in #{action_name}"
  end
ensure
  counter.teardown
end
```

**Unsubscribing:**
```ruby
# Store the subscriber reference
subscriber = ActiveSupport::Notifications.subscribe("sql.active_record") do |event|
  # ...
end

# Unsubscribe later
ActiveSupport::Notifications.unsubscribe(subscriber)

# Unsubscribe by event name (removes ALL subscribers for that event)
ActiveSupport::Notifications.unsubscribe("sql.active_record")
```

**Event payload reference:**
| Event | Key Payload Fields |
|-------|--------------------|
| process_action.action_controller | :controller, :action, :params, :status, :format, :method, :path, :db_runtime, :view_runtime |
| sql.active_record | :sql, :name, :binds, :connection |
| render_template.action_view | :identifier, :layout |
| cache_read.active_support | :key, :hit, :super_operation |
| deliver.action_mailer | :mailer, :message_id, :subject, :to |
| perform.active_job | :job, :adapter, :db_runtime |

**Rule of thumb:** Subscribe to `process_action.action_controller` for request-level monitoring and `sql.active_record` for query analysis. Use `instrument` with a block to wrap your own business operations so APM tools can track them. Prefer `LogSubscriber` over block-based subscribers when you have multiple events in the same domain. Always unsubscribe in tests to avoid leaking subscribers across examples.
