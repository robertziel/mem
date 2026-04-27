### ActiveRecord Associations: inverse_of, Counter Cache, Polymorphic, and Eager Loading

**inverse_of (avoid extra queries):**
```ruby
class User < ApplicationRecord
  has_many :posts, inverse_of: :user
end

class Post < ApplicationRecord
  belongs_to :user, inverse_of: :posts
end

user = User.first
post = user.posts.first
post.user.object_id == user.object_id  # true! Same object in memory
# Without inverse_of: post.user triggers a new DB query
```
Rails auto-detects `inverse_of` in most cases, but declare explicitly for `:through`, `:foreign_key`, or `:conditions`.

**counter_cache (avoid COUNT queries):**
```ruby
# Migration: add comments_count to posts
add_column :posts, :comments_count, :integer, default: 0, null: false

class Comment < ApplicationRecord
  belongs_to :post, counter_cache: true
end

# Now post.comments_count is maintained automatically (no COUNT query)
post.comments.size  # reads comments_count column, not COUNT(*)
```

**Self-referential association:**
```ruby
class Employee < ApplicationRecord
  belongs_to :manager, class_name: "Employee", optional: true
  has_many :direct_reports, class_name: "Employee", foreign_key: :manager_id
end
```

**Polymorphic association:**
```ruby
class Comment < ApplicationRecord
  belongs_to :commentable, polymorphic: true  # commentable_type + commentable_id
end

class Post < ApplicationRecord
  has_many :comments, as: :commentable
end

class Photo < ApplicationRecord
  has_many :comments, as: :commentable
end
```

**Eager loading (avoid N+1):**
```ruby
# includes: preloads associations (2 queries or LEFT JOIN)
User.includes(:posts).where(active: true)

# preload: always 2 separate queries
User.preload(:posts)

# eager_load: always LEFT OUTER JOIN (1 query)
User.eager_load(:posts).where(posts: { published: true })

# includes with conditions triggers eager_load automatically
User.includes(:posts).where(posts: { published: true }).references(:posts)
```

**Rule of thumb:** Use `counter_cache` for frequently counted associations. Use `includes` for eager loading to avoid N+1 queries. Declare `inverse_of` when Rails can't auto-detect it (`:through`, `:foreign_key`, or `:conditions`).
