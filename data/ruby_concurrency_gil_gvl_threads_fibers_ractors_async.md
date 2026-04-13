### Ruby Concurrency: GIL, Threads, Fibers & Ractors

**GIL/GVL (Global VM Lock):**
- MRI Ruby has a Global VM Lock (GVL, historically called GIL)
- Only one thread executes Ruby code at a time
- I/O operations release the GVL (threads CAN run in parallel for I/O)
- CPU-bound work: threads DON'T help (GVL blocks parallelism)

```
Thread A: [Ruby code]---[I/O wait]---[Ruby code]
Thread B:               [Ruby code]---[I/O wait]---[Ruby code]
GVL:      [A holds]---->[B holds]--->[A holds]---->[B holds]
```

**Threads (concurrent I/O):**
```ruby
# Good for I/O: HTTP requests, DB queries, file reads
threads = urls.map do |url|
  Thread.new { Net::HTTP.get(URI(url)) }
end
results = threads.map(&:value)  # wait for all, collect results

# Thread safety with Mutex
counter = 0
mutex = Mutex.new
threads = 10.times.map do
  Thread.new do
    1000.times do
      mutex.synchronize { counter += 1 }
    end
  end
end
threads.each(&:join)
```

**Fibers (cooperative concurrency):**
```ruby
# Fibers yield control explicitly (not preemptive)
fiber = Fiber.new do
  Fiber.yield "first"
  Fiber.yield "second"
  "third"
end

fiber.resume  # "first"
fiber.resume  # "second"
fiber.resume  # "third"

# Useful for: lazy sequences, coroutines, Enumerator internals
# Ruby's Enumerator uses Fibers internally
```

**Ractors (Ruby 3.0+, true parallelism):**
```ruby
# Ractors run in parallel (no GVL sharing)
# But: can't share mutable objects between Ractors
ractors = 4.times.map do |i|
  Ractor.new(i) do |n|
    # This runs in a separate thread with its own GVL
    (n * 1_000_000...(n + 1) * 1_000_000).sum
  end
end
results = ractors.map(&:take)  # collect results
```

**Ractor limitations:**
- Can't share mutable objects (must send/copy or use shareable frozen objects)
- Many gems are NOT Ractor-safe
- Still experimental in Ruby 3.x
- Good for: CPU-heavy isolated computations

**Async gem (modern I/O concurrency):**
```ruby
# Gemfile
gem 'async'

require 'async'
require 'async/http'

Async do
  # These run concurrently (single thread, fiber-based)
  urls.each do |url|
    Async do
      response = Async::HTTP::Client.new(url).get("/")
      puts response.status
    end
  end
end
```

**concurrent-ruby gem (production-ready primitives):**
```ruby
# Thread pool
pool = Concurrent::FixedThreadPool.new(10)
pool.post { expensive_task }

# Promises (like JS Promises)
future = Concurrent::Promises.future { expensive_computation }
future.value  # blocks until done

# Thread-safe data structures
map = Concurrent::Map.new
map[:key] = "value"  # thread-safe

# Atomic reference
counter = Concurrent::AtomicFixnum.new(0)
counter.increment  # thread-safe
```

**Puma's concurrency model:**
```
Puma Master Process
  ├── Worker 1 (process, separate GVL)
  │     ├── Thread 1
  │     ├── Thread 2
  │     └── Thread 3
  ├── Worker 2 (process, separate GVL)
  │     ├── Thread 1
  │     ├── Thread 2
  │     └── Thread 3
```
- Workers = processes (true parallelism, separate memory)
- Threads per worker = concurrent I/O within a process
- Typical: 2-4 workers, 5 threads each

**Choosing the right model:**
| Workload | Solution |
|----------|---------|
| I/O-bound (HTTP, DB) | Threads or Fibers (async) |
| CPU-bound | Multiple processes (Puma workers) or Ractors |
| Mixed | Puma workers (processes) with threads per worker |
| High concurrency I/O | Async gem (fiber-based, single thread) |

**Rule of thumb:** Ruby threads are useful for I/O concurrency (GVL released during I/O). For CPU parallelism, use multiple processes (Puma workers). Use `concurrent-ruby` for thread-safe primitives. Ractors are promising but experimental. Puma's worker + thread model handles most Rails workloads well.
