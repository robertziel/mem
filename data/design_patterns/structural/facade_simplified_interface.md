### Facade Pattern (Simplified Interface)

Provide a simple interface to a complex subsystem.

```ruby
class OrderFacade
  def place_order(user, cart)
    order = OrderService.create(user, cart)
    PaymentService.charge(user, order.total)
    InventoryService.reserve(order.items)
    NotificationService.send_confirmation(user, order)
    order
  end
end
```

**Rule of thumb:** Facade to simplify interaction with multiple subsystems. In Rails, a service object that orchestrates multiple models IS a facade. Don't expose internal complexity to the caller.
