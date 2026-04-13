### State Pattern (Behavior Changes by Internal State)

Object alters its behavior when its internal state changes — appears to change class.

```ruby
class Order
  def initialize
    @state = PendingState.new(self)
  end

  def pay(payment)    = @state.pay(payment)
  def ship(tracking)  = @state.ship(tracking)
  def cancel          = @state.cancel
  def transition_to(state) = @state = state
end

class PendingState
  def initialize(order) = @order = order
  def pay(payment)
    # process payment...
    @order.transition_to(PaidState.new(@order))
  end
  def ship(_) = raise "Can't ship unpaid order"
  def cancel = @order.transition_to(CancelledState.new(@order))
end

class PaidState
  def initialize(order) = @order = order
  def pay(_) = raise "Already paid"
  def ship(tracking)
    @order.transition_to(ShippedState.new(@order))
  end
  def cancel = raise "Can't cancel paid order"
end
```

**When State fits:** objects with lifecycle (Order, Elevator, Vending Machine, Booking).

**State vs Strategy:** State transitions happen internally. Strategy is selected externally by the client.

**Rule of thumb:** State when an object's behavior depends entirely on its current state AND it transitions between states. Avoids giant if/else blocks checking state. Each state is a class that handles all possible actions for that state.
