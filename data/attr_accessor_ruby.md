### `attr_reader`, `attr_writer`, `attr_accessor` (short)

Ruby can auto-generate getters/setters for instance variables.

- **`attr_reader`** → getter only
- **`attr_writer`** → setter only
- **`attr_accessor`** → getter + setter

```ruby
class User
  attr_reader :id
  attr_writer :name
  attr_accessor :email

  def initialize(id)
    @id = id
  end
end
```

**Tip:** Use `attr_reader` for IDs or sensitive data you don’t want changed.
