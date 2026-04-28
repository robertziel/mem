### Ruby GVL (Global VM Lock) / GIL — Concurrency vs Parallelism

**Definition:** MRI Ruby has a **Global VM Lock (GVL)** — at any moment, **only one thread executes Ruby bytecode**. (Historically called the **GIL**; renamed to GVL when YARV replaced the older interpreter.)

> Other Ruby implementations don't have a GVL: **JRuby** (JVM threads, true parallelism), **TruffleRuby** (same).

**The two words to keep separate:**

| | Means |
|---|---|
| **Concurrency** | Multiple things in progress, interleaved (one at a time but switching) |
| **Parallelism** | Multiple things actually executing at the **same instant** (multi-core) |

> Ruby threads (under MRI) give you **concurrency** for I/O. They do **not** give you parallelism for CPU-bound work.

**What releases the GVL — and what doesn't:**

| Operation | Releases GVL? | Why |
|---|---|---|
| Blocking I/O (network, disk, sleep) | ✅ | While waiting, another thread can run Ruby |
| `Mutex#synchronize` while holding the lock | Holds the GVL until something blocks | |
| Ruby computation (math, string ops) | ❌ | One thread at a time |
| C extension that calls `rb_thread_call_without_gvl` | ✅ | Native code can release explicitly (e.g., parts of `Nokogiri`, image processing) |
| `Thread.pass` | Yields | Cooperative yield |

**Effect on workload patterns:**

```
Single-threaded Ruby:
[CPU work AAAAAA][I/O wait]
                          ↑ idle CPU

Multi-threaded MRI (I/O-bound — threads help):
Thread A: [Ruby AAA][I/O wait..........][Ruby AAA]
Thread B:           [Ruby BBB][I/O wait..........][Ruby BBB]
GVL:      [A holds][B holds  ............][A holds][B holds  ............]

Multi-threaded MRI (CPU-bound — threads do NOT help):
Thread A: [Ruby AA]                   [Ruby AA]
Thread B:         [Ruby BB]                   [Ruby BB]
GVL:      [A holds][B holds]          [A holds][B holds]
                                  (same total wall time as single-threaded)
```

**Rule of thumb table:**

