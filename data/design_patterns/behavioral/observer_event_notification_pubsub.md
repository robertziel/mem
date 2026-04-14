### Observer Pattern (Event Notification)

One-to-many dependency: when one object changes, all dependents are notified.

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

bus = EventBus.new
bus.subscribe(:order_completed, ->(o) { EmailService.send_confirmation(o) })
bus.subscribe(:order_completed, ->(o) { AnalyticsService.track(o) })
bus.subscribe(:order_completed, ->(o) { InventoryService.update(o) })

bus.publish(:order_completed, order)
```

**In Rails:** ActiveSupport::Notifications, callbacks, pub/sub with Redis.

**Rule of thumb:** Observer when multiple things react to one event. Prefer pub/sub at scale over direct observer (decoupling). Rails callbacks are a form of observer pattern.
