### Rails Concerns (ActiveSupport::Concern)

**What concerns do:**
- Extract shared model/controller logic into reusable modules
- Cleaner than plain modules (handles `included` block and `class_methods` automatically)
- Replace duplicated code across multiple models or controllers

**Model concern:**
```ruby
# app/models/concerns/soft_deletable.rb
module SoftDeletable
  extend ActiveSupport::Concern

  included do
    scope :active, -> { where(deleted_at: nil) }
    scope :deleted, -> { where.not(deleted_at: nil) }

    default_scope { active }  # optional: hide deleted by default
  end

  def soft_delete
    update(deleted_at: Time.current)
  end

  def restore
    update(deleted_at: nil)
  end

  def deleted?
    deleted_at.present?
  end

  class_methods do
    def soft_delete_all
      update_all(deleted_at: Time.current)
    end
  end
end

# Usage in models
class Post < ApplicationRecord
  include SoftDeletable
end

class Comment < ApplicationRecord
  include SoftDeletable
end

post.soft_delete         # instance method
post.deleted?            # instance method
Post.active              # scope (class-level)
Post.soft_delete_all     # class method
```

**Controller concern:**
```ruby
# app/controllers/concerns/paginatable.rb
module Paginatable
  extend ActiveSupport::Concern

  private

  def page
    (params[:page] || 1).to_i
  end

  def per_page
    [(params[:per_page] || 25).to_i, 100].min  # cap at 100
  end

  def paginate(scope)
    scope.limit(per_page).offset((page - 1) * per_page)
  end

  def pagination_meta(scope)
    {
      page: page,
      per_page: per_page,
      total: scope.count
    }
  end
end

class PostsController < ApplicationController
  include Paginatable

  def index
    posts = paginate(Post.published)
    render json: { data: posts, meta: pagination_meta(Post.published) }
  end
end
```

**How ActiveSupport::Concern works:**
```ruby
module MyConcern
  extend ActiveSupport::Concern

  # Runs in the context of the including class
  included do
    # scopes, callbacks, validations, associations go here
    has_many :things
    validates :name, presence: true
    before_save :do_something
  end

  # Instance methods defined here
  def instance_method
    # ...
  end

  # Class methods defined here
  class_methods do
    def class_method
      # ...
    end
  end
end
```

**Concern vs plain module:**
| Feature | ActiveSupport::Concern | Plain Module |
|---------|----------------------|--------------|
| `included` block | ✅ Clean DSL | ❌ Need `self.included(base)` |
| `class_methods` | ✅ Clean DSL | ❌ Need `extend ClassMethods` |
| Dependency resolution | ✅ Auto-resolved | ❌ Manual ordering |
| Rails conventions | ✅ Standard pattern | ❌ Unfamiliar to team |

**When to use concerns:**
- Same logic needed in 3+ models (soft delete, searchable, auditable)
- Same controller logic in 3+ controllers (pagination, authentication, sorting)
- Extracting a cohesive set of related methods + scopes + callbacks

**When NOT to use concerns:**
- Dumping unrelated methods into one concern ("God concern")
- Using a concern for a single model (just keep it in the model)
- Business logic that belongs in a service object, not a model

**Rule of thumb:** Concerns are for shared, cohesive behavior (soft-delete, taggable, searchable). If your concern is used by only one model, inline it. If it contains business workflow logic, use a service object instead. Keep concerns focused on one responsibility.
