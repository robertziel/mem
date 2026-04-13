### Identity Map Pattern (Avoid Duplicate Objects)

Ensure each database row is loaded only once per transaction — return the same object for the same ID.

```ruby
class IdentityMap
  def initialize
    @map = {}  # { "User:1" => <User id=1>, "User:2" => <User id=2> }
  end

  def get(klass, id)
    @map["#{klass}:#{id}"]
  end

  def put(klass, id, object)
    @map["#{klass}:#{id}"] = object
  end

  def has?(klass, id)
    @map.key?("#{klass}:#{id}")
  end
end

# Without Identity Map:
user_a = User.find(1)  # SQL query
user_b = User.find(1)  # ANOTHER SQL query (same row!)
user_a.equal?(user_b)  # false (different Ruby objects!)

# With Identity Map:
user_a = identity_map.get(User, 1) || User.find(1).tap { |u| identity_map.put(User, 1, u) }
user_b = identity_map.get(User, 1)  # returns cached object, no SQL
user_a.equal?(user_b)  # true (same object!)
```

**In Rails:** ActiveRecord had an Identity Map but it was removed (too many edge cases). `inverse_of` on associations achieves similar effect within a loaded association graph.

**Rule of thumb:** Identity Map prevents duplicate SQL queries and ensures object identity consistency within a request. Most ORMs handle this partially. In Rails, rely on `includes` + `inverse_of` rather than a manual Identity Map.
