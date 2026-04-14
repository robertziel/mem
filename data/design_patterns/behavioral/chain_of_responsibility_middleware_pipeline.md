### Chain of Responsibility (Middleware / Pipeline)

Pass a request along a chain of handlers until one handles it.

```ruby
class Handler
  def initialize(next_handler = nil)
    @next = next_handler
  end

  def handle(request)
    @next&.handle(request)
  end
end

class AuthenticationHandler < Handler
  def handle(request)
    unless request[:token]
      return { status: 401, body: "Unauthorized" }
    end
    super  # pass to next handler
  end
end

class RateLimitHandler < Handler
  def handle(request)
    if rate_limited?(request[:ip])
      return { status: 429, body: "Too many requests" }
    end
    super
  end
end

class LoggingHandler < Handler
  def handle(request)
    puts "Processing: #{request[:path]}"
    result = super
    puts "Completed: #{result[:status]}"
    result
  end
end

# Build chain
chain = LoggingHandler.new(
  AuthenticationHandler.new(
    RateLimitHandler.new(nil)
  )
)
chain.handle({ path: "/api/users", token: "abc", ip: "1.2.3.4" })
```

**Real-world examples:** Rack middleware stack, Express.js middleware, Rails `before_action` chains, Kubernetes admission controllers.

**Rule of thumb:** Chain of Responsibility for middleware pipelines, request processing, validation chains, approval workflows. Each handler decides to process or pass. The order matters — authenticate before authorize before process.
