### Interactor Gem: Single Interactors, Organizers & Rollback

**1. Interactor gem (formalized pattern):**
```ruby
# Gemfile
gem 'interactor'

# Single interactor
class AuthenticateUser
  include Interactor

  def call
    user = User.find_by(email: context.email)

    if user&.authenticate(context.password)
      context.user = user
      context.token = JwtService.encode(user_id: user.id)
    else
      context.fail!(error: "Invalid email or password")
    end
  end
end

# Usage
result = AuthenticateUser.call(email: "jan@x.com", password: "secret")
result.success?  # => true
result.user      # => #<User>
result.token     # => "eyJ..."

result = AuthenticateUser.call(email: "jan@x.com", password: "wrong")
result.failure?  # => true
result.error     # => "Invalid email or password"
```

**2. Interactor organizer (chain of steps):**
```ruby
# Compose multiple interactors into a pipeline
class PlaceOrder
  include Interactor::Organizer

  organize ValidateCart, CreateOrder, ChargePayment, SendConfirmation, UpdateInventory
end

class ValidateCart
  include Interactor

  def call
    context.fail!(error: "Cart is empty") if context.cart.items.empty?
    context.fail!(error: "Items out of stock") unless context.cart.all_in_stock?
  end
end

class ChargePayment
  include Interactor

  def call
    result = PaymentGateway.charge(
      amount: context.order.total,
      token: context.payment_token
    )
    context.charge_id = result.id
  rescue PaymentGateway::Error => e
    context.fail!(error: "Payment failed: #{e.message}")
  end

  # Rollback if a later step fails
  def rollback
    PaymentGateway.refund(context.charge_id) if context.charge_id
  end
end

# Usage — if any step fails, previous steps roll back
result = PlaceOrder.call(cart: cart, payment_token: "tok_123")

# If ChargePayment succeeds but SendConfirmation fails:
# → SendConfirmation.rollback (if defined)
# → ChargePayment.rollback (refunds the charge)
# → CreateOrder.rollback (if defined)
```

**Rule of thumb:** Use interactor organizers for multi-step pipelines that need rollback. Each interactor should do one thing. Define `rollback` for any step with side effects (payments, external API calls). If any step fails, all previous steps roll back in reverse order.
