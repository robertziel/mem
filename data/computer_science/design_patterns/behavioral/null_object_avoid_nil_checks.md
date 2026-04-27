### Null Object Pattern (Avoid Nil Checks)

Replace `nil` with an object that provides default behavior.

```ruby
class RealUser
  attr_reader :name, :email
  def initialize(name:, email:) = @name = name; @email = email
  def greet = "Hello, #{name}!"
  def admin? = false
end

class GuestUser  # Null Object
  def name = "Guest"
  def email = nil
  def greet = "Hello, Guest!"
  def admin? = false
end

# Instead of nil checks everywhere:
# BAD
def welcome(user)
  if user
    "Hello, #{user.name}!"
  else
    "Hello, Guest!"
  end
end

# GOOD: return GuestUser instead of nil
def find_user(id)
  User.find_by(id: id) || GuestUser.new
end

# No nil checks needed — GuestUser responds to same methods
user = find_user(999)  # returns GuestUser
user.greet             # "Hello, Guest!" (no NoMethodError)
```

**Rule of thumb:** Null Object to eliminate `if user.nil?` checks throughout the code. The null object responds to the same interface with safe defaults. In Ruby, `&.` (safe navigation) and `try` are alternatives for simple cases, but Null Object is better when behavior differs (not just nil return).
