### I/O Models — Blocking, Non-blocking, Multiplexing, Async, Event Loops

**Definition:** five ways to handle I/O at the kernel/syscall layer. Each trades **simplicity vs scalability**. **Event-driven multiplexing** (epoll, kqueue) underlies modern high-concurrency servers (Node.js, Nginx, Redis). True async I/O (`io_uring`, IOCP) is even more recent.

**The five I/O models:**

| Model | Kernel call | Scaling | Used by |
|---|---|---|---|
| **Blocking** | `read()` blocks | One thread per connection | Apache prefork, Postgres |
| **Non-blocking (polling)** | `read()` returns EAGAIN | Wastes CPU spinning | Rarely directly |
| **I/O multiplexing** | `select` / `poll` / `epoll` / `kqueue` | One thread, many FDs | Nginx, Node.js, Redis |
| **Signal-driven** | Kernel sends signal | Rarely used | Niche |
| **True asynchronous** | `io_uring` / `aio` / IOCP | Best for storage I/O | High-perf DBs, modern Linux servers |

**1. Blocking I/O — the simple baseline:**

```
Thread: [send request] ─────[blocked, waiting...]──── [data ready] [process]
                              ↑ thread sleeps in kernel
```

| Property | Detail |
|---|---|
| Simple to program | Sequential code |
| Thread blocked → can't do other work | OS schedules other threads |
| One thread per connection | Doesn't scale to many |
| Memory cost | ~1–10 MB per thread |
| Used by | Traditional Apache, Postgres backends |

**2. Non-blocking polling — high CPU cost:**

```
Thread: [try read → EAGAIN] [try read → EAGAIN] [try read → data!]
        ↑ never sleeps, keeps spinning
```

| Property | Detail |
|---|---|
| Returns immediately if no data | EAGAIN / EWOULDBLOCK |
| Application polls in loop | Burns CPU |
| Rarely used directly | Foundation for multiplexing |

**3. I/O Multiplexing — the production winner:**

```
Thread: [register all FDs with epoll] ─[wait]─ [epoll returns ready FDs] [process each]
        ↑ blocks once, wakes when any FD ready
```

| Mechanism | Properties |
|---|---|
| **`select`** | POSIX, max ~1024 FDs, O(N) scan |
| **`poll`** | Like select, no FD limit, still O(N) |
| **`epoll`** (Linux) | O(1), edge or level-triggered, handles millions |
| **`kqueue`** (BSD/macOS) | Equivalent to epoll |
| **`/dev/poll`** (Solaris) | Equivalent |

**Edge-triggered vs level-triggered (epoll):**

| Mode | Behavior |
|---|---|
| **Level-triggered (LT)** | Notify while data available; can be lazy reading |
| **Edge-triggered (ET)** | Notify only on transition; must read until EAGAIN |
| LT: simpler, default | ET: less overhead, more careful programming |

**4. Signal-driven I/O — rare:**

| Property | Detail |
|---|---|
| Kernel sends `SIGIO` when data ready | Async signal |
| Hard to use correctly | Reentrant signal handlers |
| Used in some niche embedded systems | Rare in app code |

**5. True async (POSIX AIO, io_uring, IOCP):**

```
Thread: [submit request] [do other work...] ──[kernel notifies completion]
        ↑ kernel handles I/O without blocking
```

| Implementation | Detail |
|---|---|
| **`io_uring`** (Linux 5.1+) | Modern shared-memory submission/completion queues; minimizes syscalls |
| **POSIX `aio`** | Older, less performant |
| **IOCP** (Windows) | Completion ports, similar idea |
| **NOT kernel bypass** | `io_uring` stays in-kernel; DPDK is true bypass |

> **`io_uring` is NOT kernel bypass.** It's a shared-memory submit/complete queue that minimizes syscall overhead while staying in-kernel. **DPDK** is true kernel bypass.

**Event Loop — the application pattern:**

```
while true:
    events = epoll_wait(ready_fds, timeout)
    for event in events:
        handle(event)            # MUST be non-blocking
```

| Property | Detail |
|---|---|
| Single thread, many connections | Concurrency without threads |
| Handler must never block | One blocking call freezes everything |
| Fits I/O-bound workloads | Not CPU-bound |
| Used by | Node.js, Nginx, Redis, Tornado, asyncio, Tokio |

**Reactor pattern — event loop + dispatch:**

