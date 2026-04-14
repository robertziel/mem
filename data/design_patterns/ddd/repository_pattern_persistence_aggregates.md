### DDD: Repository Pattern

**What a Repository does:**
- Loads and saves entire aggregates
- Hides persistence details from domain model
- One repository per aggregate root

```ruby
class OrderRepository
  def find(id)
    record = OrderRecord.includes(:line_items).find(id)
    Order.from_record(record)  # reconstruct domain object
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

# Usage
order = order_repo.find(123)
order.add_item(product_id: 1, quantity: 2, price: 1000)
order_repo.save(order)
```

**Repository vs ActiveRecord:**
| Feature | Repository | ActiveRecord directly |
|---------|-----------|---------------------|
| Domain model | Pure Ruby objects | AR model = DB table |
| Persistence | Hidden behind interface | Coupled to DB |
| Testing | Easy (mock repository) | Needs database |
| Complexity | More code | Less code |
| Use when | Complex domain logic | Simple CRUD |

**Rule of thumb:** In most Rails apps, ActiveRecord IS the repository (good enough). Extract a dedicated Repository when: domain model diverges from DB schema, you need to test domain logic without DB, or you want to switch storage backends.
