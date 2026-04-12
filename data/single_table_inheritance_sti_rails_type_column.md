### Single Table Inheritance (STI) (short)

**STI** stores multiple subclasses in one table using a `type` column.

```ruby
class Vehicle < ApplicationRecord; end
class Car < Vehicle; end
class Bike < Vehicle; end
```

**Pros:** simple schema, shared columns.
**Cons:** lots of nullable columns, harder constraints.

**Rule of thumb:** STI is fine for small, closely related types.
