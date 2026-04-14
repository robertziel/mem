### `include` vs. `extend` (short)

- **`include`** adds a module’s methods as **instance methods**.
- **`extend`** adds a module’s methods as **class methods**.

```ruby
module Greeter
  def hello
    "hi"
  end
end

class User
  include Greeter
end

class Admin
  extend Greeter
end

User.new.hello   # "hi"
Admin.hello      # "hi"
```

**Rule of thumb:**
- Use `include` for shared behavior on objects.
- Use `extend` for utility methods on the class itself.
