### ActiveSupport: HashWithIndifferentAccess

```ruby
# Access hash with either string or symbol keys
hash = ActiveSupport::HashWithIndifferentAccess.new
hash[:name] = "Alice"
hash["name"]    # "Alice"
hash[:name]     # "Alice"

# Convert a regular hash
regular = { "name" => "Alice", "age" => 30 }
indifferent = regular.with_indifferent_access
indifferent[:name]    # "Alice"
indifferent["name"]   # "Alice"

# Rails params are already HashWithIndifferentAccess
params[:user]         # same as params["user"]

# Related methods:
{ "a" => 1, "b" => 2 }.symbolize_keys   # { a: 1, b: 2 }
{ a: 1, b: 2 }.stringify_keys           # { "a" => 1, "b" => 2 }
{ a: { b: 1 } }.deep_symbolize_keys     # recursive
```

**Rule of thumb:** Rails params use HashWithIndifferentAccess — that's why `params[:name]` and `params["name"]` both work. Use `symbolize_keys` when interfacing with APIs that return string-keyed hashes. Use `deep_symbolize_keys` for nested hashes.
