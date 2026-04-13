### Profiling Ruby & Rails Applications

**rack-mini-profiler (request-level profiling in dev):**
```ruby
# Gemfile
gem "rack-mini-profiler"
gem "memory_profiler"  # enables memory button
gem "stackprof"        # enables flamegraph button

# Shows a speed badge on every page with:
# - Total request time
# - SQL query count and time
# - Memory allocation (if memory_profiler loaded)

# Append to any URL:
# ?pp=flamegraph        -- flame graph for that request
# ?pp=profile-memory    -- memory allocation report
# ?pp=profile-gc        -- GC stats
# ?pp=analyze-memory    -- object space dump
# ?pp=help              -- list all options

# Enable in production (for admin only):
# config/initializers/rack_mini_profiler.rb
if Rails.env.production?
  Rack::MiniProfiler.config.authorize_cb = lambda { |env|
    current_user(env)&.admin?
  }
end
```

**stackprof (CPU profiling):**
```ruby
# Gemfile
gem "stackprof"

# Profile a block of code
profile = StackProf.run(mode: :cpu, interval: 1000) do
  # code to profile
  100.times { User.where(active: true).includes(:posts).to_a }
end

# Save and analyze
StackProf::Report.new(profile).print_text
# Output:
# ==================================
#   Mode: cpu(1000)
#   Samples: 1234 (0.00% miss rate)
#   GC: 56 (4.54%)
# ==================================
#   TOTAL    (pct)     SAMPLES  (pct)     FRAME
#     634  (51.4%)         312  (25.3%)   ActiveRecord::Result#each
#     289  (23.4%)         289  (23.4%)   PG::Connection#async_exec

# Dump to file for flamegraph
StackProf.run(mode: :cpu, out: "tmp/stackprof.dump") do
  expensive_operation
end

# Generate flamegraph
$ stackprof --d3-flamegraph tmp/stackprof.dump > tmp/flamegraph.html
# Open in browser for interactive visualization
```

**memory_profiler (allocation profiling):**
```ruby
# Gemfile
gem "memory_profiler"

report = MemoryProfiler.report do
  100.times { JSON.parse('{"key": "value"}') }
end

report.pretty_print
# Output shows:
# Total allocated: 15200 bytes (200 objects)
# Total retained:  0 bytes (0 objects)
#
# allocated memory by gem
# allocated memory by file
# allocated memory by location
# allocated memory by class
# allocated objects by class

# Useful for finding memory leaks:
report = MemoryProfiler.report do
  MyService.new.process(large_dataset)
end
report.pretty_print(to_file: "tmp/memory_report.txt")
```

**benchmark-ips (compare implementations):**
```ruby
# Gemfile
gem "benchmark-ips"

require "benchmark/ips"

Benchmark.ips do |x|
  x.config(time: 5, warmup: 2)

  array = (1..1000).to_a

  x.report("select + first") { array.select { |i| i > 500 }.first }
  x.report("detect")         { array.detect { |i| i > 500 } }
  x.report("find")           { array.find { |i| i > 500 } }

  x.compare!
end

# Output:
# Comparison:
#   detect:          5432100.0 i/s
#   find:            5430000.0 i/s - same-ish
#   select + first:   234500.0 i/s - 23.16x slower
```

**Ruby's built-in Benchmark:**
```ruby
require "benchmark"

Benchmark.bm(15) do |x|
  x.report("array sort:")  { 1000.times { (1..1000).to_a.shuffle.sort } }
  x.report("array sort_by:") { 1000.times { (1..1000).to_a.shuffle.sort_by { |i| i } } }
end

# Measure a single block
time = Benchmark.measure { heavy_operation }
puts time  # => 0.120000   0.010000   0.130000 (  0.128456)
#              user         system     total       real
```

**derailed_benchmarks (boot time and memory):**
```ruby
# Gemfile
gem "derailed_benchmarks", group: :development

# Measure boot time and memory per gem
$ bundle exec derailed bundle:mem
# TOP: 54.3 MB
#   bootsnap: 2.1 MB
#   railties: 8.5 MB
#   activerecord: 12.3 MB
#   ...

# Measure objects allocated during boot
$ bundle exec derailed bundle:objects

# Profile a specific endpoint
$ PATH_TO_HIT=/api/users bundle exec derailed exec perf:mem
$ PATH_TO_HIT=/api/users bundle exec derailed exec perf:ips
```

**Flame graphs (visualizing CPU time):**
```ruby
# With stackprof (generate standalone HTML)
StackProf.run(mode: :cpu, raw: true, out: "tmp/stackprof.dump") do
  expensive_operation
end
$ stackprof --d3-flamegraph tmp/stackprof.dump > tmp/flame.html

# With rack-mini-profiler (per-request, in browser)
# Visit any page with ?pp=flamegraph

# Reading a flame graph:
# - X axis = proportion of total time (wider = more time)
# - Y axis = call stack depth (bottom = entry point, top = leaf)
# - Look for wide plateaus (hot spots)
# - Ignore narrow towers (deep but fast calls)
```

**Identifying bottlenecks workflow:**
| Step | Tool | What to look for |
|------|------|-----------------|
| 1. Request overview | rack-mini-profiler | Slow SQL, high request time |
| 2. N+1 queries | Bullet gem | Missing includes/eager loading |
| 3. CPU hotspots | stackprof + flamegraph | Wide bars in flame graph |
| 4. Memory bloat | memory_profiler | High retained objects |
| 5. Boot time | derailed_benchmarks | Heavy gems at startup |
| 6. Compare fixes | benchmark-ips | Before/after iterations/sec |

**Quick profiling in production:**
```ruby
# One-off profiling with stackprof in a controller
class DiagnosticsController < ApplicationController
  def profile_endpoint
    profile = StackProf.run(mode: :cpu, interval: 100) do
      # simulate the work you want to profile
      User.includes(:posts, :comments).where(active: true).to_a
    end
    render json: StackProf::Report.new(profile).data
  end
end
```

**Common performance fixes:**
```ruby
# 1. N+1 queries (most common)
User.includes(:posts).where(active: true)  # eager load

# 2. Missing database indexes
add_index :orders, :user_id  # if querying by user_id

# 3. Unnecessary object allocation
# Bad: creates intermediate arrays
users.map(&:email).select { |e| e.present? }
# Better: single pass
users.filter_map { |u| u.email.presence }

# 4. Caching expensive computations
Rails.cache.fetch("stats", expires_in: 5.minutes) { compute_stats }
```

**Rule of thumb:** Start with rack-mini-profiler to find slow requests. Use stackprof with flame graphs to pinpoint CPU bottlenecks. Use memory_profiler when you suspect memory bloat or leaks. Use benchmark-ips to compare alternative implementations. Use derailed_benchmarks to audit gem memory overhead. Profile in a production-like environment with realistic data volumes for accurate results.
