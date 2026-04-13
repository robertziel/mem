### Prototype Pattern (Clone / Copy)

Create new objects by copying existing ones instead of constructing from scratch.

```ruby
class Report
  attr_accessor :title, :headers, :formatting

  def initialize(title:, headers:, formatting:)
    @title = title
    @headers = headers.dup
    @formatting = formatting.dup
  end

  def clone
    Report.new(title: title, headers: headers.dup, formatting: formatting.dup)
  end
end

# Template report
template = Report.new(title: "Monthly", headers: ["Date", "Revenue"], formatting: { font: "Arial" })

# Clone and customize (cheaper than building from scratch)
jan_report = template.clone
jan_report.title = "January Report"

feb_report = template.clone
feb_report.title = "February Report"
```

**Ruby's built-in:** `dup` (shallow copy) and `clone` (shallow + frozen state).

**Deep copy in Ruby:**
```ruby
deep_copy = Marshal.load(Marshal.dump(original))
```

**Rule of thumb:** Prototype when object creation is expensive and you have a "template" to copy from. In Ruby, `dup`/`clone` is built-in. Use `Marshal.dump/load` for deep copies. Common use: configuration templates, document templates, game entity spawning.
