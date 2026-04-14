### `each` vs. `map` (short)

- **`each`** iterates for side effects, returns the original enumerable.
- **`map`** transforms elements, returns a new array.

```ruby
nums = [1, 2, 3]

nums.each { |n| puts n }   # returns [1, 2, 3]
nums.map { |n| n * 2 }     # returns [2, 4, 6]
```

**Rule of thumb:**
- Use `each` when you don’t need a new array.
- Use `map` when you do.
