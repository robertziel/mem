### RSpec Mocking: allow, expect & Verifying Doubles

**allow vs expect (stubs vs mocks):**
```ruby
# allow = stub (set up a return value, don't verify it was called)
allow(user).to receive(:name).and_return("Alice")
user.name  # "Alice"
# Test passes even if user.name is never called

# expect = mock (set up AND verify it was called)
expect(user).to receive(:name).and_return("Alice")
user.name  # "Alice"
# Test FAILS if user.name is never called

# Rule: Use allow for setup, expect for assertions
```

**receive matchers:**
```ruby
# Basic stubbing
allow(service).to receive(:call).and_return(true)
allow(service).to receive(:call).and_return(1, 2, 3)  # sequential returns
allow(service).to receive(:call).and_raise(StandardError, "boom")
allow(service).to receive(:call).and_throw(:halt)
allow(service).to receive(:call).and_yield("block_arg")

# With arguments
allow(service).to receive(:find).with(1).and_return(user)
allow(service).to receive(:find).with(anything).and_return(user)
allow(service).to receive(:find).with(a_kind_of(Integer)).and_return(user)
allow(service).to receive(:search).with(hash_including(name: "Alice"))

# Call original implementation
allow(service).to receive(:call).and_call_original

# With block (full control)
allow(service).to receive(:call) do |arg|
  arg > 0 ? "positive" : "negative"
end
```

**instance_double (verifying doubles):**
```ruby
# instance_double checks that stubbed methods actually exist on the class
user = instance_double(User)
allow(user).to receive(:name).and_return("Alice")     # OK, User#name exists
allow(user).to receive(:nonexistent).and_return("x")   # ERROR: User has no #nonexistent

# Also verifies argument count
allow(user).to receive(:update).with("too", "many", "args")
# ERROR: wrong number of arguments

# Why this matters:
# Without verifying doubles, you can stub methods that don't exist.
# Your tests pass, but the real code is broken.
# Verifying doubles catch interface mismatches at test time.

# instance_double with null object pattern
user = instance_double(User).as_null_object
user.name     # nil (no error, even without allow)
user.anything # nil (responds to everything, returns nil)
```

**class_double and object_double:**
```ruby
# class_double verifies class methods
mailer = class_double(UserMailer)
allow(mailer).to receive(:welcome).and_return(double(deliver_later: true))
mailer.welcome(user)  # verified against UserMailer.welcome

# object_double verifies against a specific instance
original = User.new(name: "Alice")
fake = object_double(original, name: "Bob")
fake.name  # "Bob"
```

**Partial doubles (stubbing real objects):**
```ruby
user = User.new(name: "Alice")

# Stub one method, keep the rest real
allow(user).to receive(:expensive_calculation).and_return(42)
user.name                  # "Alice" (real method)
user.expensive_calculation # 42 (stubbed)

# Stub on a class
allow(User).to receive(:find).and_return(user)
User.find(1)  # returns the stubbed user
```

**Rule of thumb:** Use `instance_double` over plain `double` to catch interface mismatches. Use `class_double` for verifying class method stubs. Use `allow` for setting up return values and `expect(...).to receive` only when verifying a method is called is the core assertion. Prefer verifying doubles everywhere -- they catch renamed or removed methods at test time.
