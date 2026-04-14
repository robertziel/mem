### Ruby Enumerable & Enumerator

**Enumerable** is the most important Ruby module — mixed into Array, Hash, Range, Set, and any class that implements `each`.

**Essential methods:**
```ruby
# Filtering
[1,2,3,4,5].select { |n| n.even? }        # [2, 4]
[1,2,3,4,5].reject { |n| n.even? }        # [1, 3, 5]
[1, nil, 2, nil].compact                    # [1, 2]
[1,1,2,3,3].uniq                            # [1, 2, 3]

# Transforming
[1,2,3].map { |n| n * 2 }                  # [2, 4, 6]
[[1,2],[3,4]].flat_map { |a| a }           # [1, 2, 3, 4]
["a","b","c"].each_with_index { |v,i| }    # yields value + index
[1,2,3].each_with_object({}) { |n, h| h[n] = n**2 }  # {1=>1, 2=>4, 3=>9}

# Aggregating
[1,2,3,4].reduce(0) { |sum, n| sum + n }  # 10
[1,2,3,4].reduce(:+)                       # 10 (shorthand)
[1,2,3,4].sum                               # 10
[5,2,8,1].min                               # 1
[5,2,8,1].max                               # 8
[5,2,8,1].minmax                            # [1, 8]
[1,2,3].count { |n| n.odd? }              # 2
[1,2,3].any? { |n| n > 2 }                # true
[1,2,3].all? { |n| n > 0 }                # true
[1,2,3].none? { |n| n > 5 }               # true

# Grouping
["ant","bear","cat"].group_by { |w| w.length }
# {3=>["ant","cat"], 4=>["bear"]}

["ant","bear","cat"].sort_by { |w| w.length }  # ["ant","cat","bear"]
[3,1,2].sort                                    # [1, 2, 3]

# Searching
[1,2,3,4].find { |n| n > 2 }              # 3 (first match)
[1,2,3,4].detect { |n| n > 2 }            # 3 (alias)
[1,2,3,4].include?(3)                       # true

# Slicing
[1,2,3,4,5].take(3)                         # [1, 2, 3]
[1,2,3,4,5].drop(2)                         # [3, 4, 5]
[1,2,3,4,5].take_while { |n| n < 4 }      # [1, 2, 3]
[1,2,3,4,5].each_slice(2).to_a             # [[1,2],[3,4],[5]]
[1,2,3,4].each_cons(2).to_a                # [[1,2],[2,3],[3,4]]
[1,2,3].zip(["a","b","c"])                  # [[1,"a"],[2,"b"],[3,"c"]]

# Hash-specific
{a: 1, b: 2, c: 3}.select { |k,v| v > 1 }  # {b: 2, c: 3}
{a: 1, b: 2}.transform_values { |v| v * 10 } # {a: 10, b: 20}
{a: 1, b: 2}.map { |k,v| [k, v*2] }.to_h     # {a: 2, b: 4}
```

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

**Rule of thumb:** Use `map` for transformation, `select`/`reject` for filtering, `reduce` for aggregation, `flat_map` to flatten one level, `each_with_object` over `reduce` for building hashes/arrays. Use `lazy` for large datasets or chained operations.
