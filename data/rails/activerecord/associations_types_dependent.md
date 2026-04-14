### ActiveRecord Association Types and Dependent Options

**Association types:**
```ruby
class User < ApplicationRecord
  has_many :posts                          # one-to-many
  has_many :comments, through: :posts      # has_many :through (indirect)
  has_one :profile                         # one-to-one
  has_and_belongs_to_many :roles           # many-to-many (join table, no model)
end

class Post < ApplicationRecord
  belongs_to :user                         # foreign key on this table
  has_many :comments, dependent: :destroy  # cascade delete
  has_many :taggings
  has_many :tags, through: :taggings       # many-to-many through join model
end
```

**has_many :through vs HABTM:**
| Feature | has_many :through | has_and_belongs_to_many |
|---------|------------------|------------------------|
| Join model | Yes (full model) | No (just a join table) |
| Extra attributes on join | Yes | No |
| Validations on join | Yes | No |
| Callbacks on join | Yes | No |
| Use when | Almost always | Simple many-to-many with no join data |

**dependent options:**
```ruby
has_many :comments, dependent: :destroy     # delete children and run their callbacks
has_many :comments, dependent: :delete_all  # SQL DELETE, no callbacks (faster)
has_many :comments, dependent: :nullify     # set foreign key to NULL
has_many :comments, dependent: :restrict_with_error  # prevent deletion if children exist
```

**Rule of thumb:** Use `has_many :through` over HABTM. Set `dependent:` on every `has_many` to be explicit about what happens to children on deletion.
