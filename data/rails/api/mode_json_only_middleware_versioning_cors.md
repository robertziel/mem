### Rails API Mode

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

**API versioning (URL namespace):**
```ruby
# config/routes.rb
namespace :api do
  namespace :v1 do
    resources :users
    resources :posts
  end
  namespace :v2 do
    resources :users    # newer version with different response format
  end
end

# app/controllers/api/v1/users_controller.rb
class Api::V1::UsersController < Api::V1::BaseController
  def index
    users = User.all
    render json: UserBlueprint.render(users)
  end
end
```

**CORS (Cross-Origin Resource Sharing):**
```ruby
# Gemfile
gem 'rack-cors'

# config/initializers/cors.rb
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins 'https://frontend.example.com', 'http://localhost:3000'
    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options],
      credentials: true,
      max_age: 86400
  end
end
```

**Response envelope pattern:**
```ruby
# Consistent response format
def render_success(data, status: :ok, meta: {})
  render json: { data: data, meta: meta }, status: status
end

def render_error(message, status: :unprocessable_entity, errors: [])
  render json: { error: message, errors: errors }, status: status
end

# Usage
render_success(UserBlueprint.render(@users), meta: { total: @users.count })
render_error("Validation failed", errors: user.errors.full_messages, status: :unprocessable_entity)
```

**Rule of thumb:** Use `--api` flag for API-only apps. Namespace routes under `/api/v1`. Centralize error handling in base controller with `rescue_from`. Configure CORS for frontend domains. Use consistent response envelope format. Version via URL path.
