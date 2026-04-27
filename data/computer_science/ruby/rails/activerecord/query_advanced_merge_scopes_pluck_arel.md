### ActiveRecord Advanced Queries: merge, scopes, pluck, Arel

**Merge (combine scopes across models):**
```ruby
class Post < ApplicationRecord
  scope :published, -> { where(published: true) }
  scope :recent, -> { where("created_at > ?", 1.week.ago) }
end

# Merge applies Post's scopes through a join
User.joins(:posts).merge(Post.published.recent)
# SQL: ... INNER JOIN posts ON ... WHERE posts.published = true AND posts.created_at > ...
```

**Selecting and plucking:**
```ruby
# select: returns AR objects with only specified columns
User.select(:id, :name)  # User objects, but only id and name loaded

# pluck: returns raw arrays (no AR objects, faster)
User.pluck(:email)           # ["a@b.com", "c@d.com"]
User.pluck(:id, :email)      # [[1, "a@b.com"], [2, "c@d.com"]]

# pick: pluck for single record
User.where(id: 1).pick(:email)  # "a@b.com"
```

**Grouping and aggregation:**
```ruby
Order.group(:status).count           # {"pending"=>5, "shipped"=>12}
Order.group(:status).sum(:total)     # {"pending"=>500, "shipped"=>1200}
Order.group(:status).average(:total) # {"pending"=>100.0, "shipped"=>100.0}
Order.group(:user_id).having("COUNT(*) > ?", 5).count
```

**Ordering and limiting:**
```ruby
User.order(created_at: :desc)
User.order(:name, created_at: :desc)   # multiple columns
User.limit(10).offset(20)              # pagination (prefer cursor-based)
User.first(5)                          # LIMIT 5 ORDER BY id ASC
User.last(5)                           # LIMIT 5 ORDER BY id DESC
```

**Chaining and scopes:**
```ruby
class Product < ApplicationRecord
  scope :active, -> { where(active: true) }
  scope :cheap, -> { where("price < ?", 1000) }
  scope :in_category, ->(cat) { where(category: cat) }
end

# Scopes are chainable
Product.active.cheap.in_category("electronics").order(:price).limit(20)
```

**Exists and counting (efficient):**
```ruby
User.exists?(email: "a@b.com")   # SELECT 1 ... LIMIT 1 (boolean, fast)
User.where(active: true).count   # SELECT COUNT(*) (single value)
User.where(active: true).any?    # uses EXISTS (faster than count > 0)
User.where(active: true).empty?  # uses EXISTS
```

**Arel (advanced, for complex SQL):**
```ruby
users = User.arel_table
User.where(users[:name].matches("%john%"))  # LIKE '%john%'
User.where(users[:age].gt(18).and(users[:age].lt(65)))
```

**Rule of thumb:** Chain scopes for readable queries. Use `pluck` over `map` for raw values (skips AR instantiation). Use `exists?` over `count > 0`. Use `merge` to apply another model's scopes through joins. Never interpolate user input into SQL strings.
