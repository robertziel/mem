### Ruby Memory Optimization for Large Datasets (Streaming, Lazy Enumerators, GC Tuning)

**Problem:** Ruby's GC and object model can struggle with large datasets. Default patterns create millions of intermediate objects that bloat memory.

**1. Avoid creating unnecessary objects:**
```ruby
# ❌ Each iteration creates new String objects
users.each { |u| u.status == "active" }  # "active" is a new String each time

# ✅ Freeze strings or use symbols
ACTIVE = "active".freeze
users.each { |u| u.status == ACTIVE }

# ✅ Use frozen_string_literal pragma (freeze ALL string literals in file)
# frozen_string_literal: true

# ❌ map creates a full intermediate array
result = large_array.map { |x| transform(x) }.select { |x| x > 10 }.first(5)
# Creates: full mapped array + full filtered array, just to get 5 items

# ✅ Lazy enumerator — processes elements one at a time
result = large_array.lazy.map { |x| transform(x) }.select { |x| x > 10 }.first(5)
# Stops after finding 5 matches — no intermediate arrays
```

**2. Lazy enumerators for large collections:**
```ruby
# Lazy evaluation — chain operations without intermediate arrays
(1..Float::INFINITY).lazy
  .select { |n| n.odd? }
  .map { |n| n ** 2 }
  .first(10)
# => [1, 9, 25, 49, 81, 121, 169, 225, 289, 361]
# Never materializes the infinite range

# Process large file lazily
File.open("huge_file.csv").each_line.lazy
  .map { |line| line.strip.split(",") }
  .select { |fields| fields[2] == "active" }
  .map { |fields| { name: fields[0], email: fields[1] } }
  .each_slice(1000) { |batch| process_batch(batch) }

# Enumerator for custom lazy iteration
def each_record(file_path)
  Enumerator.new do |yielder|
    File.open(file_path) do |f|
      f.each_line { |line| yielder << parse_line(line) }
    end
  end.lazy
end

each_record("data.csv").select { |r| r[:active] }.each { |r| process(r) }
```

**3. Streaming file processing:**
```ruby
# ❌ Read entire file into memory
data = File.read("1gb_file.json")       # 1GB+ in memory
parsed = JSON.parse(data)               # another 1GB+ for parsed objects

# ✅ Stream JSON with oj or yajl
require 'oj'

# Stream large JSON array
File.open("huge_array.json") do |f|
  Oj.load(f, mode: :strict) do |item|
    process(item)  # yields each top-level element
  end
end

# ✅ Stream CSV without loading all rows
require 'csv'
CSV.foreach("huge.csv", headers: true) do |row|
  process(row)  # one row at a time
end

# ✅ Stream XML with SAX parser (for large XML)
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

**4. Reduce ActiveRecord memory usage:**
```ruby
# ❌ Loading full AR objects (each has ~1KB overhead)
User.all.each { |u| puts u.email }  # 1M users = ~1GB just for objects

# ✅ pluck — returns raw arrays (no AR objects)
User.where(active: true).pluck(:id, :email).each do |id, email|
  process(id, email)
end

# ✅ select — load only needed columns
User.select(:id, :email).find_each { |u| process(u.id, u.email) }

# ✅ Raw SQL for maximum efficiency
results = ActiveRecord::Base.connection.exec_query(
  "SELECT id, email FROM users WHERE active = true"
)
results.rows.each { |id, email| process(id, email) }

# ✅ MySQL streaming results (constant memory)
client = Mysql2::Client.new(database_url)
client.query("SELECT id, email FROM users", stream: true, cache_rows: false).each do |row|
  process(row["id"], row["email"])
end
```

**5. GC tuning for batch processes:**
```ruby
# Ruby's GC is generational (young → old generations)
# For batch processes, tune GC to reduce pause frequency

# Environment variables for GC tuning:
# RUBY_GC_HEAP_INIT_SLOTS=600000          # initial heap slots (reduce early GCs)
# RUBY_GC_HEAP_FREE_SLOTS_MIN_RATIO=0.20  # trigger GC when < 20% free
# RUBY_GC_HEAP_FREE_SLOTS_MAX_RATIO=0.40  # stop growing heap at 40% free
# RUBY_GC_HEAP_GROWTH_FACTOR=1.25         # grow heap by 25% (default 1.8)
# RUBY_GC_MALLOC_LIMIT=64000000           # 64MB before triggering GC
# RUBY_GC_OLDMALLOC_LIMIT=128000000       # 128MB for old gen

