### Concurrency — I/O Blocking & the BEAM Model

**Definition:** **concurrency** lets a program make progress on multiple tasks while some are waiting (I/O). The trick is **scheduling**: cooperative (Fibers, Async), preemptive (OS threads), or VM-managed (Erlang BEAM lightweight processes). Concurrency hides wait time — it doesn't speed up CPU work.

**The fundamental insight:**

```
Without concurrency:               With concurrency:
                                   
Task A ──[CPU]──[wait I/O]──[CPU]   Task A ──[CPU]──[wait]──[CPU]
                                          Task B          ──[CPU]──
Task B (blocked, even if ready)
                                   wall time ≈ longest single task
wall time = sum of all tasks
```

| Scenario | Concurrency helps? |
|---|---|
| 1000 HTTP fetches | **Yes** — most time waiting |
| Heavy CPU number-crunching | **No** (in single-thread) |
| Database queries in flight | Yes |
| Reading many small files | Yes |
| Image / video encoding | No (CPU-bound) — needs **parallelism** |

**Concurrency vs Parallelism — different things:**

| Concept | Definition |
|---|---|
| **Concurrency** | Multiple tasks **in progress** at the same time (one or many CPUs) |
| **Parallelism** | Multiple tasks **executing** at the same instant (multiple CPUs) |
| Concurrency without parallelism | One core, time-slicing |
| Parallelism implies concurrency | Always |

**Scheduling models compared:**

| Model | Where | Switch trigger | Granularity |
|---|---|---|---|
| **OS preemptive threads** | Most languages | Kernel scheduler / I/O syscalls | µs |
| **Cooperative fibers** | Ruby Fibers, Python async | Explicit `yield / await` | Application-controlled |
| **Green threads / coroutines** | Go goroutines, Java virtual threads | Runtime-managed yield points | µs |
| **BEAM processes** | Erlang / Elixir | Reduction count, every ~2000 ops | µs |
| **Event loop** | Node.js, Python asyncio | I/O completion / next tick | µs |

**The BEAM model — Erlang / Elixir:**

| Property | Detail |
|---|---|
| **"Process"** | Lightweight VM-level, NOT OS process |
| Spawn cost | **~µs**, ~2 KB initial |
| Per-process heap | Isolated — no shared mutable memory |
| Communication | **Message passing** (mailbox per process) |
| Scheduling | Preemptive at reduction count (no head-of-line blocking) |
| Garbage collection | Per-process heap → no global GC pause |
| Fault containment | One process crash doesn't kill others |
| Scaling | Millions of processes per node common |

**BEAM mental model:**

```
┌──────────────────────────────────────────────┐
│  BEAM VM                                      │
│   ┌─────────────────────────────────────┐    │
│   │  Scheduler #1 (1 OS thread)         │    │
│   │   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │    │
│   │   │ P1  │ │ P2  │ │ P3  │ │ P4  │ ...   │
│   │   └─────┘ └─────┘ └─────┘ └─────┘  │    │
│   └─────────────────────────────────────┘    │
│   ┌─────────────────────────────────────┐    │
│   │  Scheduler #2 (1 OS thread)         │    │
│   │   ...thousands more processes...    │    │
│   └─────────────────────────────────────┘    │
│   N schedulers = number of CPU cores         │
└──────────────────────────────────────────────┘
```

| Property | Detail |
|---|---|
| Schedulers | Typically one per CPU core |
| Each runs many lightweight processes | Time-multiplexed |
| Reductions | "Function call budget"; switches at threshold |
| No starvation | Preemptive at small intervals |

**BEAM message passing:**

```elixir
pid = spawn(fn ->
  receive do
    {:hello, name} -> IO.puts("Hello #{name}!")
  end
end)

send(pid, {:hello, "Alice"})
```

| Property | Detail |
|---|---|
| `send` is async fire-and-forget | Always succeeds |
| Messages copy on send | No shared memory; no locks |
| Per-process mailbox | Selective receive |
| Cross-node messaging | Same API works across machines |

**Compare runtimes:**

| Runtime | Concurrency primitive | Parallel CPU? | Memory per task | Spawn cost |
|---|---|---|---|---|
| **MRI Ruby thread** | OS thread + GVL | No | ~few MB | ms |
| **Ruby Fiber** | Cooperative | No | ~KB | µs |
| **Ruby Ractor** | Isolated thread | Yes | MB | ms |
| **Python asyncio task** | Event loop | No | KB | µs |
| **Go goroutine** | Green thread | Yes | ~KB | µs |
| **Java virtual thread** (21+) | Green thread | Yes | ~KB | µs |
| **Erlang/Elixir process** | BEAM process | Yes | ~KB | µs |
| **Node.js callback** | Event loop | No (per process) | small | µs |

