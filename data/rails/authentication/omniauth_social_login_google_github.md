### Rails Authentication: OmniAuth (Social Login)

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
class User < ApplicationRecord
  devise :omniauthable, omniauth_providers: [:google_oauth2, :github]

  def self.from_omniauth(auth)
    where(provider: auth.provider, uid: auth.uid).first_or_create do |user|
      user.email = auth.info.email
      user.name = auth.info.name
      user.password = Devise.friendly_token[0, 20]
    end
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

**Rule of thumb:** OmniAuth for "Login with Google/GitHub/Facebook". Works with Devise via `omniauthable` module. Store `provider` + `uid` to identify the user. Always use `omniauth-rails_csrf_protection` gem.
