### Rails API-Only Mode

**Creating API-only app:**
```bash
rails new myapi --api
```

**What `--api` changes:**
- `ApplicationController` inherits from `ActionController::API` (not `ActionController::Base`)
- Removes browser middleware: cookies, sessions, flash, CSRF protection, static files
- No view layer (no layouts, no ERB templates)
- Generators don't create view files

**Adding back specific middleware if needed:**
```ruby
# config/application.rb
config.middleware.use ActionDispatch::Cookies
config.middleware.use ActionDispatch::Session::CookieStore
# Or add specific middleware per-controller
class SessionController < ApplicationController
  include ActionController::Cookies
end
```

**Standard API controller pattern:**
```ruby
class Api::V1::BaseController < ActionController::API
  include ActionController::HttpAuthentication::Token::ControllerMethods

  before_action :authenticate_user

  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from ActiveRecord::RecordInvalid, with: :unprocessable_entity
  rescue_from ActionController::ParameterMissing, with: :bad_request

  private

  def authenticate_user
    authenticate_or_request_with_http_token do |token|
      @current_user = User.find_by(api_token: token)
    end
  end

  def not_found(exception)
    render json: { error: exception.message }, status: :not_found
  end

  def unprocessable_entity(exception)
    render json: { errors: exception.record.errors }, status: :unprocessable_entity
  end

  def bad_request(exception)
    render json: { error: exception.message }, status: :bad_request
  end
end
```

**Rule of thumb:** Use `--api` flag for API-only apps to get a leaner middleware stack. Centralize error handling in a base controller with `rescue_from`. Only add back browser middleware (cookies, sessions) if you genuinely need it -- most token-based APIs do not.
