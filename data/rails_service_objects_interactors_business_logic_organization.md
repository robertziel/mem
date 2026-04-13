### Rails Service Objects / Interactors (Organizing Complex Business Logic)

**Problem:** Fat models and fat controllers. Complex business operations spanning multiple models, external APIs, and side effects don't belong in either.

**1. Basic service object (plain Ruby class):**
```ruby
# app/services/create_order.rb
class CreateOrder
  def initialize(user:, cart:, payment_method:)
    @user = user
    @cart = cart
    @payment_method = payment_method
  end

  def call
    ActiveRecord::Base.transaction do
      order = build_order
      charge_payment(order)
      send_notifications(order)
      order
    end
  rescue PaymentService::PaymentFailed => e
    OpenStruct.new(success: false, error: e.message)
  end

  private

  def build_order
    Order.create!(
      user: @user,
      items: @cart.items.map { |item| build_order_item(item) },
      total: @cart.total
    )
  end

  def charge_payment(order)
    PaymentService.new.charge(
      amount: order.total,
      method: @payment_method,
      idempotency_key: "order:#{order.id}"
    )
  end

  def send_notifications(order)
    OrderConfirmationJob.perform_later(order.id)
    InventoryUpdateJob.perform_later(order.id)
  end
end

# Usage in controller
class OrdersController < ApplicationController
  def create
    result = CreateOrder.new(
      user: current_user,
      cart: current_cart,
      payment_method: params[:payment_method]
    ).call

    if result.is_a?(Order)
      render json: result, status: :created
    else
      render json: { error: result.error }, status: :unprocessable_entity
    end
  end
end
```

**2. Result object pattern (explicit success/failure):**
```ruby
# app/services/service_result.rb
class ServiceResult
  attr_reader :value, :error

  def initialize(success:, value: nil, error: nil)
    @success = success
    @value = value
    @error = error
  end

  def success? = @success
  def failure? = !@success

  def self.success(value = nil) = new(success: true, value: value)
  def self.failure(error) = new(success: false, error: error)
end

# Usage in service
class RegisterUser
  def call(params)
    user = User.new(params)

    unless user.valid?
      return ServiceResult.failure(user.errors.full_messages.join(", "))
    end

    user.save!
    WelcomeEmailJob.perform_later(user.id)
    ServiceResult.success(user)
  rescue ActiveRecord::RecordNotUnique
    ServiceResult.failure("Email already taken")
  end
end

# Controller
result = RegisterUser.new.call(user_params)
if result.success?
  render json: result.value, status: :created
else
  render json: { error: result.error }, status: :unprocessable_entity
end
```

**3. Interactor gem (formalized pattern):**
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

**4. Interactor organizer (chain of steps):**
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

**5. Command pattern (callable objects):**
```ruby
# Base class for services with consistent interface
class ApplicationService
  def self.call(...) = new(...).call
end

class CancelSubscription < ApplicationService
  def initialize(subscription:, reason:)
    @subscription = subscription
    @reason = reason
  end

  def call
    ActiveRecord::Base.transaction do
      @subscription.update!(status: "cancelled", cancelled_at: Time.current, cancel_reason: @reason)
      cancel_with_provider
      schedule_cleanup
    end

    ServiceResult.success(@subscription)
  rescue ExternalPaymentService::ServiceUnavailable => e
    ServiceResult.failure("Payment provider unavailable: #{e.message}")
  end

  private

  def cancel_with_provider
    ExternalPaymentService.new.cancel_subscription(
      provider_id: @subscription.provider_id
    )
  end

  def schedule_cleanup
    SubscriptionCleanupJob.perform_later(@subscription.id)
    ProrationCalculationJob.perform_later(@subscription.id)
  end
end

# Usage — clean one-liner
result = CancelSubscription.call(subscription: sub, reason: "Too expensive")
```

**6. Policy objects (authorization logic):**
```ruby
# Separate authorization from business logic
class OrderPolicy
  def initialize(user, order)
    @user = user
    @order = order
  end

  def can_cancel?
    @order.user == @user && @order.status.in?(%w[pending confirmed]) && @order.created_at > 24.hours.ago
  end

  def can_refund?
    @user.admin? || (@order.user == @user && @order.status == "completed" && @order.completed_at > 30.days.ago)
  end
end

# Usage in service
class CancelOrder < ApplicationService
  def initialize(user:, order:)
    @user = user
    @order = order
  end

  def call
    unless OrderPolicy.new(@user, @order).can_cancel?
      return ServiceResult.failure("Cannot cancel this order")
    end

    @order.update!(status: "cancelled")
    RefundPaymentJob.perform_later(@order.id)
    ServiceResult.success(@order)
  end
end
```

**7. When to use what:**

| Complexity | Pattern | Example |
|-----------|---------|---------|
| Simple CRUD | Controller + model | Update user profile |
| Single operation with side effects | Service object | Register user (create + send email) |
| Multi-step pipeline | Interactor organizer | Place order (validate → charge → fulfill) |
| Authorization check | Policy object | Can user cancel order? |
| Complex query | Query object | Search with filters + sorting |
| Data transformation | Form object | Normalize + validate complex input |

**8. File organization:**
```
app/
  services/
    create_order.rb
    cancel_subscription.rb
    register_user.rb
    payments/
      charge_payment.rb
      refund_payment.rb
    notifications/
      send_order_confirmation.rb
  policies/
    order_policy.rb
    subscription_policy.rb
  queries/
    search_orders.rb
    active_subscriptions.rb
```

**Anti-patterns to avoid:**
```ruby
# ❌ Service that's just a wrapper around a model method
class UpdateUserName
  def call(user, name)
    user.update!(name: name)  # just use user.update! directly
  end
end

# ❌ Service with too many responsibilities
class DoEverything
  def call
    validate_input    # form object
    authorize_user    # policy object
    fetch_data        # query object
    process_data      # actual business logic ← this is the service
    send_emails       # background job
    update_cache      # callback or observer
  end
end

# ❌ Passing too much context around
# Use explicit parameters, not a shared context hash that grows unbounded

# ✅ Keep services focused: one public method, clear inputs, clear output
```

**Rule of thumb:** Extract to a service when logic spans multiple models or involves external APIs. Use plain Ruby classes — gems are optional. Return result objects (not exceptions) for expected failures. Keep services focused: one `call` method, explicit inputs, clear output. Use interactor organizers for multi-step pipelines that need rollback. Don't extract simple CRUD into services — that's just ceremony.
