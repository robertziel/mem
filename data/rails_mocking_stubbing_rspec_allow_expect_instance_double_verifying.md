### RSpec Mocking and Stubbing

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

**have_received (spy pattern -- assert after the fact):**
```ruby
# Spy style: allow first, assert later
# Preferred for "arrange, act, assert" pattern

# Arrange
allow(NotificationService).to receive(:notify)

# Act
order.complete!

# Assert
expect(NotificationService).to have_received(:notify).with(order)
expect(NotificationService).to have_received(:notify).once
expect(NotificationService).to have_received(:notify).twice
expect(NotificationService).to have_received(:notify).exactly(3).times
expect(NotificationService).to have_received(:notify).at_least(:once)

# This is equivalent to expect().to receive() but reads better
# because assertions are at the end, not the beginning
```

**Message expectations (cardinality):**
```ruby
expect(logger).to receive(:info).once
expect(logger).to receive(:info).twice
expect(logger).to receive(:info).exactly(3).times
expect(logger).to receive(:info).at_least(:once)
expect(logger).to receive(:info).at_most(5).times
expect(logger).to receive(:info).at_least(2).times

# Order expectations
expect(service).to receive(:validate).ordered
expect(service).to receive(:save).ordered
# Fails if save is called before validate
```

**allow_any_instance_of (use sparingly):**
```ruby
# Stubs ANY instance of a class -- generally a code smell
allow_any_instance_of(User).to receive(:admin?).and_return(true)

# Prefer dependency injection instead:
# Bad: allow_any_instance_of(HTTPClient).to receive(:get)
# Good: inject the client, stub the injected instance
service = PaymentService.new(client: instance_double(HTTPClient))
allow(service.client).to receive(:get).and_return(response)
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

**Practical mocking patterns:**
```ruby
# External API call
describe PaymentService do
  let(:gateway) { instance_double(Stripe::Client) }
  let(:service) { PaymentService.new(gateway: gateway) }

  it "charges the customer" do
    charge = double(id: "ch_123", status: "succeeded")
    allow(gateway).to receive(:charge).and_return(charge)

    result = service.process(amount: 1000, token: "tok_visa")

    expect(result).to be_success
    expect(gateway).to have_received(:charge).with(
      amount: 1000,
      source: "tok_visa"
    )
  end
end

# Time-dependent code
it "expires after 24 hours" do
  token = AuthToken.create(user: user)
  allow(Time).to receive(:current).and_return(25.hours.from_now)
  expect(token).to be_expired
end

# Mailer verification
it "sends a welcome email" do
  mailer = instance_double(ActionMailer::MessageDelivery, deliver_later: true)
  allow(UserMailer).to receive(:welcome).and_return(mailer)

  UserRegistration.new(user).call

  expect(UserMailer).to have_received(:welcome).with(user)
  expect(mailer).to have_received(:deliver_later)
end
```

**When to mock vs integrate:**
| Scenario | Mock | Integrate |
|----------|------|-----------|
| External APIs (Stripe, Twilio) | Yes | No (use VCR/WebMock) |
| Database queries | Rarely | Yes (use factories) |
| Mailer delivery | Yes (verify sent) | Sometimes (test content) |
| Internal service objects | Depends | Prefer integration |
| Time-dependent logic | Yes (freeze time) | No |
| File system operations | Yes | Sometimes |
| Simple value objects | No | Yes |

**Common mistakes:**
```ruby
# Mistake: Mocking the object under test
allow(user).to receive(:valid?).and_return(true)
user.save!  # What are you even testing?

# Mistake: Over-mocking (testing implementation, not behavior)
expect(service).to receive(:step1).ordered
expect(service).to receive(:step2).ordered
expect(service).to receive(:step3).ordered
# This tests HOW, not WHAT. Refactoring breaks it.

# Mistake: Forgetting to verify doubles
user = double(name: "Alice")  # basic double, no verification
user = instance_double(User, name: "Alice")  # verifying double, safer
```

**Rule of thumb:** Use `instance_double` over plain `double` to catch interface mismatches. Prefer `allow` + `have_received` (spy pattern) over `expect().to receive()` to keep assertions at the end of your test. Mock boundaries you do not own (external APIs, mailers), but do not mock the internals of the class you are testing. If you need `allow_any_instance_of`, your design probably needs dependency injection instead.
