### API Authentication in Rails

**Simple token authentication (DIY):**
```ruby
# Migration
class AddAuthTokenToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :auth_token, :string
    add_index :users, :auth_token, unique: true
  end
end

# Model
class User < ApplicationRecord
  before_create :generate_auth_token

  private

  def generate_auth_token
    self.auth_token = SecureRandom.hex(32)
  end
end

# Controller concern
module TokenAuthenticatable
  extend ActiveSupport::Concern

  included do
    before_action :authenticate_with_token!
  end

  private

  def authenticate_with_token!
    token = request.headers["Authorization"]&.remove("Bearer ")
    @current_user = User.find_by(auth_token: token)
    render json: { error: "Unauthorized" }, status: :unauthorized unless @current_user
  end

  def current_user
    @current_user
  end
end
```

**JWT authentication (stateless tokens):**
```ruby
# Gemfile
gem "jwt"

# app/services/jwt_service.rb
class JwtService
  SECRET = Rails.application.credentials.secret_key_base
  ALGORITHM = "HS256"

  def self.encode(payload, exp: 24.hours.from_now)
    payload[:exp] = exp.to_i
    JWT.encode(payload, SECRET, ALGORITHM)
  end

  def self.decode(token)
    decoded = JWT.decode(token, SECRET, true, algorithm: ALGORITHM)
    decoded.first.with_indifferent_access
  rescue JWT::ExpiredSignature
    raise AuthenticationError, "Token has expired"
  rescue JWT::DecodeError
    raise AuthenticationError, "Invalid token"
  end
end

# Sessions controller (login endpoint)
class Api::SessionsController < Api::BaseController
  skip_before_action :authenticate!, only: [:create]

  def create
    user = User.find_by(email: params[:email])

    if user&.authenticate(params[:password])
      token = JwtService.encode(user_id: user.id)
      render json: { token: token, expires_in: 24.hours.to_i }
    else
      render json: { error: "Invalid credentials" }, status: :unauthorized
    end
  end
end

# Base controller with JWT authentication
class Api::BaseController < ApplicationController
  before_action :authenticate!

  private

  def authenticate!
    header = request.headers["Authorization"]
    token = header&.split(" ")&.last
    payload = JwtService.decode(token)
    @current_user = User.find(payload[:user_id])
  rescue AuthenticationError, ActiveRecord::RecordNotFound
    render json: { error: "Unauthorized" }, status: :unauthorized
  end

  def current_user
    @current_user
  end
end

# Request: Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

**JWT refresh token pattern:**
```ruby
class Api::TokensController < Api::BaseController
  skip_before_action :authenticate!, only: [:refresh]

  def refresh
    old_token = params[:refresh_token]
    payload = JwtService.decode(old_token)

    user = User.find(payload[:user_id])
    refresh_record = user.refresh_tokens.find_by(token: old_token, revoked: false)

    if refresh_record
      refresh_record.update!(revoked: true)
      access_token = JwtService.encode({ user_id: user.id }, exp: 15.minutes.from_now)
      new_refresh = user.refresh_tokens.create!(
        token: JwtService.encode({ user_id: user.id }, exp: 7.days.from_now),
        expires_at: 7.days.from_now
      )
      render json: { access_token: access_token, refresh_token: new_refresh.token }
    else
      render json: { error: "Invalid refresh token" }, status: :unauthorized
    end
  end
end
```

**devise-jwt (Devise + JWT):**
```ruby
# Gemfile
gem "devise"
gem "devise-jwt"

# config/initializers/devise.rb
Devise.setup do |config|
  config.jwt do |jwt|
    jwt.secret = Rails.application.credentials.devise_jwt_secret
    jwt.dispatch_requests = [["POST", %r{^/api/login$}]]
    jwt.revocation_requests = [["DELETE", %r{^/api/logout$}]]
    jwt.expiration_time = 24.hours.to_i
  end
end

# User model (with JWT revocation via denylist)
class User < ApplicationRecord
  devise :database_authenticatable,
         :jwt_authenticatable,
         jwt_revocation_strategy: JwtDenylist
