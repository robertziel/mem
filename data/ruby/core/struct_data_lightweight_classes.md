### Ruby Struct & Data (Lightweight Classes)

**Struct (mutable):**
```ruby
Point = Struct.new(:x, :y)
p = Point.new(1, 2)
p.x         # 1
p.y = 5     # mutable
p == Point.new(1, 5)  # true (value equality)

# With keyword init (Ruby 3.1+)
Point = Struct.new(:x, :y, keyword_init: true)
p = Point.new(x: 1, y: 2)

# With methods
Money = Struct.new(:amount, :currency) do
  def to_s = "#{currency} #{amount}"
end
```

**Data (immutable, Ruby 3.2+):**
```ruby
Point = Data.define(:x, :y)
p = Point.new(x: 1, y: 2)
p.x         # 1
p.x = 5     # NoMethodError! (immutable)
p.frozen?   # true
```

**Rule of thumb:** `Data.define` for immutable value objects (Ruby 3.2+). `Struct` for mutable or pre-3.2. Both provide value equality, `to_a`, `to_h` for free.
