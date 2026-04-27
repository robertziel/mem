### Ruby Ractors (True Parallelism, Ruby 3.0+)

**What Ractors are:**
- Run in parallel (each has its own GVL)
- Can't share mutable objects between Ractors
- Communicate by sending/copying messages

```ruby
ractors = 4.times.map do |i|
  Ractor.new(i) do |n|
    # Runs in a separate thread with its own GVL
    (n * 1_000_000...(n + 1) * 1_000_000).sum
  end
end
results = ractors.map(&:take)  # collect results from each Ractor
```

**Limitations:**
- Can't share mutable objects (must send/copy or use shareable frozen objects)
- Many gems are NOT Ractor-safe
- Still experimental in Ruby 3.x
- Good for: CPU-heavy isolated computations

**Ractor vs Thread vs Process:**
| Feature | Ractor | Thread | Process |
|---------|--------|--------|---------|
| Parallel CPU | Yes | No (GVL) | Yes |
| Shared memory | No (message passing) | Yes | No |
| Maturity | Experimental | Stable | Stable |

**Rule of thumb:** Ractors are promising for CPU parallelism but still experimental. For production, use multiple processes (Puma workers) for parallelism. Watch Ractors evolve in future Ruby versions.
