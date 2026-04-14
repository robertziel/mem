### Flyweight Pattern (Shared Instances for Memory Efficiency)

Reduce memory by sharing common object data across many instances.

```ruby
# Without flyweight: 10,000 trees, each storing full texture data
# With flyweight: share texture data, each tree stores only position

class TreeType  # Flyweight (shared, immutable)
  attr_reader :name, :color, :texture

  def initialize(name, color, texture)
    @name = name
    @color = color
    @texture = texture  # large data, shared across trees
  end
end

class TreeFactory
  @@types = {}

  def self.get_tree_type(name, color, texture)
    key = "#{name}_#{color}"
    @@types[key] ||= TreeType.new(name, color, texture)
  end
end

class Tree  # Context (unique per instance)
  def initialize(x, y, type)
    @x = x
    @y = y
    @type = type  # reference to shared flyweight
  end
end

# 10,000 trees but only ~5 TreeType objects in memory
oak = TreeFactory.get_tree_type("Oak", "green", large_texture_data)
Tree.new(10, 20, oak)
Tree.new(30, 40, oak)  # same TreeType object reused
```

**Ruby examples:** Symbols are flyweights (`:hello` is always the same object). String interning. Frozen string literals.

**Rule of thumb:** Flyweight when you have thousands of similar objects sharing common data. Separate intrinsic state (shared) from extrinsic state (unique). In practice, Ruby's symbols and frozen strings are the most common flyweight usage.
