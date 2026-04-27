### Rails Authentication: Devise Setup & Modules

```ruby
# Gemfile
gem 'devise'

# Install
rails generate devise:install
rails generate devise User
rails db:migrate
```

**Modules:**
| Module | Purpose |
|--------|---------|
| `database_authenticatable` | Hash password, authenticate via POST |
| `registerable` | Register, edit, delete account |
| `recoverable` | Reset password via email |
| `rememberable` | "Remember me" cookie |
| `validatable` | Email/password validations |
| `confirmable` | Email confirmation on signup |
| `lockable` | Lock account after N failed attempts |
| `trackable` | Track sign-in count, timestamps, IPs |
| `timeoutable` | Expire session after inactivity |

```ruby
class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :confirmable, :lockable, :trackable
end
```

**Controller helpers:**
```ruby
before_action :authenticate_user!  # require login
current_user                        # logged-in user
user_signed_in?                     # boolean
sign_in(user)                       # programmatic login
sign_out(user)                      # programmatic logout
```

**Rule of thumb:** Devise for standard web apps. Add modules incrementally. Start with `database_authenticatable` + `registerable`. Never roll your own auth.
