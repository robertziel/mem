### Ruby Fibers (Cooperative Concurrency)

**What Fibers are:**
- Lightweight cooperative multitasking within a single thread
- Voluntarily yield control (not preemptive like threads)
- Extremely lightweight (thousands per thread)
- Ruby's Enumerator uses Fibers internally

```ruby
fiber = Fiber.new do
  Fiber.yield "first"
  Fiber.yield "second"
  "third"
end

fiber.resume  # "first"
fiber.resume  # "second"
fiber.resume  # "third"
```

**Async gem (fiber-based I/O):**
```ruby
require 'async'

Async do
  urls.each do |url|
    Async do
      response = Async::HTTP::Client.new(url).get("/")
      puts response.status
    end
  end
end
# All requests run concurrently on one thread (fiber-based)
```

**Rule of thumb:** Fibers for lazy sequences and async I/O (via the `async` gem). No parallelism (single thread), but excellent concurrency for I/O-bound workloads. The `async` gem is the modern way to handle high-concurrency I/O in Ruby.
