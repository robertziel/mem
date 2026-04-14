### DDD: Aggregate & Aggregate Root

**What an Aggregate is:**
- Cluster of entities and value objects treated as a single unit
- One entity is the **Aggregate Root** — the only entry point
- All changes go through the root (enforces invariants)
- One aggregate = one transaction boundary

```ruby
class Order  # Aggregate Root
  attr_reader :id, :line_items, :status

  def add_item(product_id, quantity, price)
    raise "Cannot modify completed order" if status == :completed
    @line_items << LineItem.new(product_id: product_id, quantity: quantity, price: price)
  end

  def complete
    raise "Cannot complete empty order" if @line_items.empty?
    @status = :completed
  end
end

class LineItem  # Entity WITHIN aggregate — NOT accessible from outside
  attr_reader :product_id, :quantity, :price
end
```

**Aggregate design rules:**
1. Reference other aggregates by ID only (not object reference)
2. One aggregate per transaction
3. Keep aggregates small
4. External code only talks to the Aggregate Root

```ruby
# BAD: cross-aggregate object reference
class Order
  belongs_to :user  # tight coupling
end

# GOOD: reference by ID
class Order
  attr_reader :user_id  # just the ID
end
```

**Rule of thumb:** Aggregate = consistency boundary. Everything inside is consistent within a single transaction. External objects reference the aggregate by root ID only. Keep aggregates small — large aggregates cause lock contention.
