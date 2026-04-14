### Processes, Threads, and Coroutines

**Process:**
- Independent execution unit with own memory space
- Created by OS (fork/exec), heavy to create
- Isolated: one process crash doesn't affect others
- Communication: IPC (pipes, sockets, shared memory, message queues)
- Use for: isolation (separate services), multi-core utilization

**Thread:**
- Lightweight execution unit within a process
- Shares process memory (heap), has own stack
- Cheaper to create than processes
- Shared memory = risk of race conditions (need mutexes, locks)
- Use for: parallelism within an application, concurrent I/O

**Coroutine (async/await, green threads, fibers):**
- Cooperative multitasking within a single thread
- Voluntarily yield control (await, yield)
- Extremely lightweight (thousands per thread)
- No parallelism (single thread), but great concurrency for I/O
- Use for: I/O-bound workloads (web servers, API clients)

**Comparison:**
| Feature | Process | Thread | Coroutine |
|---------|---------|--------|-----------|
| Memory | Separate | Shared | Shared |
| Creation cost | Heavy | Medium | Very light |
| Communication | IPC | Shared memory | Direct |
| Isolation | Full | Partial | None |
| Parallelism | Yes | Yes* | No |
| Concurrency | Yes | Yes | Yes |
| Scheduling | OS (preemptive) | OS (preemptive) | Application (cooperative) |

*GIL in Python/Ruby limits thread parallelism for CPU work

**Concurrency vs Parallelism:**
- **Concurrency** - dealing with multiple things at once (structure)
- **Parallelism** - doing multiple things at once (execution)
- Single-core: concurrency without parallelism (time-slicing)
- Multi-core: concurrency with parallelism

**Language-specific models:**
| Language | Model |
|----------|-------|
| Ruby (MRI) | GIL: threads for I/O concurrency, processes (Puma workers) for parallelism |
| Python (CPython) | GIL: same as Ruby. Use asyncio for I/O, multiprocessing for CPU |
| Go | Goroutines (M:N scheduling, true parallelism) |
| Elixir/Erlang | BEAM processes (lightweight, preemptive, millions per VM) |
| Java | OS threads + virtual threads (Project Loom, lightweight) |
| Node.js | Single-threaded event loop + worker threads for CPU |

**Rule of thumb:** Use processes for isolation and CPU parallelism (Puma workers, multiprocessing). Threads for I/O concurrency within a process. Coroutines/async for high-concurrency I/O (thousands of connections). Choose based on your workload: CPU-bound = processes/threads, I/O-bound = coroutines/async.
