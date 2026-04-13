### Rails API Authentication: Doorkeeper (OAuth2 Provider)

```ruby
# Gemfile
gem 'doorkeeper'

# Install
rails generate doorkeeper:install
rails generate doorkeeper:migration
rails db:migrate

# config/initializers/doorkeeper.rb
Doorkeeper.configure do
  resource_owner_authenticator do
    current_user || redirect_to(login_url)
  end
  grant_flows %w[authorization_code client_credentials]
end

# Protect API endpoints
class Api::V1::UsersController < ApplicationController
  before_action :doorkeeper_authorize!

  def index
    render json: User.all
  end
end
```

**When to use Doorkeeper:**
- You're building an API that third parties will consume
- You need OAuth2 flows (authorization code, client credentials)
- You need scoped access tokens
- You're building a platform (like GitHub API)

**Rule of thumb:** Doorkeeper when you need a full OAuth2 provider (third-party app access, scoped tokens). Overkill for simple first-party API auth — use JWT or simple tokens instead.
