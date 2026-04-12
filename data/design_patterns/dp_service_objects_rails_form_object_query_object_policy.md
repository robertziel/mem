### Service Objects and Rails Patterns

**Service Object:**
- Plain Ruby class that encapsulates a business operation
- Single responsibility: one public method (usually `call`)
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

**Form Object:**
- Encapsulates form validation and multi-model persistence
- Useful when a form doesn't map 1:1 to a model
```ruby
class RegistrationForm
  include ActiveModel::Model

  attr_accessor :name, :email, :password, :company_name

  validates :name, :email, :password, presence: true
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }

  def save
    return false unless valid?
    ActiveRecord::Base.transaction do
      company = Company.create!(name: company_name)
      User.create!(name: name, email: email, password: password, company: company)
    end
  end
end
```

**Query Object:**
- Encapsulates complex database queries
- Composable, testable, reusable
```ruby
class ActiveUsersQuery
  def initialize(relation = User.all)
    @relation = relation
  end

  def call(since: 30.days.ago)
    @relation
      .joins(:sessions)
      .where(sessions: { created_at: since.. })
      .distinct
      .order(created_at: :desc)
  end
end

# Usage
ActiveUsersQuery.new.call(since: 7.days.ago).limit(10)
ActiveUsersQuery.new(company.users).call  # scoped to company
```

**Policy Object:**
- Encapsulates authorization logic
```ruby
class OrderPolicy
  def initialize(user, order)
    @user = user
    @order = order
  end

  def cancel? = @user == @order.user || @user.admin?
  def refund? = @user.admin? && @order.completed?
end
```

**Value Object:**
- Immutable object defined by its attributes (not identity)
```ruby
class Money
  attr_reader :amount, :currency

  def initialize(amount, currency = 'USD')
    @amount = amount.freeze
    @currency = currency.freeze
    freeze
  end

  def +(other)
    raise "Currency mismatch" unless currency == other.currency
    Money.new(amount + other.amount, currency)
  end

  def ==(other) = amount == other.amount && currency == other.currency
end
```

**When to use what:**
| Pattern | Use case |
|---------|----------|
| Service Object | Complex business operations, multi-step workflows |
| Form Object | Multi-model forms, complex validations |
| Query Object | Complex or reusable database queries |
| Policy Object | Authorization rules |
| Value Object | Domain concepts (Money, Address, DateRange) |
| Presenter/Decorator | View-specific logic |

**Rule of thumb:** Keep controllers thin (delegate to services). Keep models focused on persistence and associations. Extract complex operations into service objects. Extract complex queries into query objects. Use form objects when a form spans multiple models.
