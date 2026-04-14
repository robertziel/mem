### Rails Caching Strategies

**Cache stores:**
```ruby
# config/environments/production.rb
config.cache_store = :redis_cache_store, { url: ENV["REDIS_URL"], expires_in: 1.hour }
# Other options: :memory_store (dev), :mem_cache_store (Memcached), :file_store
```

**Fragment caching (most common in views):**
```erb
<%# Cache the entire post partial %>
<% cache @post do %>
  <h2><%= @post.title %></h2>
  <p><%= @post.body %></p>
  <span>By <%= @post.user.name %></span>
<% end %>
<%# Cache key auto-generated: posts/123-20240115120000 (id + updated_at) %>
```

**Russian doll caching (nested fragments):**
```erb
<%# Outer cache depends on collection %>
<% cache @post do %>
  <h2><%= @post.title %></h2>
  <%# Inner cache per comment — when a comment changes, only its fragment busts %>
  <% @post.comments.each do |comment| %>
    <% cache comment do %>
      <p><%= comment.body %></p>
    <% end %>
  <% end %>
<% end %>

<%# Touch parent when child changes %>
class Comment < ApplicationRecord
  belongs_to :post, touch: true  # updates post.updated_at when comment changes
end
```

**Low-level caching (Rails.cache):**
```ruby
# Fetch: read from cache, compute on miss
stats = Rails.cache.fetch("dashboard:stats", expires_in: 15.minutes) do
  {
    users: User.count,
    orders: Order.where("created_at > ?", 1.day.ago).count,
    revenue: Order.sum(:total)
  }
end

# Manual write/read/delete
Rails.cache.write("key", value, expires_in: 1.hour)
Rails.cache.read("key")
Rails.cache.delete("key")
Rails.cache.exist?("key")

# Increment (atomic with Redis)
Rails.cache.increment("page_views:#{post.id}")
```

**Collection caching:**
```erb
<%# Caches each item individually, fetches all from cache in one call %>
<%= render partial: "posts/post", collection: @posts, cached: true %>
```

**HTTP caching (conditional GET):**
```ruby
class PostsController < ApplicationController
  def show
    @post = Post.find(params[:id])

    # ETag-based: returns 304 Not Modified if unchanged
    if stale?(@post)
      respond_to do |format|
        format.html
        format.json { render json: @post }
      end
    end
  end

  def index
    @posts = Post.all

    # Time-based expiry
    expires_in 5.minutes, public: true
    # Sets Cache-Control: max-age=300, public
  end
end
```

**Cache key design:**
```ruby
# Simple key
Rails.cache.fetch("user:#{user.id}:profile")

# Version-aware key (bust on data change)
Rails.cache.fetch("user:#{user.id}:profile:#{user.updated_at.to_i}")

# Collection key (bust when any member changes)
Rails.cache.fetch(["posts", @posts.maximum(:updated_at)]) do
  @posts.to_json
end
```

**Cache invalidation strategies:**
| Strategy | How | Tradeoff |
|----------|-----|----------|
| TTL-based | `expires_in: 15.minutes` | Simple, eventually stale |
| Key-based (updated_at) | Include timestamp in key | Auto-invalidates, needs `touch` chain |
| Manual invalidation | `Rails.cache.delete("key")` | Precise, but easy to miss |
| Write-through | Update cache on every write | Always fresh, more writes |

**Rule of thumb:** Use fragment caching with Russian doll nesting for views. Use `Rails.cache.fetch` with TTL for expensive computations. Use HTTP caching (`stale?`) for API responses. Redis as cache store in production. Always include a version/timestamp in cache keys to avoid stale data.
