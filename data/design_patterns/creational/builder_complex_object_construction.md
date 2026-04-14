### Builder Pattern (Complex Object Construction)

Construct complex objects step by step with a fluent interface.

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

**Rule of thumb:** Builder when an object has many optional parameters or complex construction. Common in Ruby: ActiveRecord query interface (`.where.order.limit` is a builder).
