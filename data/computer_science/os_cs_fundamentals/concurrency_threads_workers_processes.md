### Concurrency — Threads vs Workers vs Processes

**Definition:** three commonly-confused units of execution. **Threads** share memory inside one process; **processes** are OS-isolated with separate memory; **"worker"** is just a role label — it could be a thread, a process, or even a fiber. Always clarify which one before reasoning about concurrency.

**Core comparison:**

| Property | **Thread** | **Process** | **Worker** |
|---|---|---|---|
| Definition | Execution unit inside a process | OS-isolated unit with own address space | Role / job-doer (not a runtime primitive) |
| Memory | Shared within process | Isolated; copy-on-write after fork | Depends — could be either |
| Crash blast radius | Whole process | Just the process | Depends |
| Spawn cost | Cheap (~µs) | Expensive (~ms; fork or exec) | Depends |
| Communication | Direct memory + locks | IPC (pipe, socket, shared mem, queue) | Depends |
| Context switch cost | Cheap | More expensive | Depends |
| Use case | I/O-bound concurrency | Isolation, parallelism, fault containment | Conceptual layer |

**The mental model:**

```
┌──────────────────────────────────┐
│  Process (own memory space)      │
│   ┌──────────────────────────┐   │
│   │ Thread (shares memory)   │   │
│   │   ┌──────────────────┐   │   │
│   │   │ Fiber (cooperative) │ │   │
│   │   └──────────────────┘   │   │
│   └──────────────────────────┘   │
│   ┌──────────────────────────┐   │
│   │ Thread #2                │   │
│   └──────────────────────────┘   │
└──────────────────────────────────┘
```

| Layer | Property |
|---|---|
| Process | Memory + scheduling unit (OS) |
| Thread | Scheduling unit (OS), shares process memory |
| Fiber | Cooperative — yields explicitly; no preemption |
| Worker | "A job-doer" — your app's term |

**Ruby MRI specifics — the GVL elephant:**

| Property | Detail |
|---|---|
| **GVL** (Global VM Lock) | One thread executes Ruby bytecode at a time |
| Threads still useful for I/O | Network / disk waits release the GVL |
| Threads NOT useful for CPU-bound parallelism | The GVL serializes |
| **Fibers** | Cooperative concurrency in one thread (no parallelism) |
| **Ractors** (3.0+) | Isolated memory; can run in true parallel; experimental |
| `fork` / `Process.fork` | True parallelism via OS processes |

**When Ruby threads help (I/O-bound):**

```ruby
threads = urls.map do |url|
  Thread.new { Net::HTTP.get(URI(url)) }   # GVL released during wait
end
threads.map(&:value)
# 100 URLs in ~max(individual times), not sum
```

**When Ruby threads don't help (CPU-bound):**

```ruby
# Two threads doing CPU work — same wall time as serial
threads = 2.times.map { Thread.new { count_primes(1_000_000) } }
threads.each(&:join)
# Use Ractors or fork instead for true parallelism
```

**Ruby execution-model summary:**

| Primitive | Memory | Parallel CPU? | Parallel I/O? | Isolation |
|---|---|---|---|---|
| **Thread** (MRI) | Shared | No (GVL) | Yes | None |
| **Fiber** | Shared | No | Yes (with reactor) | None |
| **Ractor** (MRI 3.x) | **Isolated** | **Yes** | Yes | Memory-isolated |
| **Process** (fork) | Isolated | Yes | Yes | OS-isolated |
| **Thread** (JRuby/TruffleRuby) | Shared | **Yes** (no GVL) | Yes | None |

**Where each fits:**

| Need | Pick |
|---|---|
| Many concurrent HTTP / DB calls | **Threads** (or Fibers + reactor) |
| CPU-heavy parallel work in MRI | **Processes (fork)** or **Ractors** |
| CPU-heavy in JRuby / TruffleRuby | **Threads** (no GVL) |
| Strict fault isolation (one job crashes, others survive) | **Processes** |
| Embarrassingly parallel work | **Process pool** |
| Cooperative scheduling, fine-grained tasks | **Fibers** with `Async` / `falcon` |
| Very high I/O fan-out (10K+ concurrent) | **Fibers** (event loop) |

**Web app worker models:**

