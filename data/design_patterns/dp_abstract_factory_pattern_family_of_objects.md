### Abstract Factory Pattern (Family of Related Objects)

Create families of related objects without specifying concrete classes.

```ruby
# Abstract factory for UI components
class MaterialUIFactory
  def create_button = MaterialButton.new
  def create_input = MaterialInput.new
  def create_modal = MaterialModal.new
end

class BootstrapUIFactory
  def create_button = BootstrapButton.new
  def create_input = BootstrapInput.new
  def create_modal = BootstrapModal.new
end

# Client code works with any factory
class FormRenderer
  def initialize(ui_factory)
    @factory = ui_factory
  end

  def render
    button = @factory.create_button
    input = @factory.create_input
    # ... uses consistent family of components
  end
end

FormRenderer.new(MaterialUIFactory.new).render
```

**Factory Method vs Abstract Factory:**
- Factory Method: one product, subclass decides which
- Abstract Factory: family of related products, swap entire family

**Rule of thumb:** Abstract Factory when you need consistent families of objects (UI themes, database drivers, cross-platform components). Rare in Ruby — more common in Java/C#. In Ruby, usually solved with dependency injection or configuration.
