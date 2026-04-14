### Rails Routing

**RESTful resources:**
```ruby
# config/routes.rb
resources :posts          # generates all 7 RESTful routes
resources :posts, only: [:index, :show, :create]
resources :posts, except: [:destroy]
```

| HTTP | Path | Controller#Action | Helper |
|------|------|------------------|--------|
| GET | /posts | posts#index | posts_path |
| GET | /posts/new | posts#new | new_post_path |
| POST | /posts | posts#create | posts_path |
| GET | /posts/:id | posts#show | post_path(id) |
| GET | /posts/:id/edit | posts#edit | edit_post_path(id) |
| PATCH/PUT | /posts/:id | posts#update | post_path(id) |
| DELETE | /posts/:id | posts#destroy | post_path(id) |

**Nested resources:**
```ruby
resources :posts do
  resources :comments, only: [:index, :create, :destroy]
end
# /posts/:post_id/comments     -> comments#index
# /posts/:post_id/comments     -> comments#create (POST)
# /posts/:post_id/comments/:id -> comments#destroy (DELETE)

# Shallow nesting (avoid deep URLs)
resources :posts, shallow: true do
  resources :comments
end
# /posts/:post_id/comments     -> comments#index, create
# /comments/:id                -> comments#show, update, destroy (no post_id needed)
```

**Member and collection routes:**
```ruby
resources :posts do
  member do
    post :publish      # POST /posts/:id/publish
    get :preview       # GET /posts/:id/preview
  end
  collection do
    get :search        # GET /posts/search
    get :drafts        # GET /posts/drafts
  end
end
```

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

**Rule of thumb:** Use `resources` for RESTful routes. Keep nesting to one level (use `shallow: true`). `namespace` for both URL + module, `scope` for URL only. Member routes for actions on a specific resource, collection for the group. Always check `rails routes` after changes.