| Component | Detail |
|---|---|
| Event loop | Demultiplexer (epoll wait) |
| Handlers | Register interest in events (read ready, write ready) |
| Dispatch | Loop calls appropriate handler when event fires |
| Implementations | libuv (Node), Tokio (Rust), asyncio (Python), Netty (Java), EventMachine (Ruby) |

**Proactor pattern — true-async sibling:**

| Component | Detail |
|---|---|
| Submit operation | Kernel does the I/O |
| Notify on completion | Application gets the result |
| Used by IOCP (Windows), io_uring (Linux) | Better for disk I/O |
| Reactor handles "ready"; Proactor handles "done" | Different timing |

**The C10K → C10M evolution:**

| Problem | Solution era |
|---|---|
| **C10K (10,000 connections)** | epoll/kqueue (early 2000s) |
| Thread-per-conn fails ~1K | Too many threads, context switch overhead |
| **C10M (10 million connections)** | Kernel bypass (DPDK), userspace TCP, or io_uring |
| **Today: high-perf storage** | io_uring competes with kernel-bypass for raw IO |

**Per-language model comparison:**

| Language / runtime | Default model | Async primitive | Notes |
|---|---|---|---|
| **Node.js** | Event loop (libuv) | `async`/`await`, callbacks | Single thread, multi via worker_threads |
| **Python (asyncio)** | Event loop | `async`/`await` | GIL doesn't matter for I/O |
| **Python (sync + threads)** | Thread per request | Thread pool | GIL serializes CPU |
| **Ruby (MRI)** | Threads + GVL | `Thread.new` (I/O ok) | Use Falcon for fiber-based |
| **Ruby (Fibers, Async gem)** | Reactor (Async/IO) | Block on I/O auto-yields | Fits massive concurrency |
| **Go** | Goroutines (M:N scheduler) | Blocking calls | Runtime multiplexes |
| **Java (NIO)** | NIO + selector | CompletableFuture | Pre-Loom |
| **Java (Loom virtual threads)** | Virtual thread per req | Blocking calls | "Best of both worlds" |
| **Nginx** | Event loop (epoll) | Per-worker | C-level efficiency |
| **Rust (Tokio)** | Reactor | `async`/`await` | Zero-cost futures |

**When each model fits:**

| Workload | Best model |
|---|---|
| Many concurrent I/O ops, slow per-op | Event loop / async |
| Few connections, CPU-bound | Threads / processes |
| Massive connections (10K+) | Event loop or goroutines / virtual threads |
| Heavy disk I/O | True async (`io_uring`) |
| Mixed I/O + CPU | Goroutines, virtual threads |
| Embedded, lowest memory | Single-threaded blocking |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Blocking call in event loop | Stalls the entire process |
| Long CPU work in async handler | Blocks the loop |
| Mixing sync DB driver with asyncio | Defeats async |
| Using `select` instead of `epoll` for many FDs | Fails at scale |
| Edge-triggered without reading until EAGAIN | Missed events |
| Thread per connection at 10K conns | Context-switch death |
| Treating `io_uring` as kernel bypass | It's not |
| Async/await everywhere when sync is fine | Complexity without benefit |

**Decision matrix:**

| Need | Pick |
|---|---|
| Build high-concurrency server | Event loop (Node, Tokio, asyncio, libuv) |
| Build CPU-heavy parallel system | Threads (Java, JVM) or goroutines |
| Pure-blocking simplicity, low scale | Threads with thread-per-connection |
| Modern Linux, peak storage performance | `io_uring` |
| Cross-platform | Use the runtime's abstraction |

**Cross-references:**

- Concurrency / threads vs processes: [concurrency_threads_*.md](concurrency_threads_workers_processes.md)
- BEAM / Erlang lightweight processes: [concurrency_io_*.md](concurrency_io_blocking_beam_processes.md)
- Ruby GVL: [gvl_*.md](../ruby/core/gvl_global_vm_lock_threads_ractors.md)
- Async/await + Promises: [async_await_*.md](../frontend/javascript_core_theory/async_await_promise_try_catch.md)

**Rule of thumb:** **Event-driven multiplexing (epoll/kqueue)** is the right model for **I/O-bound servers** with many connections — Nginx, Node, Redis all use it. **Thread-per-request** is fine for low-concurrency CPU-bound work, but fails at scale. **Goroutines / virtual threads** offer "blocking code, async execution" — the sweet spot for many modern languages. Reach for **`io_uring`** when storage I/O dominates. Don't confuse `io_uring` with kernel bypass.
