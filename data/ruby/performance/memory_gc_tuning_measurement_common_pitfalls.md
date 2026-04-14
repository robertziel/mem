### Ruby Memory: GC Tuning, Measurement & Common Pitfalls

**GC tuning for batch processes:**
```ruby
# Ruby's GC is generational (young -> old generations)
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

**Measuring memory usage:**
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
  puts "Memory: #{before.round(1)}MB -> #{after.round(1)}MB (delta #{(after - before).round(1)}MB)"
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

**Common memory pitfalls:**
```ruby
# String concatenation in loops (creates new String each time)
result = ""
10_000.times { |i| result += "item #{i}\n" }  # O(n^2) memory

# Use StringIO or array join
parts = []
10_000.times { |i| parts << "item #{i}\n" }
result = parts.join

# Or StringIO for streaming output
require 'stringio'
io = StringIO.new
10_000.times { |i| io << "item #{i}\n" }
result = io.string

# Storing large results in instance variables
class DataProcessor
  def process
    @all_results = million_records.map { |r| transform(r) }  # stays in memory
  end
end

# Stream results, don't accumulate
class DataProcessor
  def process
    million_records.find_each do |record|
      result = transform(record)
      write_to_output(result)  # write and forget
    end
  end
end

# Memoizing large datasets
def all_users
  @all_users ||= User.all.to_a  # stays in memory forever
end

# Memoize counts or small lookups, not large datasets
def user_count
  @user_count ||= User.count
end
```

**Memory-efficient data structures:**
```ruby
# Set instead of Array for membership checks
require 'set'
valid_ids = Set.new(User.where(active: true).pluck(:id))
valid_ids.include?(some_id)  # O(1) vs Array O(n)

# For very large datasets, consider Redis or temporary files
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

**Rule of thumb:** Measure with `memory_profiler` before optimizing blindly. Avoid string concatenation in loops, accumulating results in instance variables, and memoizing large datasets. Use `Set` for membership checks, `Tempfile` for overflow storage. For batch jobs, tune GC environment variables and consider `GC.compact` between batches.
