### Rails Middleware Stack & Rack Pipeline

**What is middleware?**
Rack middleware is a chain of objects that process HTTP requests/responses. Each middleware wraps the next, forming a pipeline. Rails uses ActionDispatch middleware for logging, sessions, cookies, security headers, and more.

**Viewing the middleware stack:**
```ruby
# Terminal
$ bin/rails middleware

# Output (abbreviated):
# use ActionDispatch::HostAuthorization
# use Rack::Sendfile
# use ActionDispatch::Executor
# use ActiveSupport::Cache::Strategy::LocalCache::Middleware
# use Rack::Runtime
# use ActionDispatch::RequestId
# use ActionDispatch::RemoteIp
# use Rails::Rack::Logger
# use ActionDispatch::ShowExceptions
# use ActionDispatch::Callbacks
# use ActionDispatch::Cookies
# use ActionDispatch::Session::CookieStore
# use ActionDispatch::Flash
# use ActionDispatch::ContentSecurityPolicy::Middleware
# use Rack::Head
# use Rack::ConditionalGet
# use Rack::ETag
# run MyApp::Application.routes
```

**How a Rack middleware works:**
```ruby
class SimpleMiddleware
  def initialize(app)
    @app = app  # the next middleware in the chain
  end

  def call(env)
    # Before the request hits the app
    start = Time.now

    status, headers, response = @app.call(env)  # pass to next middleware

    # After the response comes back
    duration = Time.now - start
    headers["X-Response-Time"] = "#{duration.round(3)}s"

    [status, headers, response]
  end
end
```

**Custom middleware example (API rate limiting):**
```ruby
# app/middleware/rate_limiter.rb
class RateLimiter
  def initialize(app, limit: 100, window: 60)
    @app = app
    @limit = limit
    @window = window
  end

  def call(env)
    request = ActionDispatch::Request.new(env)
    key = "rate_limit:#{request.remote_ip}"
    count = Rails.cache.increment(key, 1, expires_in: @window.seconds)

    if count && count > @limit
      [429, { "Content-Type" => "application/json", "Retry-After" => @window.to_s },
       ['{"error":"Rate limit exceeded"}']]
    else
      @app.call(env)
    end
  end
end
```

**Adding middleware to the stack:**
```ruby
# config/application.rb (or config/environments/*.rb)

# Append to the end of the stack
config.middleware.use RateLimiter, limit: 100, window: 60

# Insert before a specific middleware
config.middleware.insert_before ActionDispatch::Cookies, RateLimiter

# Insert after a specific middleware
config.middleware.insert_after Rack::Runtime, RateLimiter

# Swap one middleware for another
config.middleware.swap ActionDispatch::ShowExceptions, CustomExceptionHandler

# Delete a middleware entirely
config.middleware.delete ActionDispatch::Flash  # common in API-only apps

# Move a middleware to a different position
config.middleware.move_after Rack::Runtime, RateLimiter
```

**Middleware for API-only apps (leaner stack):**
```ruby
# config/application.rb
module MyApp
  class Application < Rails::Application
    config.api_only = true
    # Removes session, cookies, flash, and browser-specific middleware
    # Much lighter stack for JSON APIs
  end
end
```

**Key ActionDispatch middleware:**
| Middleware | Purpose |
|-----------|---------|
| `ActionDispatch::RequestId` | Assigns unique X-Request-Id header for tracing |
| `ActionDispatch::RemoteIp` | Extracts client IP, handles proxies |
| `ActionDispatch::Cookies` | Cookie jar read/write |
| `ActionDispatch::Session::CookieStore` | Encrypted session in cookies |
| `ActionDispatch::Flash` | Flash messages between requests |
| `ActionDispatch::ContentSecurityPolicy` | CSP headers |
| `ActionDispatch::HostAuthorization` | Prevents DNS rebinding attacks |
| `Rack::Runtime` | Sets X-Runtime header (request duration) |
| `Rack::ETag` | Generates ETag for conditional GET |

**Middleware order matters:**
```ruby
# Logging should be early (to capture full request lifecycle)
# Authentication should come before authorization
# CORS headers must be set before the request is rejected

# Example: CORS middleware must be early so preflight OPTIONS
# requests get proper headers even if auth middleware rejects them
config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins "*"
    resource "*", headers: :any, methods: [:get, :post, :put, :delete, :options]
  end
end
```

**Testing middleware:**
```ruby
# spec/middleware/rate_limiter_spec.rb
RSpec.describe RateLimiter do
  let(:app) { ->(env) { [200, {}, ["OK"]] } }
  let(:middleware) { described_class.new(app, limit: 3, window: 60) }

  it "allows requests under the limit" do
    env = Rack::MockRequest.env_for("/api/data", "REMOTE_ADDR" => "1.2.3.4")
    status, _headers, _body = middleware.call(env)
    expect(status).to eq(200)
  end

  it "rejects requests over the limit" do
    env = Rack::MockRequest.env_for("/api/data", "REMOTE_ADDR" => "1.2.3.4")
    4.times { middleware.call(env) }
    status, _headers, _body = middleware.call(env)
    expect(status).to eq(429)
  end
end
```

**Rule of thumb:** Use `config.middleware.insert_before` when order matters (auth, CORS, logging). Use `config.middleware.use` to append non-order-sensitive middleware. In API-only apps, use `config.api_only = true` to strip browser middleware. Keep custom middleware single-purpose and testable. Always accept `app` as the first constructor argument.
