### Caching: Low-Level, HTTP & Cache Key Design

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

**Rule of thumb:** Use `Rails.cache.fetch` with TTL for expensive computations and database aggregations. Use HTTP caching (`stale?`/`fresh_when`) for API responses to save bandwidth and server time. Always include a version or timestamp in cache keys to avoid stale data. Prefer key-based invalidation over manual deletion -- it is harder to forget.