| Workload | What works |
|---|---|
| I/O-bound (HTTP / DB / file) | **Threads** — concurrency reduces wall time |
| CPU-bound (computation, JSON parse, image processing in pure Ruby) | **Processes** — true parallelism |
| Mixed | Multi-process **and** multi-thread (Puma's model) |

**Puma's hybrid model — the practical pattern:**

```
┌──────────  Master Process  ──────────┐
│  forks workers, monitors them        │
├──────────────────────────────────────┤
│  Worker 1 (own GVL) ── 5 threads     │   ← parallelism via processes
│  Worker 2 (own GVL) ── 5 threads     │     concurrency via threads
│  Worker 3 (own GVL) ── 5 threads     │
└──────────────────────────────────────┘
```

| Knob | Effect |
|---|---|
| `WEB_CONCURRENCY` (workers) | True parallelism — one GVL per worker |
| `RAILS_MAX_THREADS` (threads/worker) | I/O concurrency within one worker |
| `min_threads`, `max_threads` | Pool sizing |
| `preload_app!` | Copy-on-write fork; saves memory |

> **Workers ≈ CPU cores; threads ≈ DB pool size.** Database connection pool **must** be at least `max_threads × workers` (per machine) or you'll see "no connection in pool".

**Choosing thread count per worker:**

| Workload | Threads/worker |
|---|---|
| Pure CPU | 1 (extra threads don't help) |
| Mostly I/O | 5–10 |
| Mixed (typical Rails app) | 3–5 |
| Heavy DB | Match DB pool capacity |

**Sidekiq (background jobs) — same trade-off:**

| Concern | Detail |
|---|---|
| Concurrency setting | Threads in one Sidekiq process |
| Multi-process Sidekiq | Run multiple processes for CPU parallelism |
| Default | `concurrency: 5` |
| For CPU-heavy jobs | Lower concurrency, run more processes |

**Other Ruby implementations:**

| Implementation | GVL? | Notes |
|---|---|---|
| **MRI / CRuby (default)** | ✅ Has GVL | Reference implementation |
| **JRuby** | ❌ No GVL | True parallel threads on JVM |
| **TruffleRuby** | ❌ No GVL | GraalVM-based; similar idea |
| **Ractors** (Ruby 3.0+) | Per-Ractor GVL | Actor-style isolated parallelism in MRI |

**Ractors (since Ruby 3.0) — true parallelism in MRI:**

| Concept | Detail |
|---|---|
| Each Ractor has its **own GVL** | Multiple Ractors run Ruby in parallel |
| Strict isolation | Cannot share unfrozen objects across Ractors |
| Communication | Message passing via `Ractor.send` / `Ractor.receive` |
| Shareable objects | Frozen, primitives, certain classes |
| Status (as of Ruby 3.3+) | Still experimental for many ecosystem libraries |
| Use cases | CPU-bound work needing parallelism inside one process |
| Adoption | Limited — most apps use Puma workers instead |

**Fibers — cooperative concurrency:**

| Concept | Detail |
|---|---|
| User-space lightweight scheduling | Cheaper than threads |
| `Fiber.schedule` (Ruby 3.0+) | Async I/O without callback hell |
| **Async** gem (Samuel Williams) | Fiber-based async runtime |
| **Falcon** server | Fiber-driven Rack server |
| Use case | High-concurrency I/O (thousands of slow connections) without thread overhead |
| Trade-off | Less mainstream; library ecosystem still maturing |

**Common misconceptions:**

| Misconception | Reality |
|---|---|
| "Ruby has a GIL so it's slow" | GVL is about parallelism, not raw speed; YJIT improves performance significantly |
| "Threads are useless in Ruby" | Threads help massively for I/O-bound workloads |
| "Sidekiq scales by adding threads" | Threads help if jobs are I/O bound; CPU jobs need more processes |
| "Just use processes" | Memory cost is real; balance with threads + CoW (`preload_app!`) |
| "Ractors solve the GVL problem" | Still experimental; Puma workers are the pragmatic solution |

**Practical Rails / Sidekiq tuning template:**

| Setting | Value |
|---|---|
| Puma `WEB_CONCURRENCY` | `cores - 1` to `2 × cores` |
| Puma `RAILS_MAX_THREADS` | 3–5 for typical apps |
| Sidekiq `concurrency` | 5–10 per process |
| Sidekiq processes | `cores / 2` for CPU-heavy queues |
| DB pool size | `≥ RAILS_MAX_THREADS` per worker |
| Memory headroom | Monitor RSS; size workers down if swapping |

**Diagnostics — am I CPU-bound or I/O-bound?**

| Tool | Use |
|---|---|
| `top` / `htop` | High CPU on Ruby process = CPU-bound |
| `pyspy` (works on Ruby too via wrapper) / `rbspy` | Sampling profiler |
| `stackprof` | In-process CPU profile |
| Rails `process_action` event | `db_runtime` + `view_runtime` vs total — gap = Ruby + GC |
| `rack-mini-profiler` | Per-request breakdown |
| Sidekiq job latency vs queue latency | Queue grows = need more concurrency / processes |

**Pitfalls / surprises:**

| Pitfall | Effect |
|---|---|
| Setting threads = 50 expecting parallelism | GVL means only 1 runs Ruby at a time; threads sit waiting |
| DB pool < `max_threads × workers` | "Could not obtain a connection from the pool" |
| Long CPU-heavy block in a thread | Starves other threads (no preemption mid-Ruby) |
| C-extension that doesn't release GVL | Becomes a serial bottleneck |
| Memory growth per worker | Forking copies a lot — mitigate with `preload_app!` and tuning |
| Mixing Ractors with non-shareable libraries | Crashes / errors |
| Assuming single-threaded code is safe-by-default in concurrent contexts | Class-level state still shared across threads in one process |

**Cross-references:**

- Concurrency primitives at the OS level: [concurrency_primitives_*.md](../../os_cs_fundamentals/concurrency_primitives_mutex_semaphore_deadlock_race_condition.md)
- Blocks / Procs / Lambdas: [blocks_lambda_proc.md](../core/blocks_lambda_proc.md)
- Process management: [process_management.md](../../devops/linux_fundamentals/process_management.md)

**Rule of thumb:** **MRI's GVL means threads give you concurrency (I/O), not parallelism (CPU).** For CPU-bound work, use **multiple processes** (Puma workers, multi-process Sidekiq). For I/O-bound work, **threads work fine**. The practical pattern is **hybrid**: workers = parallelism, threads-per-worker = I/O concurrency. **DB pool ≥ threads × workers** is the constraint that bites first if you tune naively.
