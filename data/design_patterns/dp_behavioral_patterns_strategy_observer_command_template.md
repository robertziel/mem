### Behavioral Design Patterns

**Strategy:**
- Define a family of algorithms, make them interchangeable
- Select algorithm at runtime
```ruby
class PricingCalculator
  def initialize(strategy)
    @strategy = strategy
  end

  def calculate(order)
    @strategy.calculate(order)
  end
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
- Use when: multiple algorithms for the same task, selected at runtime
- In Ruby: can use lambdas/procs instead of classes

**Observer:**
- Define a one-to-many dependency: when one object changes, all dependents are notified
```ruby
class Order
  include ActiveSupport::Callbacks
  define_callbacks :complete

  set_callback :complete, :after, :send_confirmation
  set_callback :complete, :after, :update_inventory
  set_callback :complete, :after, :notify_warehouse

  def complete!
    run_callbacks(:complete) { update!(status: 'completed') }
  end
end
```
- Use when: state changes need to trigger multiple reactions
- Rails: callbacks, ActiveSupport::Notifications, pub/sub with Redis

**Command:**
- Encapsulate a request as an object
- Enables: undo, queue, log, and parameterize operations
```ruby
class TransferMoneyCommand
  def initialize(from_account, to_account, amount)
    @from = from_account
    @to = to_account
    @amount = amount
  end

  def execute
    @from.debit(@amount)
    @to.credit(@amount)
  end

  def undo
    @to.debit(@amount)
    @from.credit(@amount)
  end
end
```
- Use when: undo/redo, queuing operations, transaction logging

**Template Method:**
- Define skeleton of algorithm in base class, let subclasses override specific steps
```ruby
class BaseImporter
  def import(file)
    data = parse(file)        # subclass implements
    validated = validate(data) # subclass may override
    save(validated)            # shared implementation
  end

  def validate(data) = data   # default: no validation
  def save(data) = data.each { |row| Record.create!(row) }
end

class CsvImporter < BaseImporter
  def parse(file) = CSV.read(file, headers: true).map(&:to_h)
end

class JsonImporter < BaseImporter
  def parse(file) = JSON.parse(File.read(file))
  def validate(data) = data.select { |row| row['email'].present? }
end
```

**Chain of Responsibility:**
- Pass request along a chain of handlers until one handles it
- Each handler decides to process or pass to next
- Use when: middleware pipelines, request processing (Rack middleware, Express middleware)

**Rule of thumb:** Strategy for interchangeable algorithms. Observer for event-driven reactions (prefer pub/sub at scale). Command for undoable or queueable operations. Template Method when subclasses share structure but differ in details.
