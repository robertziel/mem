### ActiveSupport: try vs Safe Navigation (&.)

```ruby
# try — calls method if receiver is not nil, returns nil otherwise
user = nil
user.try(:name)          # nil (no NoMethodError)

user = User.new(name: "Alice")
user.try(:name)          # "Alice"

# try! — raises NoMethodError if method doesn't EXIST (not for nil)
user.try!(:nonexistent)  # NoMethodError
user.try(:nonexistent)   # nil (silently ignores)

# Safe navigation (&.) — preferred for simple nil-safe chaining
user&.name          # same as user.try(:name)
user&.name&.upcase  # chain multiple

# try is still useful for dynamic method names:
attribute = "email"
user.try(attribute)  # calls user.email dynamically
```

**Rule of thumb:** Prefer `&.` (safe navigation) over `try` for simple nil-safe chaining. Use `try` only for dynamic method names. `try!` if you want to catch typos (raises on non-existent methods).
