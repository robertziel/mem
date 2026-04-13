### DDD Tactical Design: Aggregates, Entities, Value Objects & Repositories

**Entity (has identity):**
- Defined by a unique ID, not its attributes
- Two entities with same attributes but different IDs are different
- Identity persists across state changes
- Examples: User, Order, Account, Product

```ruby
class User
  attr_reader :id, :name, :email

  def initialize(id:, name:, email:)
    @id = id      # identity — this is what makes a User unique
    @name = name
    @email = email
  end

  def ==(other)
    id == other.id  # equality by identity, not attributes
  end
end
```

**Value Object (no identity, defined by attributes):**
- Immutable: once created, never changes
- Two value objects with same attributes are equal
- No ID — equality by attribute comparison
- Examples: Money, Address, DateRange, EmailAddress, Coordinates

```ruby
Money = Data.define(:amount, :currency) do
  def +(other)
    raise "Currency mismatch" unless currency == other.currency
    Money.new(amount: amount + other.amount, currency: currency)
  end

  def to_s = "#{currency} #{'%.2f' % (amount / 100.0)}"
end

# Two Money objects with same amount + currency are equal
Money.new(amount: 1000, currency: "USD") == Money.new(amount: 1000, currency: "USD")  # true
```

**When to use Entity vs Value Object:**
| Characteristic | Entity | Value Object |
|---------------|--------|-------------|
| Has unique ID? | Yes | No |
| Mutable? | Yes (state changes) | No (immutable) |
| Equality | By ID | By attributes |
| Lifecycle | Created, modified, deleted | Created, replaced |
| Examples | User, Order, Account | Money, Address, Email |

**Aggregate (consistency boundary):**
- Cluster of entities and value objects treated as a single unit
- One entity is the **Aggregate Root** — the only entry point
- External objects can only reference the aggregate by its root's ID
- All changes go through the root (enforces invariants)
- Transactional boundary: one aggregate = one transaction

```ruby
class Order  # Aggregate Root
  attr_reader :id, :line_items, :status, :total

  def add_item(product_id, quantity, price)
    raise "Cannot modify completed order" if status == :completed
    item = LineItem.new(product_id: product_id, quantity: quantity, price: price)
    @line_items << item
    recalculate_total
  end

  def remove_item(product_id)
    raise "Cannot modify completed order" if status == :completed
    @line_items.reject! { |item| item.product_id == product_id }
    recalculate_total
  end

  def complete
    raise "Cannot complete empty order" if @line_items.empty?
    @status = :completed
  end

  private

  def recalculate_total
    @total = @line_items.sum { |item| item.price * item.quantity }
  end
end

class LineItem  # Entity within aggregate (NOT accessible outside Order)
  attr_reader :product_id, :quantity, :price
end
```

**Aggregate design rules:**
1. Reference other aggregates by ID only (not by object reference)
2. One aggregate per transaction (don't modify two aggregates in one transaction)
3. Keep aggregates small (fewer entities, less contention)
4. Enforce all invariants within the aggregate boundary

```ruby
# BAD: Order references User object directly
class Order
  belongs_to :user  # tight coupling across aggregate boundaries
end

# GOOD: Order references user by ID
class Order
  attr_reader :user_id  # just the ID, load User separately if needed
end
```

**Repository (persistence for aggregates):**
```ruby
class OrderRepository
  def find(id)
    record = OrderRecord.includes(:line_items).find(id)
    Order.from_record(record)  # reconstruct domain object from DB record
  end

  def save(order)
    OrderRecord.transaction do
      record = OrderRecord.find_or_initialize_by(id: order.id)
      record.update!(order.to_attributes)
      record.line_items.destroy_all
      order.line_items.each { |item| record.line_items.create!(item.to_attributes) }
    end
  end
end
```
- Repository loads/saves entire aggregates (not individual entities)
- One repository per aggregate root
- Hides persistence details from domain model

**Domain Services (logic that doesn't belong to one entity):**
```ruby
class TransferMoneyService
  def execute(from_account_id, to_account_id, amount)
    from = account_repo.find(from_account_id)
    to = account_repo.find(to_account_id)

    from.debit(amount)
    to.credit(amount)

    account_repo.save(from)
    account_repo.save(to)
  end
end
```

**Domain Events (communicate between aggregates):**
```ruby
class Order
  def complete
    @status = :completed
    DomainEvents.publish(OrderCompleted.new(order_id: id, total: total))
  end
end

# Other aggregates react to the event (eventually consistent)
DomainEvents.subscribe(OrderCompleted) do |event|
  InventoryService.reserve(event.order_id)
  NotificationService.send_confirmation(event.order_id)
end
```

**Anemic Domain Model (anti-pattern):**
```ruby
# BAD: model has no behavior, logic lives in services
class Order
  attr_accessor :status, :total, :items  # just data, no behavior
end

class OrderService
  def complete(order)
    order.status = :completed  # service manipulates model directly
  end
end

# GOOD: model encapsulates behavior (Rich Domain Model)
class Order
  def complete
    raise "Cannot complete empty order" if items.empty?
    @status = :completed  # model enforces its own rules
  end
end
```

**Rule of thumb:** Entities have identity (ID-based equality). Value Objects are immutable (attribute-based equality, no ID). Aggregates are consistency boundaries — one transaction per aggregate. Keep aggregates small. Reference other aggregates by ID only. Repositories load/save whole aggregates. Avoid anemic domain models — put behavior in your domain objects.
