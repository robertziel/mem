### Memento Pattern (Undo / Snapshot / Restore)

Capture an object's state so it can be restored later.

```ruby
class EditorMemento  # The snapshot
  attr_reader :content, :cursor_position

  def initialize(content, cursor_position)
    @content = content.dup
    @cursor_position = cursor_position
  end
end

class TextEditor
  attr_accessor :content, :cursor_position

  def initialize
    @content = ""
    @cursor_position = 0
  end

  def type(text)
    @content += text
    @cursor_position = @content.length
  end

  def save = EditorMemento.new(@content, @cursor_position)

  def restore(memento)
    @content = memento.content
    @cursor_position = memento.cursor_position
  end
end

class History
  def initialize = @stack = []
  def push(memento) = @stack.push(memento)
  def pop = @stack.pop
end

editor = TextEditor.new
history = History.new

editor.type("Hello ")
history.push(editor.save)

editor.type("World")
editor.content  # "Hello World"

editor.restore(history.pop)
editor.content  # "Hello "  (undone!)
```

**Rule of thumb:** Memento for undo/redo, transaction rollback, or checkpointing. Keep mementos lightweight (only changed state). The originator creates and restores from mementos. Common in: text editors, form wizards, game save states.