# Disable GC during critical sections (use carefully)
GC.disable
# ... process batch ...
GC.enable
GC.start  # force collection

# Compact memory (Ruby 2.7+)
GC.compact  # reduces memory fragmentation

# Monitor GC stats
puts GC.stat
# :count          — total GC runs
# :heap_live_slots — current live objects
# :total_allocated_objects — lifetime total (watch for excessive allocation)
```

**6. Measure memory usage:**
```ruby
# Get current process memory (RSS)
def memory_mb
  `ps -o rss= -p #{Process.pid}`.to_i / 1024.0
end

# Track memory around a block
def measure_memory
  before = memory_mb
  result = yield
  after = memory_mb
  puts "Memory: #{before.round(1)}MB → #{after.round(1)}MB (Δ #{(after - before).round(1)}MB)"
  result
end

measure_memory do
  User.where(active: true).pluck(:email)
end

# Using memory_profiler gem for detailed analysis
require 'memory_profiler'

report = MemoryProfiler.report do
  # code to profile
  User.where(active: true).limit(1000).to_a
end

report.pretty_print
# Shows: total allocated memory, allocated objects by gem/file/class
# Helps identify which code allocates the most

# Using objspace for live object inspection
require 'objspace'
ObjectSpace.count_objects  # { TOTAL: ..., T_STRING: ..., T_ARRAY: ..., ... }
```

**7. Common memory pitfalls:**
```ruby
# ❌ String concatenation in loops (creates new String each time)
result = ""
10_000.times { |i| result += "item #{i}\n" }  # O(n²) memory

# ✅ Use StringIO or array join
parts = []
10_000.times { |i| parts << "item #{i}\n" }
result = parts.join

# ✅ Or StringIO for streaming output
require 'stringio'
io = StringIO.new
10_000.times { |i| io << "item #{i}\n" }
result = io.string

# ❌ Storing large results in instance variables
class DataProcessor
  def process
    @all_results = million_records.map { |r| transform(r) }  # stays in memory
  end
end

# ✅ Stream results, don't accumulate
class DataProcessor
  def process
    million_records.find_each do |record|
      result = transform(record)
      write_to_output(result)  # write and forget
    end
  end
end

# ❌ Symbol creation from user input (symbols are never GC'd before Ruby 2.2)
# Ruby 2.2+ dynamic symbols ARE GC'd, but still prefer strings for user input
params[:key].to_sym  # fine in modern Ruby, but be aware

# ❌ Memoizing large datasets
def all_users
  @all_users ||= User.all.to_a  # stays in memory forever
end

# ✅ Memoize counts or small lookups, not large datasets
def user_count
  @user_count ||= User.count
end
```

**8. Memory-efficient data structures:**
```ruby
# For millions of simple values, consider alternatives to Hash/Array

# Set instead of Array for membership checks
require 'set'
valid_ids = Set.new(User.where(active: true).pluck(:id))
valid_ids.include?(some_id)  # O(1) vs Array O(n)

# SortedSet for ordered unique elements
require 'sorted_set'

# For very large datasets, consider Redis or temporary files
# instead of in-memory collections
require 'tempfile'
Tempfile.create('batch') do |f|
  User.where(active: true).pluck(:id).each { |id| f.puts(id) }
  f.rewind
  f.each_line { |line| process(line.strip.to_i) }
end
```

**Memory checklist for batch jobs:**
```
1. Never load all records at once — use find_each or streaming
2. Use pluck instead of loading AR objects when possible
3. Process and discard — don't accumulate results in arrays
4. Stream file I/O — CSV.foreach, not CSV.read
5. Measure memory before and after with ps or memory_profiler
6. Tune GC for batch workloads (increase malloc limits)
7. Use lazy enumerators to avoid intermediate arrays
8. Watch for string concatenation in loops
```

**Rule of thumb:** The biggest memory win is not loading data you don't need. Use `pluck` over `select`, `select` over `all`. Stream everything: files, DB results, API responses. Never accumulate results — process and discard. Measure with `memory_profiler` before optimizing blindly. For batch jobs, tune GC environment variables and consider `GC.compact` between batches.
