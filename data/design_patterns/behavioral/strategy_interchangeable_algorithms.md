### Strategy Pattern (Interchangeable Algorithms)

Select algorithm at runtime without changing client code.

```ruby
class PricingCalculator
  def initialize(strategy)
    @strategy = strategy
  end

  def calculate(order) = @strategy.calculate(order)
end

class StandardPricing
  def calculate(order) = order.subtotal
end

class DiscountPricing
  def calculate(order) = order.subtotal * 0.9
end

class MemberPricing
  def calculate(order) = order.subtotal * 0.8
end

calculator = PricingCalculator.new(MemberPricing.new)
calculator.calculate(order)
```

**In Ruby, can also use lambdas/procs:**
```ruby
pricing = ->(order) { order.subtotal * 0.8 }
pricing.call(order)
```

**Rule of thumb:** Strategy when you have multiple algorithms for the same task (pricing, sorting, notification channels). In Ruby, lambdas are often simpler than full classes for simple strategies.
