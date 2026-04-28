### Ruby — `each` vs `map` (and the Enumerable family)

**Definition:** **`each`** iterates for **side effects** and returns the **original** enumerable. **`map`** transforms each element and returns a **new array**. Same shape (block-taking), different intent.

**Core comparison:**

| Method | Returns | Use for | Block result |
|---|---|---|---|
| **`each`** | The original collection | Side effects (print, mutate, IO) | Ignored |
| **`map`** | New array of transformed values | Building a transformed collection | Becomes new element |
| **`each_with_index`** | Original collection | Side effects + index | Ignored |
| **`each_with_object`** | The seed object | Building up state (like `inject` but returns the obj) | Mutates seed |

**Quick demo:**

```ruby
nums = [1, 2, 3]

nums.each { |n| puts n }        # prints; returns [1, 2, 3]
nums.map { |n| n * 2 }          # returns [2, 4, 6]
nums.each.with_index { |n, i| puts "#{i}: #{n}" }
nums.each_with_object([]) { |n, acc| acc << n * 3 }   # [3, 6, 9]
```

**The wider Enumerable family:**

| Method | Returns | Purpose |
|---|---|---|
| `each` | Original | Side effects |
| `map` / `collect` | New array | Transform |
| `select` / `filter` | New array | Keep matching |
| `reject` | New array | Drop matching |
| `find` / `detect` | First match (or nil) | Search |
| `any?` | Boolean | Any match? |
| `all?` | Boolean | All match? |
| `none?` | Boolean | None match? |
| `count` | Integer | Count (with optional block) |
| `reduce` / `inject` | Single value | Aggregate |
| `each_with_object` | Seed object | Build with mutable accumulator |
| `flat_map` / `collect_concat` | Flattened mapped array | Map then flatten one level |
| `group_by` | Hash of group → array | Categorize |
| `partition` | `[true_arr, false_arr]` | Split by predicate |
| `sort_by` | New sorted array | Stable sort by computed key |
| `uniq` | New deduped array | Distinct |
| `tally` | Hash of element → count | Frequency count |
| `chunk_while` | Array of arrays | Adjacent grouping |
| `each_cons(n)` / `each_slice(n)` | Sliding / fixed windows | Pair / chunk processing |

**`map` vs `flat_map`:**

```ruby
[[1,2], [3,4]].map { |a| a.first }       # [1, 3]
[[1,2], [3,4]].flat_map { |a| a }        # [1, 2, 3, 4]
users.flat_map { |u| u.tags }             # all tags across users
```

| Method | Behavior |
|---|---|
| `map` | One output per input |
| `flat_map` | Concatenates outputs (one level) |
| `flatten` | Flattens nested arrays (deep) |

**`reduce` / `inject` — the heavyweight:**

```ruby
[1, 2, 3].reduce(0) { |sum, n| sum + n }        # 6
[1, 2, 3].reduce(:+)                              # 6 (symbol form)
[1, 2, 3, 4].reduce { |acc, n| acc * n }         # 24 (no initial → first elem)

# Build a hash
[[:a, 1], [:b, 2]].reduce({}) { |h, (k, v)| h.merge(k => v) }
# → { a: 1, b: 2 }

# Better: each_with_object (no copy each iteration)
[[:a, 1], [:b, 2]].each_with_object({}) { |(k, v), h| h[k] = v }
```

| Method | When |
|---|---|
| `reduce` | Pure aggregation, no mutation |
| `each_with_object` | Building a mutable thing (Hash, Array) |
| `tally` | Counting frequencies (saves boilerplate) |
| `sum` | Numeric aggregation (faster than reduce(:+)) |

**Performance notes:**

| Pattern | Cost |
|---|---|
| `map` allocates new array | O(n) memory |
| `each` doesn't allocate | Side-effect only |
| Chained `map.select.map` | Multiple intermediate arrays |
| `lazy.map.select.first(N)` | Streaming — no full intermediate |
| `each` returning `self` | Useful for chaining |

**Lazy enumerable:**

