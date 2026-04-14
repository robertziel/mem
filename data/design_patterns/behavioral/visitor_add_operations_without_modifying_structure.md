### Visitor Pattern (Add Operations Without Modifying Structure)

Define new operations on an object structure without changing the classes.

```ruby
# Elements accept visitors
class Circle
  attr_reader :radius
  def initialize(radius) = @radius = radius
  def accept(visitor) = visitor.visit_circle(self)
end

class Rectangle
  attr_reader :width, :height
  def initialize(width, height) = @width = width; @height = height
  def accept(visitor) = visitor.visit_rectangle(self)
end

# Visitors define operations
class AreaCalculator
  def visit_circle(circle) = Math::PI * circle.radius ** 2
  def visit_rectangle(rect) = rect.width * rect.height
end

class PerimeterCalculator
  def visit_circle(circle) = 2 * Math::PI * circle.radius
  def visit_rectangle(rect) = 2 * (rect.width + rect.height)
end

shapes = [Circle.new(5), Rectangle.new(4, 6)]
area_calc = AreaCalculator.new
shapes.each { |s| puts s.accept(area_calc) }
# Add new operations (PerimeterCalculator) without changing Circle/Rectangle
```

**Rule of thumb:** Visitor when you need many unrelated operations on a stable structure and want to add operations without modifying the element classes. Rare in Ruby (duck typing and open classes make it less necessary). Common in: compilers (AST traversal), serializers, report generators.