end

# JWT denylist table
class JwtDenylist < ApplicationRecord
  include Devise::JWT::RevocationStrategies::Denylist
  self.table_name = "jwt_denylists"
end

# Token is sent in Authorization header on login response
# and expected on every subsequent request
```

**devise_token_auth (token-based, not JWT):**
```ruby
# Gemfile
gem "devise_token_auth"

# Generates uid, tokens, etc. columns on User
$ bin/rails generate devise_token_auth:install User auth

# config/routes.rb
mount_devise_token_auth_for "User", at: "auth"
# Provides: POST /auth (register), POST /auth/sign_in, DELETE /auth/sign_out

# Tokens returned in response headers:
# access-token, client, uid
# Must be sent back on every request

# Controller
class Api::PostsController < ApplicationController
  include DeviseTokenAuth::Concerns::SetUserByToken
  before_action :authenticate_user!
end
```

**Doorkeeper (OAuth2 provider):**
```ruby
# Gemfile
gem "doorkeeper"

# Install
$ bin/rails generate doorkeeper:install
$ bin/rails generate doorkeeper:migration
$ bin/rails db:migrate

# config/initializers/doorkeeper.rb
Doorkeeper.configure do
  resource_owner_authenticator do
    current_user || warden.authenticate!(scope: :user)
  end

  # Grant types
  grant_flows %w[authorization_code client_credentials]

  # Token expiration
  access_token_expires_in 2.hours
  use_refresh_token

  # Scopes
  default_scopes :read
  optional_scopes :write, :admin
end

# Protecting API endpoints
class Api::PostsController < ApplicationController
  before_action :doorkeeper_authorize!

  def index
    posts = Post.where(user: current_resource_owner)
    render json: posts
  end

  private

  def current_resource_owner
    User.find(doorkeeper_token.resource_owner_id) if doorkeeper_token
  end
end

# routes.rb
use_doorkeeper  # mounts /oauth/authorize, /oauth/token, etc.
```

**API key authentication (for service-to-service):**
```ruby
# Migration
class CreateApiKeys < ActiveRecord::Migration[7.1]
  def change
    create_table :api_keys do |t|
      t.references :user, null: false, foreign_key: true
      t.string :key, null: false, index: { unique: true }
      t.string :name
      t.datetime :last_used_at
      t.datetime :expires_at
      t.timestamps
    end
  end
end

class ApiKey < ApplicationRecord
  belongs_to :user
  before_create { self.key = "sk_#{SecureRandom.hex(24)}" }

  scope :active, -> { where("expires_at IS NULL OR expires_at > ?", Time.current) }
end

# Authentication
module ApiKeyAuthenticatable
  private

  def authenticate_api_key!
    key = request.headers["X-Api-Key"]
    api_key = ApiKey.active.find_by(key: key)

    if api_key
      api_key.touch(:last_used_at)
      @current_user = api_key.user
    else
      render json: { error: "Invalid API key" }, status: :unauthorized
    end
  end
end
```

**Comparison of approaches:**
| Approach | Stateless | Revocable | Complexity | Best for |
|----------|-----------|-----------|------------|----------|
| Simple token | No (DB lookup) | Yes (delete token) | Low | Internal APIs, MVPs |
| JWT | Yes | Hard (needs denylist) | Medium | SPAs, mobile apps |
| devise-jwt | Yes | Yes (denylist) | Medium | Devise-based apps |
| devise_token_auth | No (DB lookup) | Yes | Medium | Multi-client apps |
| Doorkeeper (OAuth2) | Depends | Yes | High | Third-party API access |
| API key | No (DB lookup) | Yes (delete key) | Low | Service-to-service |

**Rule of thumb:** For SPAs and mobile apps, use JWT with short-lived access tokens and refresh tokens. For third-party API access, use Doorkeeper (OAuth2). For service-to-service, use API keys. For simple internal APIs, a plain token with database lookup is fine. Always use HTTPS. Never store tokens in localStorage (use httpOnly cookies for web apps). Set reasonable expiration times and implement token revocation.
