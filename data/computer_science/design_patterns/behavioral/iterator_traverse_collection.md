### Iterator Pattern (Traverse Collections)

Access elements of a collection sequentially without exposing the underlying structure.

```ruby
# Ruby's Enumerable IS the iterator pattern
class NumberRange
  include Enumerable

  def initialize(from, to)
    @from = from
    @to = to
  end

  def each
    current = @from
    while current <= @to
      yield current
      current += 1
    end
  end
end

range = NumberRange.new(1, 5)
range.map { |n| n * 2 }   # [2, 4, 6, 8, 10]
range.select(&:odd?)       # [1, 3, 5]
range.to_a                 # [1, 2, 3, 4, 5]
```

**External vs internal iterator:**
```ruby
# External: caller controls iteration
enumerator = [1, 2, 3].each  # returns Enumerator
enumerator.next  # 1
enumerator.next  # 2

# Internal: collection controls iteration (Ruby's default)
[1, 2, 3].each { |n| puts n }
```

**Rule of thumb:** In Ruby, you rarely implement Iterator explicitly — `include Enumerable` and define `each`. Ruby's Enumerator provides external iteration when needed. The pattern is built into the language.
