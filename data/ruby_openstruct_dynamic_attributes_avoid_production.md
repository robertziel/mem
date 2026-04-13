### Ruby OpenStruct (Avoid in Production)

```ruby
person = OpenStruct.new(name: "Alice", age: 30)
person.name          # "Alice"
person.email = "a@b.com"  # dynamically adds attribute!
person.email         # "a@b.com"
```

**Why to avoid in production:**
- Uses `method_missing` internally → slow
- No type checking, no defined interface
- Hard to debug (any typo creates a new attribute silently)
- Memory overhead

**Use instead:**
| Need | Use |
|------|-----|
| Immutable value | `Data.define` (Ruby 3.2+) |
| Mutable value | `Struct.new` |
| Dynamic attributes | `Hash` |
| Quick prototype | `OpenStruct` (REPL/console only) |

**Rule of thumb:** OpenStruct only in REPL/console for quick prototyping. Never in production code. Use `Struct` or `Data.define` instead.
