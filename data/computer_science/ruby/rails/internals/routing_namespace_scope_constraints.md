### Rails Namespace, Scope & Constraints

**Namespace vs scope:**
```ruby
# namespace: prefixes URL AND controller module
namespace :admin do
  resources :users     # /admin/users -> Admin::UsersController
end

# scope: prefixes URL only, NOT controller module
scope :admin do
  resources :users     # /admin/users -> UsersController (no Admin:: module)
end

# scope with module: prefixes controller module only
scope module: :v2 do
  resources :posts     # /posts -> V2::PostsController
end

# scope with path: custom URL prefix
scope path: :api do
  resources :posts     # /api/posts -> PostsController
end
```

**API versioning with namespace:**
```ruby
namespace :api do
  namespace :v1 do
    resources :users   # /api/v1/users -> Api::V1::UsersController
  end
  namespace :v2 do
    resources :users   # /api/v2/users -> Api::V2::UsersController
  end
end
```

**Constraints:**
```ruby
# Subdomain constraint
constraints subdomain: "api" do
  resources :posts     # api.example.com/posts
end

# Regex constraint on param
resources :posts, constraints: { id: /\d+/ }

# Custom constraint class
class AuthenticatedConstraint
  def matches?(request)
    request.session[:user_id].present?
  end
end
constraints AuthenticatedConstraint.new do
  resources :admin_settings
end
```

**Root and redirects:**
```ruby
root "pages#home"
get "/old-page", to: redirect("/new-page")
get "/docs", to: redirect("https://docs.example.com")
```

**Useful commands:**
```bash
rails routes                           # list all routes
rails routes -g users                  # grep for "users"
rails routes -c UsersController        # routes for specific controller
```

**Rule of thumb:** `namespace` for both URL + module, `scope` for URL only. Use constraints to restrict routes by subdomain, param format, or custom logic. Always check `rails routes` after changes.
