### Ruby Exception Handling

**Basic structure:**
```ruby
begin
  risky_operation
rescue SpecificError => e
  handle_error(e)
rescue AnotherError, YetAnotherError => e
  handle_other(e)
rescue => e                    # catches all StandardError
  log_error(e)
  raise                        # re-raise same exception
ensure
  cleanup                      # ALWAYS runs (like finally)
end
```

**Exception hierarchy:**
```
Exception (never rescue this)
  ├── NoMemoryError
  ├── ScriptError
  │     ├── LoadError
  │     └── SyntaxError
  ├── SignalException (Ctrl+C)
  └── StandardError (rescue this and below)
        ├── ArgumentError
        ├── IOError
        ├── NameError
        │     └── NoMethodError
        ├── RuntimeError (default for `raise "msg"`)
        ├── TypeError
        ├── RangeError
        ├── ZeroDivisionError
        ├── Timeout::Error
        └── ActiveRecord::RecordNotFound (Rails)
```

**rescue only StandardError (not Exception):**
```ruby
# BAD: catches Ctrl+C, out of memory, syntax errors
rescue Exception => e

# GOOD: catches application-level errors only
rescue StandardError => e
# or simply:
rescue => e  # implicitly catches StandardError
```

**Custom exceptions:**
```ruby
module MyApp
  class Error < StandardError; end
  class NotFoundError < Error; end
  class AuthorizationError < Error; end
  class PaymentError < Error
    attr_reader :code

    def initialize(message, code: nil)
      @code = code
      super(message)
    end
  end
end

# Usage
raise MyApp::PaymentError.new("Card declined", code: "card_declined")

# Catch
rescue MyApp::PaymentError => e
  logger.error("Payment failed: #{e.message}, code: #{e.code}")
```

**retry (re-execute the begin block):**
```ruby
attempts = 0
begin
  attempts += 1
  external_api_call
rescue Net::OpenTimeout, Net::ReadTimeout => e
  retry if attempts < 3
  raise  # give up after 3 attempts
end
```

**Retry with exponential backoff:**
```ruby
attempts = 0
begin
  attempts += 1
  external_api_call
rescue Faraday::TimeoutError => e
  if attempts < 5
    sleep(2 ** attempts)  # 2, 4, 8, 16, 32 seconds
    retry
  end
  raise
end
```

**Method-level rescue (syntactic sugar):**
```ruby
def find_user(id)
  User.find(id)
rescue ActiveRecord::RecordNotFound
  nil
end
```

**Rails controller exception handling:**
```ruby
class ApplicationController < ActionController::Base
  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from MyApp::AuthorizationError, with: :forbidden

  private

  def not_found
    render json: { error: "Not found" }, status: :not_found
  end

  def forbidden
    render json: { error: "Forbidden" }, status: :forbidden
  end
end
```

**Best practices:**
- Rescue specific exceptions, not generic `StandardError`
- Use custom exception classes for domain errors
- Always log the exception (message + backtrace)
- Re-raise if you can't meaningfully handle the error
- Use `ensure` for cleanup (close files, release locks)
- Don't use exceptions for control flow (use conditionals instead)
- In Rails: use `rescue_from` in controllers for consistent error responses

**Rule of thumb:** Rescue specific, raise descriptive. Never rescue `Exception`. Use custom exception hierarchy for your domain. Retry transient errors (network, timeout) with backoff. Log every rescue. Use `rescue_from` in Rails controllers for clean error handling.
