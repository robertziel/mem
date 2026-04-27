### Polymorphic associations (short)

A single model can belong to multiple other models.

```ruby
class Comment < ApplicationRecord
  belongs_to :commentable, polymorphic: true
end

class Post < ApplicationRecord
  has_many :comments, as: :commentable
end
```

**Pros:** flexible relationships.
**Cons:** harder to enforce DB-level constraints.

**Rule of thumb:** use when a child really belongs to multiple unrelated parents.
