### Ruby Memory: Streaming File Processing & ActiveRecord Optimization

**Streaming JSON with oj:**
```ruby
# Read entire file into memory — bad
data = File.read("1gb_file.json")       # 1GB+ in memory
parsed = JSON.parse(data)               # another 1GB+ for parsed objects

# Stream large JSON array with oj
require 'oj'

File.open("huge_array.json") do |f|
  Oj.load(f, mode: :strict) do |item|
    process(item)  # yields each top-level element
  end
end
```

**Streaming CSV:**
```ruby
# Stream CSV without loading all rows
require 'csv'
CSV.foreach("huge.csv", headers: true) do |row|
  process(row)  # one row at a time
end
```

**Streaming XML with SAX parser:**
```ruby
require 'nokogiri'
class MyHandler < Nokogiri::XML::SAX::Document
  def start_element(name, attrs = [])
    @current = name
  end

  def characters(string)
    process(string) if @current == "email"
  end
end

parser = Nokogiri::XML::SAX::Parser.new(MyHandler.new)
parser.parse(File.open("huge.xml"))  # constant memory
```

**Reduce ActiveRecord memory usage:**
```ruby
# Loading full AR objects (each has ~1KB overhead)
User.all.each { |u| puts u.email }  # 1M users = ~1GB just for objects

# pluck — returns raw arrays (no AR objects)
User.where(active: true).pluck(:id, :email).each do |id, email|
  process(id, email)
end

# select — load only needed columns
User.select(:id, :email).find_each { |u| process(u.id, u.email) }

# Raw SQL for maximum efficiency
results = ActiveRecord::Base.connection.exec_query(
  "SELECT id, email FROM users WHERE active = true"
)
results.rows.each { |id, email| process(id, email) }

# MySQL streaming results (constant memory)
client = Mysql2::Client.new(database_url)
client.query("SELECT id, email FROM users", stream: true, cache_rows: false).each do |row|
  process(row["id"], row["email"])
end
```

**Rule of thumb:** Never read entire files into memory — use `CSV.foreach`, `Oj.load` with a block, or SAX parsers for streaming. For ActiveRecord, use `pluck` over `select`, `select` over `all`. Use `find_each` for batching. For maximum efficiency, drop to raw SQL or MySQL streaming. The biggest memory win is not loading data you don't need.
