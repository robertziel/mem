### `==` vs `eql?` vs `equal?`

- `==` -> value equality; classes can override it
- `eql?` -> stricter equality, usually value plus type; used by `Hash` keys
- `equal?` -> object identity; same object in memory

### Example

```ruby
1 == 1.0         # true
1.eql?(1.0)      # false

a = "hi"
b = "hi"

a == b           # true
a.equal?(b)      # false
```

**Rule of thumb:** Use `==` for normal comparisons, `eql?` when hash semantics matter, and `equal?` only when you truly care about object identity.
