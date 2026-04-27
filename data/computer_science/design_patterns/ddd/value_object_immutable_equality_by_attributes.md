### DDD: Value Object (Immutable, Attribute-Based)

**What a Value Object is:**
- No unique ID — defined solely by its attributes
- Immutable: once created, never changes
- Two value objects with same attributes are equal

```ruby
Money = Data.define(:amount, :currency) do
  def +(other)
    raise "Currency mismatch" unless currency == other.currency
    Money.new(amount: amount + other.amount, currency: currency)
  end

  def to_s = "#{currency} #{'%.2f' % (amount / 100.0)}"
end

# Same amount + currency = equal
Money.new(amount: 1000, currency: "USD") == Money.new(amount: 1000, currency: "USD")  # true

# Immutable: changing creates a new object
price = Money.new(amount: 1000, currency: "USD")
new_price = price + Money.new(amount: 500, currency: "USD")  # new object
```

**Examples:** Money, Address, DateRange, EmailAddress, Coordinates, Color, Temperature.

**Entity vs Value Object:**
| Feature | Entity | Value Object |
|---------|--------|-------------|
| Has unique ID? | Yes | No |
| Mutable? | Yes | No (immutable) |
| Equality | By ID | By attributes |
| Examples | User, Order | Money, Address |

**Rule of thumb:** If two objects with the same attributes are interchangeable (like two $10 bills), it's a Value Object. Make them immutable. Use Ruby's `Data.define` (3.2+) or `Struct.new` with `freeze`.
