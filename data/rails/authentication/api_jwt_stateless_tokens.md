### Rails API Authentication: JWT (Stateless Tokens)

**JWT structure:** `header.payload.signature` (Base64-encoded, signed)

```ruby
# Encode
payload = { user_id: user.id, exp: 15.minutes.from_now.to_i }
token = JWT.encode(payload, Rails.application.secret_key_base, 'HS256')

# Decode
decoded = JWT.decode(token, Rails.application.secret_key_base, true, algorithm: 'HS256')
user_id = decoded.first["user_id"]

# Controller
class ApiController < ActionController::API
  before_action :authenticate

  private

  def authenticate
    token = request.headers["Authorization"]&.split(" ")&.last
    decoded = JWT.decode(token, Rails.application.secret_key_base)
    @current_user = User.find(decoded.first["user_id"])
  rescue JWT::DecodeError, JWT::ExpiredSignature
    render json: { error: "Unauthorized" }, status: :unauthorized
  end
end
```

**Refresh token flow:**
```
1. Login: POST /auth/login → { access_token (15min), refresh_token (7d) }
2. API calls: Authorization: Bearer <access_token>
3. Token expired: POST /auth/refresh { refresh_token } → new tokens
4. Logout: revoke refresh_token server-side
```

**Rule of thumb:** Short-lived access tokens (15 min) + refresh tokens (stored in httpOnly cookie). Stateless = no DB lookup per request. Can't revoke individual JWTs (use short expiry). Use `devise-jwt` gem for Rails integration.
