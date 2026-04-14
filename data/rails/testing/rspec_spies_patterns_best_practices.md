### RSpec Spies, Patterns & Best Practices

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

**Rule of thumb:** Prefer `allow` + `have_received` (spy pattern) over `expect().to receive()` to keep assertions at the end of your test. Mock boundaries you do not own (external APIs, mailers), but do not mock the internals of the class you are testing. If you need `allow_any_instance_of`, your design probably needs dependency injection instead.
