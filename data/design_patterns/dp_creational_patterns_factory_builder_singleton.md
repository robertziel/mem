### Creational Design Patterns

**Factory Method:**
- Define interface for creating objects, let subclasses decide which class
- Decouple object creation from usage
```ruby
class NotificationFactory
  def self.create(type)
    case type
    when :email then EmailNotification.new
    when :sms   then SmsNotification.new
    when :push  then PushNotification.new
    else raise "Unknown type: #{type}"
    end
  end
end

notification = NotificationFactory.create(:email)
notification.send(user, message)
```
- Use when: you don't know which concrete class to create at compile time
- Rails example: `ActiveRecord::Base.establish_connection` creates right adapter

**Abstract Factory:**
- Factory of factories - create families of related objects
- Example: UI toolkit that creates buttons, inputs, modals for different themes
- Use when: system must be independent of how objects are created and composed

**Builder:**
- Construct complex objects step by step
- Same construction process can create different representations
```ruby
class QueryBuilder
  def initialize
    @select = "*"
    @conditions = []
    @order = nil
  end

  def select(fields) = tap { @select = fields }
  def where(condition) = tap { @conditions << condition }
  def order(field) = tap { @order = field }
  def to_sql
    sql = "SELECT #{@select} FROM users"
    sql += " WHERE #{@conditions.join(' AND ')}" if @conditions.any?
    sql += " ORDER BY #{@order}" if @order
    sql
  end
end

QueryBuilder.new.select("name, email").where("active = true").order("name").to_sql
```
- Use when: object has many optional parameters or complex construction

**Singleton:**
- Ensure a class has only one instance, provide global access
```ruby
class Configuration
  include Singleton
  attr_accessor :api_key, :timeout
end
# or in Ruby: just use a module with module-level state
```
- Use sparingly: makes testing harder, hides dependencies
- Prefer dependency injection instead
- Acceptable for: configuration, connection pools, loggers

**Rule of thumb:** Factory when you need flexible object creation. Builder for complex objects with many optional parts. Avoid Singleton unless you have a genuine need for exactly one instance (prefer DI).
