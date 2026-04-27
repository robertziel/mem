### N+1 queries & eager loading (short)

**N+1** happens when you query a list, then load each association one by one.

```ruby
posts = Post.all
posts.each { |p| p.comments.count } # N+1
```

**Fix with eager loading:**
- `includes` — auto uses `LEFT OUTER JOIN` or separate queries.
- `preload` — always separate queries.
- `eager_load` — always `LEFT OUTER JOIN`.

```ruby
Post.includes(:comments)
Post.preload(:comments)
Post.eager_load(:comments)
```

**Rule of thumb:** start with `includes` and measure.
