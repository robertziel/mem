### Ruby Lazy Enumerators & Custom Enumerable

**Lazy enumerators (for large/infinite collections):**
```ruby
# Without lazy: builds full intermediate arrays
(1..Float::INFINITY).select { |n| n.odd? }.take(5)  # hangs!

# With lazy: processes one element at a time
(1..Float::INFINITY).lazy.select { |n| n.odd? }.take(5).to_a  # [1,3,5,7,9]

# Chaining multiple lazy operations
File.open("huge.log").each_line.lazy
  .select { |line| line.include?("ERROR") }
  .map { |line| line.strip }
  .first(10)
```

**Custom Enumerable:**
```ruby
class TeamRoster
  include Enumerable

  def initialize(members)
    @members = members
  end

  def each(&block)
    @members.each(&block)  # delegate to internal collection
  end
end

roster = TeamRoster.new(["Alice", "Bob", "Carol"])
roster.select { |m| m.start_with?("A") }  # ["Alice"]
roster.count                                # 3
```

**each_with_object vs reduce:**
```ruby
# reduce: accumulator is the return value of the block
[1,2,3].reduce({}) { |h, n| h.merge(n => n**2) }  # creates new hash each time

# each_with_object: accumulator is passed by reference (better for hashes/arrays)
[1,2,3].each_with_object({}) { |n, h| h[n] = n**2 }  # mutates in place, faster
```

**Rule of thumb:** Use `lazy` for large datasets or chained operations on infinite/huge collections to avoid building intermediate arrays. Use `each_with_object` over `reduce` when building hashes or arrays. Include `Enumerable` in custom classes and define `each` to get the full method suite for free.
