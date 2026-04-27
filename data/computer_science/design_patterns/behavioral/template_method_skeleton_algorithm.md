### Template Method Pattern (Skeleton Algorithm)

Define algorithm skeleton in base class, let subclasses override specific steps.

```ruby
class BaseImporter
  def import(file)
    data = parse(file)
    validated = validate(data)
    save(validated)
  end

  def validate(data) = data  # default: no validation
  def save(data) = data.each { |row| Record.create!(row) }
end

class CsvImporter < BaseImporter
  def parse(file) = CSV.read(file, headers: true).map(&:to_h)
end

class JsonImporter < BaseImporter
  def parse(file) = JSON.parse(File.read(file))
  def validate(data) = data.select { |row| row['email'].present? }
end
```

**Rule of thumb:** Template Method when subclasses share structure but differ in details. The base class defines the flow, subclasses customize steps. Common in Rails: `ApplicationController`, `ApplicationRecord`.
