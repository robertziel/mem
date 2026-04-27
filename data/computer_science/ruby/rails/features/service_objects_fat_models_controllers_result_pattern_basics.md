### Rails Service Objects Basics (Fat Models/Controllers Problem & Result Pattern)

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

**Rule of thumb:** Extract to a service when logic spans multiple models or involves external APIs. Use plain Ruby classes -- gems are optional. Return result objects (not exceptions) for expected failures. Keep services focused: one `call` method, explicit inputs, clear output.
