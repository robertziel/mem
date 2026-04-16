### Service Patterns: Command Pattern, Policy Objects & Organization

**1. Command pattern (callable objects):**
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

**2. Policy objects (authorization logic):**
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

**3. When to use what:**

| Complexity | Pattern | Example |
|-----------|---------|---------|
| Simple CRUD | Controller + model | Update user profile |
| Single operation with side effects | Service object | Register user (create + send email) |
| Multi-step pipeline | Interactor organizer | Place order (validate -> charge -> fulfill) |
| Authorization check | Policy object | Can user cancel order? |
| Complex query | Query object | Search with filters + sorting |
| Data transformation | Form object | Normalize + validate complex input |

**4. File organization:**
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
# bad: Service that's just a wrapper around a model method
class UpdateUserName
  def call(user, name)
    user.update!(name: name)  # just use user.update! directly
  end
end

# bad: Service with too many responsibilities
class DoEverything
  def call
    validate_input    # form object
    authorize_user    # policy object
    fetch_data        # query object
    process_data      # actual business logic <- this is the service
    send_emails       # background job
    update_cache      # callback or observer
  end
end

# bad: Passing too much context around
# Use explicit parameters, not a shared context hash that grows unbounded

# good: Keep services focused: one public method, clear inputs, clear output
```

**Rule of thumb:** Use `ApplicationService.call(...)` as a base for consistent one-liner invocations. Separate authorization into policy objects -- don't mix it with business logic. Don't extract simple CRUD into services -- that's just ceremony. Keep services focused: one `call` method, explicit inputs, clear output.
