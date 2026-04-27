### Ruby: class_eval, instance_eval & send

**class_eval (open a class dynamically):**
```ruby
String.class_eval do
  def shout
    upcase + "!!!"
  end
end
"hello".shout  # "HELLO!!!"
```

**instance_eval (execute in object context):**
```ruby
obj = Object.new
obj.instance_eval do
  @secret = 42
  def reveal; @secret; end
end
obj.reveal  # 42
```

**send / public_send:**
```ruby
user.send(:name)           # call any method (even private!)
user.public_send(:name)    # only public methods (safer)

# Dynamic dispatch
attribute = "email"
user.send(attribute)       # equivalent to user.email
```

**Rule of thumb:** `class_eval` for DSL creation and dynamically adding methods to classes. `public_send` over `send` (respects visibility). Use sparingly — metaprogramming makes code harder to debug.
