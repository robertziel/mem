### Caching: Fragment & Russian Doll Strategies

**Cache stores overview:**
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

**Collection caching:**
```erb
<%# Caches each item individually, fetches all from cache in one call %>
<%= render partial: "posts/post", collection: @posts, cached: true %>
```

**Rule of thumb:** Use fragment caching with Russian doll nesting for views -- it gives you granular invalidation where only the changed fragment re-renders. Use `touch: true` on belongs_to associations so parent caches bust when children change. Use collection caching for lists of partials. Redis as cache store in production for shared caching across processes.
