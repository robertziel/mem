### Comparable & Spaceship Operator (<=>)

**Spaceship operator (<=>):**
```ruby
1 <=> 2     # -1 (left is less)
2 <=> 2     #  0 (equal)
3 <=> 2     #  1 (left is greater)
"a" <=> "b" # -1
nil <=> 1   # nil (incomparable)
```

**Comparable module:**
```ruby
class Temperature
  include Comparable

  attr_reader :degrees

  def initialize(degrees)
    @degrees = degrees
  end

  def <=>(other)
    degrees <=> other.degrees
  end
end

hot = Temperature.new(100)
cold = Temperature.new(0)
warm = Temperature.new(25)

hot > cold     # true
cold < warm    # true
hot == Temperature.new(100)  # true
[hot, cold, warm].sort       # [cold, warm, hot]
[hot, cold, warm].min        # cold
hot.between?(cold, warm)     # false
hot.clamp(cold, warm)        # warm (clamped to max)
```

**What Comparable gives you (from just <=>):**
- `<`, `<=`, `==`, `>=`, `>`
- `between?`
- `clamp`

**Sorting with sort_by (preferred):**
```ruby
users.sort_by { |u| u.name }           # ascending
users.sort_by { |u| -u.age }           # descending (numeric)
users.sort_by { |u| [u.role, u.name] } # multi-field sort

# sort_by is O(n log n) and computes the key once per element
# sort with block computes the comparison every time (slower)
```

**Custom sort with <=>:**
```ruby
users.sort { |a, b| a.name <=> b.name }            # ascending
users.sort { |a, b| b.created_at <=> a.created_at } # descending

# Multi-field sort
users.sort { |a, b|
  result = a.role <=> b.role
  result = a.name <=> b.name if result == 0
  result
}
```

**min, max, minmax, min_by:**
```ruby
[3, 1, 4, 1, 5].min          # 1
[3, 1, 4, 1, 5].max          # 5
[3, 1, 4, 1, 5].minmax       # [1, 5]
users.min_by { |u| u.age }   # youngest user
users.max_by { |u| u.score }  # highest scorer
```

**Rule of thumb:** Implement `<=>` and include `Comparable` for any class that has natural ordering. Use `sort_by` over `sort` with block (faster, cleaner). Multi-field sort: return array in `sort_by` or chain comparisons in `<=>`. Always return `nil` from `<=>` for incomparable types.
