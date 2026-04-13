### Authentication: Devise & OmniAuth

**Devise setup:**
```ruby
# Gemfile
gem 'devise'

# Install
rails generate devise:install
rails generate devise User
rails db:migrate
```

**Devise modules:**
| Module | Purpose |
|--------|---------|
| `database_authenticatable` | Hash and store password, authenticate via POST |
| `registerable` | Register, edit, delete account |
| `recoverable` | Reset password via email |
| `rememberable` | "Remember me" cookie |
| `validatable` | Email/password validations |
| `confirmable` | Email confirmation on signup |
| `lockable` | Lock account after N failed attempts |
| `trackable` | Track sign-in count, timestamps, IPs |
| `timeoutable` | Expire session after inactivity |
| `omniauthable` | OmniAuth integration (Google, GitHub, etc.) |

```ruby
class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :confirmable, :lockable, :trackable, :omniauthable,
         omniauth_providers: [:google_oauth2, :github]
end
```

**Devise controller helpers:**
```ruby
# In controllers
before_action :authenticate_user!  # require login
current_user                        # logged-in user (nil if not)
user_signed_in?                     # boolean
sign_in(user)                       # programmatic sign-in
sign_out(user)                      # programmatic sign-out

# In views
<% if user_signed_in? %>
  Welcome, <%= current_user.email %>
  <%= link_to "Sign out", destroy_user_session_path, method: :delete %>
<% else %>
  <%= link_to "Sign in", new_user_session_path %>
<% end %>
```

**Customizing Devise controllers:**
```ruby
# Generate controllers
rails generate devise:controllers users

# config/routes.rb
devise_for :users, controllers: {
  sessions: 'users/sessions',
  registrations: 'users/registrations'
}

# app/controllers/users/registrations_controller.rb
class Users::RegistrationsController < Devise::RegistrationsController
  private

  def sign_up_params
    params.require(:user).permit(:name, :email, :password, :password_confirmation)
  end
end
```

**OmniAuth (social login):**
```ruby
# Gemfile
gem 'omniauth-google-oauth2'
gem 'omniauth-github'
gem 'omniauth-rails_csrf_protection'

# config/initializers/devise.rb
config.omniauth :google_oauth2,
  Rails.application.credentials.google[:client_id],
  Rails.application.credentials.google[:client_secret]

# app/models/user.rb
def self.from_omniauth(auth)
  where(provider: auth.provider, uid: auth.uid).first_or_create do |user|
    user.email = auth.info.email
    user.name = auth.info.name
    user.password = Devise.friendly_token[0, 20]
  end
end

# app/controllers/users/omniauth_callbacks_controller.rb
class Users::OmniauthCallbacksController < Devise::OmniauthCallbacksController
  def google_oauth2
    @user = User.from_omniauth(request.env["omniauth.auth"])
    if @user.persisted?
      sign_in_and_redirect @user
    else
      redirect_to new_user_registration_url
    end
  end
end
```

**Devise for API (token auth):**
```ruby
# Option 1: devise-jwt gem
gem 'devise-jwt'

# Option 2: Simple token auth
class User < ApplicationRecord
  has_secure_token :api_token
end

class ApiController < ActionController::API
  before_action :authenticate_api_user

  private

  def authenticate_api_user
    token = request.headers["Authorization"]&.split(" ")&.last
    @current_user = User.find_by(api_token: token)
    render json: { error: "Unauthorized" }, status: :unauthorized unless @current_user
  end
end
```

**Rule of thumb:** Devise for standard web apps (battle-tested, covers 90% of auth needs). Add modules incrementally (start with database_authenticatable + registerable). Use OmniAuth for social logins. For APIs, use JWT (devise-jwt) or simple token auth. Never roll your own auth unless Devise genuinely doesn't fit.
