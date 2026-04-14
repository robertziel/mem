### Ruby Exception Handling: Retry, Inline Rescue & Rails

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

**Rule of thumb:** Retry transient errors (network, timeout) with exponential backoff and a max attempt limit. Use method-level rescue for simple fallback patterns. In Rails, use `rescue_from` in controllers for clean, consistent error responses. Log every rescue. Don't use exceptions for control flow.