**I/O blocking — what really happens:**

```
Single-threaded blocking:
   App → syscall → wait for kernel → resume    (whole app idle while waiting)

Threaded:
   App → thread A blocked  (waiting)
       → thread B continues (CPU work)

Async / event loop:
   App → register callback → continue
       → I/O completes → run callback

BEAM:
   Process A → blocks on receive → scheduler picks Process B
       → A becomes ready → A scheduled
```

| Mechanism | Hide blocking? |
|---|---|
| Threads | Yes — kernel switches |
| Async I/O (epoll, kqueue) | Yes — single thread, many sockets |
| BEAM processes | Yes — VM scheduler |
| Plain Fibers | Only with reactor (e.g. Async gem) |
| Plain async/await without proper I/O lib | Sometimes (depends on library) |

**Where each model shines:**

| Use case | Best fit |
|---|---|
| Telephone switches, IoT, distributed systems | **Erlang/Elixir** |
| Web APIs with many concurrent requests | Threaded or async |
| CPU-bound simulations | Process pool / Goroutines / Ractors |
| GUI apps | Event loop (single thread + worker threads) |
| Network servers | Async I/O + worker pool |
| Batch processing | Process per task (containers, K8s jobs) |

**Actor model — same family as BEAM:**

| Property | Detail |
|---|---|
| Each "actor" is isolated | Own state, own mailbox |
| Communication via messages | Like BEAM |
| Implementations | Akka (JVM), Orleans (.NET), Pony |
| Compared to OOP | Actors = objects + concurrency model + isolation |

**Ruby's Fiber-based concurrency (Async gem / Falcon):**

```ruby
require "async"
require "async/http/internet"

Async do |task|
  results = 100.times.map do
    task.async do
      Async::HTTP::Internet.new.get("https://api.example.com")
    end
  end.map(&:wait)
end
```

| Property | Detail |
|---|---|
| Fibers run on a reactor | Single OS thread |
| Block-on-I/O auto-yields | Lib must use Async-aware I/O |
| Massive concurrency in one thread | 10K+ HTTP requests |
| No GVL contention for I/O | Already single-threaded |
| CPU work still serial | Use Ractors for CPU |

**Key takeaways table:**

| Property | Threads (preemptive) | Fibers (cooperative) | BEAM processes |
|---|---|---|---|
| Spawn cost | ms | µs | µs |
| Memory each | MB | KB | KB |
| Crash isolation | None | None | **Strong** |
| Shared memory | Yes (locks) | Yes (single thread) | **No** (message-only) |
| Parallel CPU | Yes (no GVL) | No | Yes |
| Pre-emption | Yes | **No** (must yield) | Yes (reduction-based) |
| Best for | General concurrency | High-fan-out I/O | Distributed, fault-tolerant |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| "Concurrency = parallelism" confusion | Wrong tool picked |
| Calling BEAM processes "OS processes" | Mental model wrong |
| Fibers used without reactor | They block normally |
| GVL in MRI ignored | "Why don't my threads parallelize?" |
| Async libraries mixing blocking I/O | Reactor stalls |
| Sharing state across actors | Loses isolation benefit |
| Running CPU-bound work on event loop | Latency for everyone |
| Not back-pressuring async fan-out | Memory blowup |

**Cross-references:**

- Threads vs workers vs processes (general): [concurrency_threads_*.md](concurrency_threads_workers_processes.md)
- Ruby GVL: [gvl_*.md](../ruby/core/gvl_global_vm_lock_threads_ractors.md)
- Async / event loop (frontend): [event_loop_*.md](../frontend/common_theory_prompts/event_loop_ordering.md)

**Rule of thumb:** **Concurrency hides wait time; parallelism uses multiple CPUs.** For **I/O-heavy systems**, threads or fibers are usually enough. For **massive concurrent + fault-isolated** workloads (chat, IoT, telecom), **BEAM (Erlang/Elixir)** is the gold standard — millions of cheap, isolated processes scheduled across N CPU schedulers, with no shared mutable memory and no global GC pause. **CPU-bound work needs parallelism**, not concurrency — pick processes, goroutines, Ractors, or `worker_threads`.
