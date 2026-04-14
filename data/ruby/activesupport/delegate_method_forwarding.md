### ActiveSupport: delegate

```ruby
class Order < ApplicationRecord
  belongs_to :customer

  # Generates: def name; customer.name; end
  delegate :name, :email, to: :customer

  # With prefix (generates customer_name, customer_email)
  delegate :name, :email, to: :customer, prefix: true

  # Custom prefix
  delegate :name, to: :customer, prefix: :buyer  # buyer_name

  # Allow nil (returns nil instead of NoMethodError when customer is nil)
  delegate :name, to: :customer, allow_nil: true

  # Delegate to class
  delegate :tax_rate, to: :class
end

order = Order.new(customer: Customer.new(name: "Alice"))
order.name           # "Alice" (delegated)
order.customer_name  # "Alice" (prefixed)
```

**Rule of thumb:** Use `delegate` to follow the Law of Demeter (avoid `order.customer.name` chains). Always use `allow_nil: true` when the association can be nil. Use `prefix: true` to avoid method name collisions.
