### Ruby Threads & Mutex

**Threads for concurrent I/O:**
```ruby
# Good for: HTTP requests, DB queries, file reads in parallel
threads = urls.map do |url|
  Thread.new { Net::HTTP.get(URI(url)) }
end
results = threads.map(&:value)  # wait for all, collect results
```

**Thread safety with Mutex:**
```ruby
counter = 0
mutex = Mutex.new

threads = 10.times.map do
  Thread.new do
    1000.times do
      mutex.synchronize { counter += 1 }  # only one thread at a time
    end
  end
end
threads.each(&:join)
puts counter  # 10000 (correct, no race condition)
```

**Rule of thumb:** Use threads for I/O parallelism (HTTP, DB, file). Always use Mutex for shared mutable state. Prefer `concurrent-ruby` gem for production-ready thread-safe primitives (Concurrent::Map, Concurrent::AtomicFixnum).
