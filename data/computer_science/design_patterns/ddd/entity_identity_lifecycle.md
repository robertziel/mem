### DDD: Entity (Identity-Based Object)

**What an Entity is:**
- Defined by a unique ID, not its attributes
- Two entities with same attributes but different IDs are different
- Identity persists across state changes

```ruby
class User
  attr_reader :id, :name, :email

  def initialize(id:, name:, email:)
    @id = id
    @name = name
    @email = email
  end

  def ==(other)
    id == other.id  # equality by identity, not attributes
  end
end

# Same name but different IDs = different entities
User.new(id: 1, name: "Alice") != User.new(id: 2, name: "Alice")
```

**Examples:** User, Order, Account, Product, Invoice — anything with a lifecycle and unique identity.

**Rule of thumb:** If you ask "is this the SAME thing?" and the answer depends on an ID (not attributes), it's an Entity. Entities are mutable — their state changes over time but their identity stays.
