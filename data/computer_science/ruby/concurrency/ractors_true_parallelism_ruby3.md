### Ruby Ractors — True Parallelism (Ruby 3.0+)

**Definition:** **Ractors** (Ruby Actors) bring **true parallel CPU execution** to MRI Ruby. Each Ractor has **its own GVL** so multiple Ractors run on multiple cores. Communication is **message-passing** between isolated heaps — no shared mutable state. Still **experimental** as of Ruby 3.x.

**Why Ractors exist — the GVL elephant:**

| Property | MRI Threads | Ractors |
|---|---|---|
| Parallel CPU execution | **No** (GVL serializes Ruby code) | **Yes** (each Ractor has own GVL) |
| Memory sharing | Shared heap | **Isolated heap** |
| Communication | Direct (with locks) | **Messages** (`send` / `receive`) |
| Spawn cost | ~ms | ~ms |
| Mature? | Yes | **Experimental** |
| Gem compatibility | Universal | Many gems unsafe |

**Basic Ractor:**

```ruby
ractors = 4.times.map do |i|
  Ractor.new(i) do |n|
    # Runs in parallel with own GVL
    (n * 1_000_000...(n + 1) * 1_000_000).sum
  end
end

results = ractors.map(&:take)
# Computes 4 sums truly in parallel
```

| Property | Detail |
|---|---|
| `Ractor.new(args) { ... }` | Spawn |
| `Ractor#take` | Wait for and get result |
| `Ractor.yield(value)` | Send to caller |
| `Ractor.receive` | Block waiting for incoming message |

**Message passing — `send` vs `take` vs `yield`:**

```ruby
# Push pattern
producer = Ractor.new do
  Ractor.yield "first"
  Ractor.yield "second"
end
producer.take   # "first"
producer.take   # "second"

# Pull pattern (mailbox)
worker = Ractor.new do
  loop do
    msg = Ractor.receive
    puts "got #{msg}"
  end
end
worker.send "hello"
worker.send "world"
```

| API | Direction |
|---|---|
| `Ractor.new { ... }` | Create |
| `r.send(msg)` | Push to ractor's mailbox |
| `Ractor.receive` (inside ractor) | Pull from own mailbox |
| `Ractor.yield(val)` (inside ractor) | Push to outer / caller |
| `r.take` | Pull from ractor's outer channel |

**The isolation rule — what you can/can't share:**

| Object | Shareable? |
|---|---|
| `Integer`, `Symbol`, `nil`, `true`, `false` | ✅ (immutable) |
| `String` (frozen) | ✅ |
| `Array` / `Hash` (frozen + all elements shareable) | ✅ |
| Mutable `String` / `Array` / `Hash` | ❌ |
| Class instances (mutable) | ❌ |
| Class objects | ✅ (but methods restricted) |
| Module objects | ✅ |
| `Ractor.make_shareable(obj)` | Recursively freeze if possible |

> **`Ractor.make_shareable(obj)`** deep-freezes an object so it can be shared by reference.

**Communication overhead — copies or moves:**

| Operation | Behavior |
|---|---|
| Share immutable / frozen object | Reference (cheap) |
| Send mutable object | **Copy** (deep marshal) |
| `r.send(obj, move: true)` | **Move** (sender loses access) |
| Big payloads via send | Expensive — keep messages small |

**Limitations and gotchas:**

| Limitation | Detail |
|---|---|
| Many gems are NOT Ractor-safe | Use of global / class state breaks |
| Class variables disallowed | Even reading often errors |
| `require` partly restricted | Bootstrapping main code only |
| Constants can't be reassigned | Frozen at first use |
| Threads inside a Ractor | Allowed but with own constraints |
| Status | **Experimental** — API and stability evolving |

**Ractor vs Thread vs Process:**

| Property | Ractor | Thread | Process (fork) |
|---|---|---|---|
| Parallel CPU | **Yes** | No (GVL) | Yes |
| Memory | Isolated | Shared | Isolated |
| Communication | Messages | Direct + locks | IPC |
| Crash isolation | Per-ractor | Whole process | Per-process |
| Spawn cost | ms | µs–ms | ms |
| Maturity | Experimental | Stable | Stable |
| Gem support | Limited | Universal | Universal |

**When Ractors fit (today):**

| Use case | Detail |
|---|---|
| CPU-bound parallel computation | Numerical / data processing |
| Embarrassingly parallel work | Map / reduce style |
| Isolated workers with limited deps | No shared mutable state needed |
| Experimental / prototyping | Pre-production exploration |

**When Ractors don't fit (today):**

| Reason | Detail |
|---|---|
| Need full Rails / common gems | Most aren't Ractor-safe |
| Heavy shared state | Message overhead |
| Stable production semantics | Still experimental |
| Web request handling | Use Puma's process+thread model |

**Production alternatives for parallelism:**

| Approach | Detail |
|---|---|
| **Multiple processes** (Puma cluster) | Most common for web apps |
| **Sidekiq workers** with concurrency | Job parallelism |
| **`Process.fork`** | Manual process pool |
| **JRuby** / **TruffleRuby** | No GVL, threads parallelize |
| **Ractors** | When mature |
| **External services** (in another language) | Polyglot solution |

**Code patterns:**

**Worker pool:**

```ruby
def work_pool(n_workers, &block)
  workers = n_workers.times.map do
    Ractor.new(&block)
  end
  yield workers
  workers.each(&:close_outgoing)
end

work_pool(4) { |w| ... }
```

**Map-reduce:**

```ruby
inputs = (1..100).to_a
chunk_size = 25

partial_sums = inputs.each_slice(chunk_size).map do |chunk|
  Ractor.new(chunk) { |c| c.sum }
end.map(&:take)

total = partial_sums.sum
```

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Trying to use class variables | Errors at runtime |
| Sharing a non-frozen object | `Ractor::IsolationError` |
| Heavy message passing (big payloads) | Marshal cost dominates |
| Calling unsafe gem methods | Crashes / data races |
| Treating Ractors as Threads | Different semantics |
| Putting Ractors in production today | Many edge cases |
| Ignoring `Ractor.make_shareable` | Constant frustration |
| Ractor that uses global state | Errors |

**Decision matrix:**

| Need | Pick |
|---|---|
| Web app concurrency | **Process + thread** (Puma cluster) |
| CPU-heavy parallel batch | **Process pool** or Ractor (carefully) |
| Massive I/O fan-out | **Fibers + reactor** (Async, Falcon) |
| Replace MRI for true threading | **JRuby / TruffleRuby** |
| Production-ready true parallelism today | **Processes** (the safe answer) |
| Future-facing experimentation | Ractors (watch maturity) |

**Cross-references:**

- Ruby GVL deep dive: [gvl_*.md](../core/gvl_global_vm_lock_threads_ractors.md)
- Threads vs workers vs processes: [concurrency_threads_*.md](../../os_cs_fundamentals/concurrency_threads_workers_processes.md)
- BEAM lightweight processes (Erlang/Elixir): [concurrency_io_*.md](../../os_cs_fundamentals/concurrency_io_blocking_beam_processes.md)
- Sidekiq + threading: [sidekiq_*.md](../rails/jobs/sidekiq_active_job_threading.md)

**Rule of thumb:** **Ractors enable true parallel CPU in MRI Ruby** — each has its own GVL — but they're **experimental** in Ruby 3.x and most gems aren't Ractor-safe. **For production today**, use **multiple Puma workers (processes)** for parallelism. Ractors are promising for **CPU-bound, isolated batch work** where you control all the dependencies. Watch them mature in future Ruby versions.
