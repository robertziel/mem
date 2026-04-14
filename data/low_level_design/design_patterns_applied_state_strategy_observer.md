### LLD: Design Patterns Applied (State, Strategy, Observer)

**When interviewers expect specific patterns:**

**State Pattern — use for objects with lifecycle:**
- Elevator: Idle → Moving → DoorOpen → Idle
- Booking: Pending → Confirmed → Cancelled/Expired
- Order: Created → Paid → Shipped → Delivered → Returned
- Vending Machine: Idle → HasMoney → Dispensing

```ruby
class Order
  def initialize
    @state = CreatedState.new(self)
  end

  def pay(payment)    = @state.pay(payment)
  def ship(tracking)  = @state.ship(tracking)
  def deliver         = @state.deliver
  def transition_to(state) = @state = state
end

class CreatedState
  def initialize(order) = @order = order
  def pay(payment)
    # process payment
    @order.transition_to(PaidState.new(@order))
  end
  def ship(_) = raise "Can't ship unpaid order"
end

class PaidState
  def pay(_) = raise "Already paid"
  def ship(tracking)
    # assign tracking
    @order.transition_to(ShippedState.new(@order))
  end
end
```

**Strategy Pattern — use for interchangeable algorithms:**
- Pricing: WeekdayPricing, WeekendPricing, HolidayPricing
- Sorting: by price, by distance, by rating
- Notifications: EmailNotifier, SMSNotifier, PushNotifier
- Payment: CreditCard, PayPal, BankTransfer

```ruby
class FeeCalculator
  def initialize(strategy)
    @strategy = strategy
  end

  def calculate(booking)
    @strategy.calculate(booking)
  end
end

class HourlyFee
  def calculate(booking)
    hours = ((booking.end_time - booking.start_time) / 3600.0).ceil
    hours * booking.rate_per_hour
  end
end

class FlatFee
  def calculate(booking) = booking.flat_rate
end

# Usage
calculator = FeeCalculator.new(HourlyFee.new)
calculator.calculate(booking)
```

**Observer Pattern — use for event notifications:**
- Booking confirmed → send email, update inventory, notify analytics
- Payment received → update ledger, send receipt, trigger shipping
- Seat booked → update availability display, notify waitlist

```ruby
class EventBus
  def initialize
    @subscribers = Hash.new { |h, k| h[k] = [] }
  end

  def subscribe(event, listener)
    @subscribers[event] << listener
  end

  def publish(event, data)
    @subscribers[event].each { |listener| listener.call(data) }
  end
end

# Usage
bus = EventBus.new
bus.subscribe(:booking_confirmed, ->(b) { EmailService.send_confirmation(b) })
bus.subscribe(:booking_confirmed, ->(b) { AnalyticsService.track(b) })
bus.subscribe(:booking_confirmed, ->(b) { InventoryService.update(b) })

bus.publish(:booking_confirmed, booking)
```

**Pattern selection cheat sheet:**
| Problem | Pattern | Signal |
|---------|---------|--------|
| Object changes behavior based on internal state | State | "It has a lifecycle" |
| Need to swap algorithm at runtime | Strategy | "Different ways to do X" |
| Multiple things react to one event | Observer | "When X happens, notify Y and Z" |
| Create objects without specifying exact class | Factory | "Different types of X" |
| Add behavior without modifying class | Decorator | "Wrap with additional behavior" |
| One request, chain of handlers | Chain of Responsibility | "Middleware, filters" |
| Encapsulate request as object | Command | "Undo, queue, log operations" |

**Rule of thumb:** Don't force patterns. Identify the problem first (lifecycle? interchangeable behavior? notifications?), then the right pattern becomes obvious. In LLD interviews, State + Strategy + Observer cover 80% of scenarios.
