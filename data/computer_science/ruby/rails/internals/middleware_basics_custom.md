### Rails Middleware Basics & Custom Middleware

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

**Rule of thumb:** Middleware forms a pipeline -- each piece wraps the next. Always accept `app` as the first constructor argument. Keep custom middleware single-purpose. Use `bin/rails middleware` to inspect the current stack.
