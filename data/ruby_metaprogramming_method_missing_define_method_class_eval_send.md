### Ruby Metaprogramming

**method_missing (dynamic dispatch):**
```ruby
class DynamicFinder
  def method_missing(name, *args, &block)
    if name.to_s.start_with?("find_by_")
      attribute = name.to_s.sub("find_by_", "")
      puts "Finding by #{attribute}: #{args.first}"
    else
      super  # ALWAYS call super for unknown methods
    end
  end

  # ALWAYS define respond_to_missing? alongside method_missing
  def respond_to_missing?(name, include_private = false)
    name.to_s.start_with?("find_by_") || super
  end
end

finder = DynamicFinder.new
finder.find_by_email("a@b.com")      # "Finding by email: a@b.com"
finder.respond_to?(:find_by_email)   # true (because of respond_to_missing?)
```

**define_method (create methods dynamically):**
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

**class_eval / module_eval (open a class context):**
```ruby
# Add methods to a class from outside
String.class_eval do
  def shout
    upcase + "!!!"
  end
end
"hello".shout  # "HELLO!!!"

# With string (useful for dynamic code, but harder to debug)
MyClass.class_eval <<-RUBY, __FILE__, __LINE__ + 1
  def dynamic_method
    "I was defined dynamically"
  end
RUBY
```

**instance_eval (execute in object context):**
```ruby
obj = Object.new
obj.instance_eval do
  @secret = 42                    # sets instance variable
  def reveal; @secret; end        # defines singleton method
end
obj.reveal  # 42
```

**send / public_send:**
```ruby
user = User.new
user.send(:name)                   # call any method (even private!)
user.public_send(:name)            # call only public methods (safer)

# Dynamic method dispatch
attribute = "email"
user.send(attribute)               # equivalent to user.email
user.send("#{attribute}=", value)  # equivalent to user.email = value
```

**How Rails uses metaprogramming:**
- `has_many :posts` — generates `posts`, `posts=`, `post_ids`, `build_post`, etc.
- `validates :name, presence: true` — registers a validator via `class_eval`
- `scope :active, -> { ... }` — uses `define_method` to create a class method
- `attr_accessor :name` — uses `define_method` for getter + setter
- `delegate :name, to: :user` — generates a forwarding method

**When to use metaprogramming:**
| Use case | Technique |
|----------|-----------|
| Dynamic method generation from data | `define_method` |
| DSL creation (config blocks) | `instance_eval`, `class_eval` |
| Catching unknown methods | `method_missing` + `respond_to_missing?` |
| Calling methods by name | `send` / `public_send` |
| Adding methods to existing classes | `class_eval` or `prepend` |

**Dangers:**
- Harder to debug (methods don't appear in source)
- `method_missing` is slow (full lookup chain before fallback)
- `send` bypasses encapsulation (prefer `public_send`)
- Over-use makes code unreadable ("too clever")

**Rule of thumb:** Use `define_method` for generating repetitive methods from data. Always pair `method_missing` with `respond_to_missing?`. Prefer `public_send` over `send`. Use metaprogramming to reduce boilerplate, not to show off. If regular Ruby can solve it, don't metaprogram.
