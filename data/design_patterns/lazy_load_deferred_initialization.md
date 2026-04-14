### Lazy Load Pattern (Deferred Initialization)

Delay loading data until it's actually needed.

```ruby
# Ruby memoization (simplest lazy load)
class User
  def orders
    @orders ||= Order.where(user_id: id).to_a
  end
end

# ActiveRecord lazy loading (built-in)
user.posts  # SQL query only when accessed, not when user loaded
```

**Lazy load variants:**
| Variant | How | Example |
|---------|-----|---------|
| Lazy initialization | Load on first access | `@orders ||= load_orders` |
| Virtual proxy | Proxy object delays loading | `LazyUser.new(id)` |
| Value holder | Wrapper that loads on unwrap | Enumerator, Promise |
| Ghost | Partial load, full load on access | Load ID + name, details later |

**ActiveRecord's lazy loading:**
```ruby
user = User.find(1)    # loads user only
user.posts             # NOW loads posts (lazy)
user.posts.count       # uses cached result

# N+1 problem: lazy loading in a loop
User.all.each { |u| u.posts }  # 1 query per user!

# Fix: eager loading
User.includes(:posts).all.each { |u| u.posts }  # 2 queries total
```

**Rule of thumb:** Lazy loading saves memory and startup time by deferring work. But watch for N+1 queries in ORMs — use `includes`/`preload` to eager-load associations when you know you'll need them.
