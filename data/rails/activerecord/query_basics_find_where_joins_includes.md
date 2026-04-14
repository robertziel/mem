### ActiveRecord Query Basics: find, where, joins, includes

**Basic queries:**
```ruby
User.find(1)                      # raises RecordNotFound if missing
User.find_by(email: "a@b.com")   # returns nil if missing
User.find_by!(email: "a@b.com")  # raises RecordNotFound if missing
User.where(active: true)          # returns Relation (lazy, chainable)
User.where.not(role: "admin")     # NOT condition
User.or(User.where(role: "admin"), User.where(role: "editor"))  # OR
```

**Where conditions:**
```ruby
# Hash (safe, parameterized)
User.where(status: "active", role: "admin")
User.where(created_at: 1.week.ago..)       # range (>= 1 week ago)
User.where(role: ["admin", "editor"])        # IN clause

# String (use ? placeholders, NEVER interpolate)
User.where("age > ? AND city = ?", 18, "NYC")

# NOT
User.where.not(status: "banned")
```

**Joins and includes:**
```ruby
# INNER JOIN (only matching records)
User.joins(:posts).where(posts: { published: true })

# LEFT OUTER JOIN (keep users without posts)
User.left_joins(:posts).where(posts: { id: nil })  # users with no posts

# Multiple joins
Order.joins(:user, :line_items).where(users: { vip: true })

# includes (eager loading, avoids N+1)
User.includes(:posts, :comments)
```

**Rule of thumb:** Use hash conditions for safety (never interpolate user input into SQL strings). Use `joins` for filtering by associated records, `includes` for eager loading to avoid N+1 queries, and `left_joins` when you need to keep records without matching associations.
