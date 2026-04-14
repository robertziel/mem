### Rails API Authentication: Simple Token (Database Lookup)

```ruby
class User < ApplicationRecord
  has_secure_token :api_token  # generates unique token on create
end

class ApiController < ActionController::API
  before_action :authenticate

  private

  def authenticate
    token = request.headers["Authorization"]&.split(" ")&.last
    @current_user = User.find_by(api_token: token)
    render json: { error: "Unauthorized" }, status: :unauthorized unless @current_user
  end
end
```

- Token stored in database, looked up on every request
- Simple, easy to revoke (delete/regenerate token)
- Every request hits the database

**Rule of thumb:** Simple token auth for internal APIs with low traffic. Easy to implement, easy to revoke. For higher traffic, use JWT (stateless) to avoid DB lookup per request.
