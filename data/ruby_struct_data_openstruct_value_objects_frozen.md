### Ruby Struct, Data & OpenStruct

**Struct (lightweight class):**
```ruby
Point = Struct.new(:x, :y)
p = Point.new(1, 2)
p.x         # 1
p.y = 5     # mutable
p.to_a      # [1, 5]
p == Point.new(1, 5)  # true (value equality, not identity)

# With keyword arguments (Ruby 3.1+)
Point = Struct.new(:x, :y, keyword_init: true)
p = Point.new(x: 1, y: 2)

# With methods
Money = Struct.new(:amount, :currency) do
  def to_s
    "#{currency} #{amount}"
  end

  def +(other)
    raise "Currency mismatch" unless currency == other.currency
    Money.new(amount + other.amount, currency)
  end
end
```

**Data (immutable struct, Ruby 3.2+):**
```ruby
Point = Data.define(:x, :y)
p = Point.new(x: 1, y: 2)
p.x         # 1
p.x = 5     # NoMethodError! (immutable)
p.frozen?   # true

# With custom methods
Money = Data.define(:amount, :currency) do
  def to_s = "#{currency} #{amount}"

  def +(other)
    raise "Currency mismatch" unless currency == other.currency
    Money.new(amount: amount + other.amount, currency: currency)
  end
end

# Pattern matching
case Point.new(x: 0, y: 0)
in Point[x: 0, y: 0]
  puts "origin"
in Point[x:, y:] if x == y
  puts "diagonal"
end
```

**OpenStruct (dynamic, avoid in production):**
```ruby
person = OpenStruct.new(name: "Alice", age: 30)
person.name          # "Alice"
person.email = "a@b.com"  # dynamically adds attribute!
person.email         # "a@b.com"
```

**Comparison:**
| Feature | Struct | Data (3.2+) | OpenStruct |
|---------|--------|-------------|------------|
| Mutable | Yes | No (frozen) | Yes |
| Dynamic attrs | No | No | Yes |
| Performance | Fast | Fast | Slow (method_missing) |
| Equality | Value-based | Value-based | Value-based |
| Pattern matching | Yes | Yes (best) | No |
| Use in production | Yes | Yes (preferred) | Avoid |

**When to use each:**
- **Struct**: simple value objects, config, return multiple values from a method
- **Data**: immutable value objects (preferred in Ruby 3.2+), domain concepts
- **OpenStruct**: REPL/prototyping only, never in production (slow, dynamic)

**Value objects in Rails:**
```ruby
# Using Data for domain concept
DateRange = Data.define(:start_date, :end_date) do
  def days = (end_date - start_date).to_i
  def include?(date) = date.between?(start_date, end_date)
  def overlap?(other)
    start_date <= other.end_date && end_date >= other.start_date
  end
end

range = DateRange.new(start_date: Date.today, end_date: 1.week.from_now)
range.days       # 7
range.frozen?    # true
```

**Rule of thumb:** Use `Data.define` for immutable value objects (Ruby 3.2+), `Struct` for mutable or pre-3.2. Never use OpenStruct in production code (slow, unpredictable). Value objects are perfect for: Money, DateRange, Address, Coordinates, EmailAddress.