| Model | Process pool | Threads | Notes |
|---|---|---|---|
| **Puma** (default Rails) | Yes (cluster) | Yes | Hybrid — N processes × M threads |
| **Unicorn** | Yes | No | Pure process pool |
| **Falcon** | Yes (workers) | Fiber-based | Async / Fibers; very high concurrency |
| **Passenger** | Yes | Optional | Cluster + per-worker threads optional |
| **Sidekiq** | Yes (you run N) | Yes (concurrency) | Job worker; threaded |

**Process model — fork copy-on-write:**

```
Parent process (loaded Rails)
       │
       ├── Child 1 (forked, shares pages until written)
       ├── Child 2
       └── Child 3
```

| Benefit | Detail |
|---|---|
| Fast spawn after Rails boot | Memory pages shared |
| Reduced RAM for N workers | Until each writes → its own copy |
| `preload_app` in Puma | Triggers boot before fork |
| `before_fork / after_fork` hooks | Reconnect DB, etc. |

**Communication patterns:**

| Pattern | Threads | Processes |
|---|---|---|
| Shared memory | Yes (with locks) | No (without explicit shared mem) |
| Channel / queue | Yes (`Queue`) | Yes (DB / Redis / pipes) |
| Mutex | Yes | Less natural |
| Pipes / sockets | Possible | Native |
| Database / Redis | Yes | Yes — common across both |

**Concurrency hazards (threads):**

| Hazard | Detail |
|---|---|
| Data races | Two threads write same memory |
| Deadlocks | Lock ordering wrong |
| Livelocks | Threads spinning, no progress |
| Atomicity | Read-modify-write needs sync |
| Visibility | Memory model — one thread doesn't see another's write without barrier |

**Concurrency hazards (processes):**

| Hazard | Detail |
|---|---|
| Zombies | Forgot to `wait` for children |
| Orphans | Parent died, kernel reparents to init |
| Signals | `SIGTERM` / `SIGKILL` handling |
| File descriptor leaks | Child inherits FDs |
| Database connection bleed | Each process needs its own pool |

**Ratio rules of thumb (Ruby web apps):**

| Constraint | Heuristic |
|---|---|
| Memory per process | ~500 MB Rails app — multiplier for N processes |
| Threads per process | 5–10 typical (Puma default 5) |
| `RAILS_MAX_THREADS` ≈ DB pool | Match Active Record pool size |
| Total worker count | (CPU cores × 1–2) for CPU-bound; higher for I/O |
| Memory bound | Cap workers so RSS × N < available RAM × 0.8 |

**JavaScript / Node comparison (for context):**

| Property | Detail |
|---|---|
| Single thread (event loop) | No threads in user code by default |
| Worker threads | `worker_threads` module — true threads |
| Cluster mode | Multi-process (like Unicorn) |
| Web workers | Browser-side OS threads |

**Decision matrix:**

| Need | Pick |
|---|---|
| Web request handling, lots of I/O | Threads (or process+threads hybrid like Puma) |
| Background jobs, mixed CPU/IO | Sidekiq (threads) or Resque (processes) |
| CPU number-crunching in Ruby | Fork or Ractor |
| Crash isolation between jobs | Processes |
| Massive I/O fan-out | Fibers + reactor |
| Cross-language tooling | Whatever the host language uses |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Calling "worker" without saying thread or process | Reasoning is wrong |
| Assuming MRI threads parallelize CPU | They don't |
| Sharing AR connection across threads without pool | DB pool exhaustion |
| Forking after loading Rails fully | Memory not COW-friendly |
| Rescuing `StandardError` swallowing `ThreadError` | Hangs |
| Forgetting `Thread.abort_on_exception = true` | Errors silently lost |
| Closing FDs in child without care | Pipes / sockets break |
| Forgetting database reconnect in `after_fork` | Connections stale |

**Cross-references:**

- Ruby GVL deep dive: [gvl_*.md](../ruby/core/gvl_global_vm_lock_threads_ractors.md)
- Concurrency I/O blocking + BEAM model: [concurrency_io_*.md](concurrency_io_blocking_beam_processes.md)
- Sidekiq / job runners: [sidekiq_*.md](../ruby/rails/jobs/sidekiq_active_job_threading.md)

**Rule of thumb:** **"Worker" tells you nothing — always ask: thread or process?** Threads are cheap and great for **I/O concurrency**; processes are heavier but give **isolation + true parallel CPU** in MRI Ruby. Default Rails (Puma) uses both: **N processes × M threads**. For CPU-bound work in MRI, reach for **fork or Ractors**, not more threads. JRuby / TruffleRuby change the picture — no GVL, threads parallelize.
