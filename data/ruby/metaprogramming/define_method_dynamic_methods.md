### Ruby: define_method (Dynamic Method Generation)

```ruby
class User
  ROLES = %w[admin editor viewer]

  ROLES.each do |role|
    define_method("#{role}?") do
      self.role == role
    end
  end
end

user = User.new(role: "admin")
user.admin?   # true
user.editor?  # false
# Generated: admin?, editor?, viewer?
```

**How Rails uses it:**
- `has_many :posts` → generates `posts`, `posts=`, `post_ids`, etc.
- `validates :name` → registers a validator
- `scope :active` → creates a class method

**Rule of thumb:** `define_method` for generating repetitive methods from data (roles, attributes, configuration). Better than `method_missing` — methods exist and are discoverable.
