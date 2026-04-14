### Service Object Pattern (Rails)

**What a Service Object is:**
- Plain Ruby class that encapsulates one business operation
- Single responsibility: one public method (`call`)
- Keeps controllers thin and models focused on persistence

```ruby
class CreateOrder
  def initialize(user:, cart:, payment_method:)
    @user = user
    @cart = cart
    @payment_method = payment_method
  end

  def call
    ActiveRecord::Base.transaction do
      order = Order.create!(user: @user, total: @cart.total)
      order.line_items.create!(@cart.items.map(&:attributes))
      PaymentService.charge(@payment_method, order.total)
      InventoryService.reserve(order.line_items)
      OrderMailer.confirmation(order).deliver_later
      order
    end
  end
end

# Controller
def create
  order = CreateOrder.new(user: current_user, cart: @cart, payment_method: params[:payment_method]).call
  render json: order, status: :created
end
```

**Rule of thumb:** One service object per business operation (CreateOrder, CancelSubscription, ProcessRefund). Single `call` method. Use for multi-step workflows that span multiple models. Keep controllers as thin as possible.
