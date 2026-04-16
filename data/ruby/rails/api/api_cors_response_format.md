### CORS and Response Format

**CORS (Cross-Origin Resource Sharing):**
```ruby
# Gemfile
gem 'rack-cors'

# config/initializers/cors.rb
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins 'https://frontend.example.com', 'http://localhost:3000'
    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options],
      credentials: true,
      max_age: 86400
  end
end
```

**Response envelope pattern:**
```ruby
# Consistent response format
def render_success(data, status: :ok, meta: {})
  render json: { data: data, meta: meta }, status: status
end

def render_error(message, status: :unprocessable_entity, errors: [])
  render json: { error: message, errors: errors }, status: status
end

# Usage
render_success(UserBlueprint.render(@users), meta: { total: @users.count })
render_error("Validation failed", errors: user.errors.full_messages, status: :unprocessable_entity)
```

**Rule of thumb:** Configure CORS early with explicit origin allowlists -- never use `'*'` with `credentials: true` in production. Use a consistent response envelope (`{ data:, meta: }` for success, `{ error:, errors: }` for failure) so clients can rely on a predictable shape across all endpoints.
