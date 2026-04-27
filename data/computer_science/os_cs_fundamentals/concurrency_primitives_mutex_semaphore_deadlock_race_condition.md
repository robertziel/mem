### Concurrency Primitives (Mutex, Semaphore, Deadlock, Race Condition)

**The bug a primitive prevents — race condition:**

```
Two threads, shared `balance = 100`:
  T1: read 100
  T2: read 100
  T1: write 100 − 50 = 50
  T2: write 100 − 30 = 70   ← T1's debit lost
```

A race condition exists whenever **two threads access shared state concurrently and at least one writes**, and the outcome depends on timing.

**Primitive comparison:**

| Primitive | What it allows | Use for | Key API |
|---|---|---|---|
| **Mutex** (lock) | Exactly **1** holder at a time | Protect a critical section | `lock.acquire/release`, `with lock:` |
| **Semaphore** | Up to **N** holders | Bounded resource pool, rate-limit | `Semaphore(N)`; mutex = `Semaphore(1)` |
| **Read-Write lock** | Many readers **OR** one writer | Read-heavy shared data | `rwlock.read_acquire`, `write_acquire` |
| **Spinlock** | Exclusive — but **busy-waits** instead of blocking | Very short critical sections, kernel paths | Avoid in user space unless contention is microsecond-level |
| **Atomic ops** (CAS, fetch-and-add) | Single-instruction read-modify-write — **no locking** | Counters, lock-free structures | `AtomicInteger.incrementAndGet()`, `compare_and_swap` |
| **Condition variable** | Thread sleeps until signaled | Producer/consumer, "wait until ready" | `cv.wait()` (releases mutex), `cv.notify()` |
| **Barrier** | Block N threads until all reach it, then release | Phase-synchronous workers | `Barrier(N).wait()` |
| **Latch (CountDownLatch)** | Block until counter reaches 0 | One-shot startup gate | `latch.await()`, `latch.countDown()` |
| **Monitor** | Mutex + condition variables bundled | Java `synchronized` blocks | `synchronized (obj) { obj.wait(); obj.notify(); }` |
| **Channel** (Go, Rust, Elixir) | Typed pipe — sends value + ownership | Message passing instead of sharing memory | `ch <- v`, `v := <- ch` |
| **Actor mailbox** | Async message queue per actor | Erlang/Elixir/Akka concurrency | `pid ! msg`, `receive do ... end` |
| **Future / Promise** | Single-write, multiple-read result slot | Async result handoff | `f.get()`, `await f` |

**Mutex vs Semaphore (the most-confused pair):**

| Aspect | Mutex | Semaphore |
|---|---|---|
| Holders | 1 | N |
| Ownership | Bound to releasing thread | Counter — any thread can post/wait |
| Typical use | Critical section | Bounded pool, signaling |
| Recursive variant exists? | Yes (re-entrant mutex) | No (counter has no notion of owner) |

**Deadlock — the four Coffman conditions (all required):**

| Condition | Meaning |
|---|---|
| 1. Mutual exclusion | Resources are non-shareable |
| 2. Hold and wait | Thread holds one resource while waiting for another |
| 3. No preemption | Resources can't be forcibly taken |
| 4. Circular wait | Cycle in the "waiting for" graph |

**Deadlock prevention — break any one condition:**

| Strategy | Breaks condition | How |
|---|---|---|
| **Lock ordering** (always acquire L1 before L2) | Circular wait | Most common, easiest to enforce |
| **Try-lock with timeout** | Hold and wait | `if !mutex.try_lock(timeout): release_all_and_retry` |
| **Lock all at once** | Hold and wait | Acquire whole set or none |
| **Lock-free structures** (atomics, CAS) | Mutual exclusion | No locks → no deadlock |
| **Resource hierarchy** | Circular wait | Each lock has a level; only acquire higher-level holding lower |

**Detecting deadlock** (production debugging):

| Symptom | Where to look |
|---|---|
| Threads blocked forever, CPU idle | Thread dump (`jstack`, `pyspy`, `pstack`) — look for circular `waiting for monitor entry` |
| DB-level deadlock | Query log (`SHOW ENGINE INNODB STATUS\G`, `pg_locks`) |
| Distributed deadlock | Lock service / saga engine logs |

**Other concurrency hazards:**

| Hazard | Definition | Mitigation |
|---|---|---|
| **Race condition** | Outcome depends on timing | Lock or atomic |
| **Deadlock** | Threads wait on each other forever | Lock ordering / try-lock |
| **Livelock** | Threads keep changing state to "respond" but make no progress | Backoff + randomization |
| **Starvation** | Some thread never gets the lock | Fair lock / queue-based primitive |
| **Priority inversion** | High-prio waits on low-prio holding the lock | Priority inheritance protocol |
| **ABA problem** | CAS sees old value, doesn't notice it changed and changed back | Versioned pointer / hazard pointers |
| **Memory visibility** | Other thread sees stale value despite "happens-before" violation | `volatile`, memory barriers, language memory model |

**Concurrency models — pick by problem shape:**

| Model | Lock complexity | Scaling pattern |
|---|---|---|
| Shared memory + locks | High — every shared structure needs reasoning | Threads (Puma, Java, C++) |
| Lock-free / atomics | Higher (subtle correctness) | High-throughput counters, queues |
| Message passing (channels) | None — no shared mutable state crosses thread boundaries | Go, Rust, Erlang/Elixir |
| Actors | None — actor state is private | Akka, Erlang/Elixir, Orleans |
| Single-threaded event loop | None — by construction | Node.js, Python asyncio, Redis |
| STM (Software Transactional Memory) | None — runtime retries on conflict | Clojure refs, Haskell STM |

**Rule of thumb:** **prefer message passing or actors over shared memory + locks** when the language gives you the option. If you must use locks, **acquire in a fixed global order** — that single rule eliminates most deadlocks. Use the highest-level primitive that fits (channel > condition variable > raw mutex). For counters and flags, atomics beat locks. In typical web apps, the framework handles concurrency (Puma threads, Node event loop) — your job is to avoid sharing mutable state across requests.
