### Policy Object Pattern

**What a Policy Object is:**
- Encapsulates authorization logic for a specific model
- Plain Ruby class, easy to test

```ruby
class OrderPolicy
  def initialize(user, order)
    @user = user
    @order = order
  end

  def show?
    @user == @order.user || @user.admin?
  end

  def cancel?
    @user == @order.user && @order.pending?
  end

  def refund?
    @user.admin? && @order.completed?
  end
end

# Usage
policy = OrderPolicy.new(current_user, @order)
if policy.cancel?
  @order.cancel!
else
  render json: { error: "Not authorized" }, status: :forbidden
end
```

**Rule of thumb:** One Policy class per model. Method per action (`show?`, `create?`, `update?`, `destroy?`). This is what Pundit gem formalizes. Test policies directly (they're plain Ruby — no database needed).
