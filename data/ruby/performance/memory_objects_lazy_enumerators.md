### Ruby Memory: Avoiding Unnecessary Objects & Lazy Enumerators

**Problem:** Ruby's GC and object model can struggle with large datasets. Default patterns create millions of intermediate objects that bloat memory.

**Avoid creating unnecessary objects:**
```ruby
# Each iteration creates new String objects
users.each { |u| u.status == "active" }  # "active" is a new String each time

# Freeze strings or use symbols
ACTIVE = "active".freeze
users.each { |u| u.status == ACTIVE }

# Use frozen_string_literal pragma (freeze ALL string literals in file)
# frozen_string_literal: true
```

**Lazy enumerators — avoid intermediate arrays:**
```ruby
# map creates a full intermediate array
result = large_array.map { |x| transform(x) }.select { |x| x > 10 }.first(5)
# Creates: full mapped array + full filtered array, just to get 5 items

# Lazy enumerator — processes elements one at a time
result = large_array.lazy.map { |x| transform(x) }.select { |x| x > 10 }.first(5)
# Stops after finding 5 matches — no intermediate arrays
```

**Lazy evaluation for large/infinite collections:**
```ruby
(1..Float::INFINITY).lazy
  .select { |n| n.odd? }
  .map { |n| n ** 2 }
  .first(10)
# => [1, 9, 25, 49, 81, 121, 169, 225, 289, 361]
# Never materializes the infinite range

# Process large file lazily
File.open("huge_file.csv").each_line.lazy
  .map { |line| line.strip.split(",") }
  .select { |fields| fields[2] == "active" }
  .map { |fields| { name: fields[0], email: fields[1] } }
  .each_slice(1000) { |batch| process_batch(batch) }
```

**Custom lazy Enumerator:**
```ruby
def each_record(file_path)
  Enumerator.new do |yielder|
    File.open(file_path) do |f|
      f.each_line { |line| yielder << parse_line(line) }
    end
  end.lazy
end

each_record("data.csv").select { |r| r[:active] }.each { |r| process(r) }
```

**Rule of thumb:** Use `frozen_string_literal: true` at the top of every file. Use `lazy` for chained operations on large collections to avoid intermediate arrays. Build custom Enumerators for streaming data sources. The biggest memory win is not creating objects you don't need.
