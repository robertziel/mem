### Ruby Exception Handling Basics & Hierarchy

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

**Rule of thumb:** Rescue specific exceptions, not generic `StandardError`. Never rescue `Exception` — it catches signals and system errors. Build a custom exception hierarchy under `StandardError` for your domain. Use `ensure` for cleanup (close files, release locks). Always re-raise if you can't meaningfully handle the error.
