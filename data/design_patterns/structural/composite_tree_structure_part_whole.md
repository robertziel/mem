### Composite Pattern (Tree Structure / Part-Whole)

Treat individual objects and groups of objects uniformly.

```ruby
# Component interface
class FileSystemItem
  attr_reader :name
  def initialize(name) = @name = name
  def size = raise NotImplementedError
  def display(indent = 0) = raise NotImplementedError
end

# Leaf
class File < FileSystemItem
  def initialize(name, size)
    super(name)
    @size = size
  end
  def size = @size
  def display(indent = 0) = puts "#{"  " * indent}📄 #{name} (#{size}KB)"
end

# Composite
class Directory < FileSystemItem
  def initialize(name)
    super(name)
    @children = []
  end

  def add(item) = @children << item
  def size = @children.sum(&:size)  # delegates to children

  def display(indent = 0)
    puts "#{"  " * indent}📁 #{name} (#{size}KB)"
    @children.each { |c| c.display(indent + 1) }
  end
end

root = Directory.new("src")
root.add(File.new("app.rb", 10))
models = Directory.new("models")
models.add(File.new("user.rb", 5))
models.add(File.new("post.rb", 3))
root.add(models)
root.display
root.size  # 18 (recursively sums all files)
```

**Rule of thumb:** Composite for tree hierarchies where you treat leaves and branches the same way. Common in: file systems, UI component trees, org charts, menu structures, price calculators (item + bundle).
