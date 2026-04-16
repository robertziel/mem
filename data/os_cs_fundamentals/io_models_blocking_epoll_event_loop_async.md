### I/O Models

**Five I/O models:**

**1. Blocking I/O (synchronous):**
```
Thread: [send request] ------ [waiting...] ------ [data ready, process]
```
- Thread blocks until data arrives
- Simple to program
- One thread per connection (doesn't scale with many connections)
- Used by: traditional web servers (Apache prefork)

**2. Non-blocking I/O (polling):**
```
Thread: [try read -> EAGAIN] [try read -> EAGAIN] [try read -> data!]
```
- Returns immediately if no data (error code)
- Application must poll repeatedly (wastes CPU)
- Rarely used directly

**3. I/O Multiplexing (select/poll/epoll):**
```
Thread: [register FDs with epoll] --[wait]-- [epoll returns ready FDs] [process]
```
- Monitor multiple file descriptors with one thread
- Block until any FD is ready
- `select`: O(n) scan, limited FDs. `epoll` (Linux) / `kqueue` (BSD): O(1), scales to millions
- Foundation of event-driven servers (Nginx, Node.js, Redis)

**4. Signal-driven I/O:**
- Kernel sends signal when data ready
- Rarely used in practice

**5. Asynchronous I/O (true async):**
```
Thread: [submit request] [do other work...] [kernel notifies completion]
```
- Request returns immediately, kernel handles everything
- Notification on completion (callback, completion port)
- Linux: `io_uring` (modern), `aio` (older). Windows: IOCP
- Used by: high-performance databases, storage engines

**Event Loop (single-threaded multiplexing):**
```
while true:
    events = epoll_wait(ready_fds)       # block until something is ready
    for event in events:
        handle(event)                     # non-blocking handler
```
- Single thread handles thousands of connections
- Handler must never block (would stall the entire loop)
- Node.js, Nginx, Redis all use this model

**Reactor pattern:**
- Event loop dispatches I/O events to handlers
- Handlers register interest in events (read ready, write ready)
- Single-threaded but highly concurrent for I/O
- Libraries: libuv (Node.js), Tokio (Rust), asyncio (Python), EventMachine (Ruby)

**C10K / C10M problem:**
- C10K: handle 10,000 concurrent connections (solved by epoll/kqueue)
- C10M: handle 10 million connections — kernel bypass (DPDK, userspace TCP) OR modern in-kernel async I/O (io_uring). Note: **io_uring is NOT kernel bypass** — it's a shared-memory submit/completion queue that minimizes syscall overhead while staying in-kernel; DPDK is true kernel bypass.
- Thread-per-connection model fails at C10K (too many threads, context switching)
- Event-driven model handles C10K easily with a single thread

**Practical models by language:**
| Language | Model | Handles I/O via |
|----------|-------|----------------|
| Node.js | Event loop (libuv) | Callbacks, Promises, async/await |
| Python | asyncio event loop | async/await, or threads |
| Ruby | Threads (Puma) or Fibers | Thread pool, or async (Falcon) |
| Go | Goroutines (M:N scheduler) | Blocking calls (runtime handles multiplexing) |
| Java | Virtual threads (Loom) or NIO | Thread-per-request or event-driven |
| Nginx | Event-driven (epoll) | Worker processes with event loops |

**Rule of thumb:** Event-driven (epoll/kqueue) for I/O-bound servers handling many connections. Thread-per-request for CPU-bound work. In practice, use the framework's model (Puma, Node, Go) rather than building your own. Go's goroutines and Java's virtual threads give the best of both worlds (blocking code, async execution).
