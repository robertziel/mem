### Rails RESTful & Nested Resources

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

**Rule of thumb:** Use `resources` for RESTful routes. Keep nesting to one level (use `shallow: true`). Member routes for actions on a specific resource, collection for the group.