```ruby
(1..Float::INFINITY)
  .lazy
  .map  { |n| n * n }
  .select { |n| n.even? }
  .first(5)
# => [4, 16, 36, 64, 100]
```

| Property | Detail |
|---|---|
| `.lazy` | Streams instead of allocating |
| Operations chain without materializing | Until terminal call |
| Terminal: `first`, `to_a`, `force` | Triggers evaluation |
| Use case | Infinite streams, expensive operations |

**Common idioms:**

```ruby
# Build from existing collection
users.map(&:name)                            # ["Alice", "Bob"]
users.map(&:active?).count(true)             # how many active

# Group + count
words.tally                                  # { "the" => 3, "and" => 2 }

# Partition
adults, minors = users.partition(&:adult?)

# Index by
products.index_by(&:sku)                     # ActiveSupport: {sku => product}
products.group_by(&:category)                # { "books" => [...], ... }

# Sliding window
words.each_cons(2).to_a                      # [[w1,w2],[w2,w3],...]
words.each_slice(3).to_a                     # [[w1,w2,w3],[w4,w5,w6],...]

# Find first matching
users.find(&:admin?)
users.detect { |u| u.role == "owner" }       # alias

# Any / all / none
orders.any?(&:paid?)
orders.all?(&:placed?)
```

**`map` returning `self` — bug pattern:**

```ruby
# ❌ Probably want each here
users.map do |u|
  u.activate!
end
# Returns array of activate! return values; if `activate!` returns user, it's a list of users

# ✅ For side effects, use each:
users.each(&:activate!)
```

| Symptom | Probably wrong method |
|---|---|
| `map` whose return value is ignored | Use `each` |
| `each` whose result you need | Use `map` |
| Building array from each | Use `map` |
| Iterating without changes | Use `each` |

**Symbol-to-proc shortcut:**

```ruby
nums.map { |n| n.to_s }       # explicit
nums.map(&:to_s)              # shortcut

users.select(&:admin?)
users.sort_by(&:created_at)
```

| Pattern | Detail |
|---|---|
| `&:method` | Calls `to_proc` on the symbol |
| Works on any single-arg method | `&:method_name` |
| Methods with args | Use `{ \|x\| x.method(arg) }` |

**Decision matrix — which Enumerable to pick:**

| Need | Method |
|---|---|
| Side effects only | `each` |
| Transform every element | `map` |
| Filter | `select` / `reject` |
| First match | `find` |
| Boolean check | `any?` / `all?` / `none?` |
| Aggregate to single value | `reduce` / `sum` |
| Build a hash/array incrementally | `each_with_object` |
| Group items | `group_by` |
| Count items | `count` / `tally` |
| Categorize into pass/fail | `partition` |
| Sort stably by computed key | `sort_by` |
| Lazy / infinite | `.lazy.map.select.first(N)` |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| `map` for side effects | Wastes memory on unused array |
| `each` when you need result | Returns original, not transformed |
| `reduce` to build a hash | Copies hash each iteration — use `each_with_object` |
| `select` + `first` instead of `find` | Iterates whole collection |
| Mutating array during `each` | Behavior is implementation-defined |
| `flatten` when you wanted `flat_map` | Different semantics |
| Forgetting `&:method` requires arity 0 | TypeError if method takes args |
| Chaining `.map.select.map` on big array | Many intermediate arrays — use `lazy` |

**Cross-references:**

- Comparable / sorting: [equality_*.md](equality_eq_eql_equal_methods.md)
- Symbols vs strings: [symbols_vs_strings.md](symbols_vs_strings.md)
- Pass-by-value + mutation: [pass_by_value_*.md](pass_by_value_references_mutation.md)

**Rule of thumb:** **`each` = side effects + returns original; `map` = transform + returns new array.** Reach for `find`, `select`, `reject`, `any?`, `all?`, `tally`, `partition`, `group_by` instead of writing custom loops — they exist for a reason. Use **`each_with_object`** to build a hash/array (faster than `reduce`), **`flat_map`** to map-then-flatten in one pass, **`.lazy`** for infinite or expensive streams.
