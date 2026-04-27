### Concurrency Primitives

**Race condition:**
- Two threads access shared data concurrently, at least one writes
- Result depends on timing (non-deterministic)
```
Thread A: read balance (100)
Thread B: read balance (100)
Thread A: write balance (100 - 50 = 50)
Thread B: write balance (100 - 30 = 70)  // Thread A's debit lost!
```

**Mutex (Mutual Exclusion):**
- Lock that ensures only one thread accesses a critical section at a time
- Thread acquires lock -> does work -> releases lock
- Other threads block (wait) until lock is released
```python
lock = threading.Lock()
with lock:
    balance -= amount  # only one thread at a time
```

**Semaphore:**
- Counter that limits concurrent access to N threads
- Mutex = semaphore with N=1
- Use for: connection pools, rate limiting concurrent operations
```python
pool = threading.Semaphore(10)  # max 10 concurrent
with pool:
    use_connection()
```

**Read-Write Lock (RWLock):**
- Multiple readers can hold lock simultaneously
- Writer needs exclusive access (no readers or other writers)
- Optimizes for read-heavy workloads

**Deadlock:**
- Two or more threads waiting for each other, none can proceed
```
Thread A: holds Lock 1, waiting for Lock 2
Thread B: holds Lock 2, waiting for Lock 1
-> Deadlock!
```
**Deadlock conditions (all four needed):**
1. Mutual exclusion (resource can't be shared)
2. Hold and wait (hold one resource, wait for another)
3. No preemption (can't force release)
4. Circular wait (A waits for B, B waits for A)

**Prevention:** break any one condition. Most common: always acquire locks in the same order.

**Atomic operations:**
- Indivisible operations that complete without interruption
- Hardware-supported (compare-and-swap, fetch-and-add)
- Lock-free data structures use atomics instead of mutexes
```python
# Python
import threading
counter = threading.atomic_int()  # conceptual
counter.increment()  # atomic, no lock needed
```
```java
// Java
AtomicInteger counter = new AtomicInteger(0);
counter.incrementAndGet();  // thread-safe, no lock
```

**Condition variable:**
- Thread waits until a condition is met, another thread signals
- Use for: producer-consumer, thread coordination
```python
condition = threading.Condition()
with condition:
    while not data_available:
        condition.wait()    # release lock and sleep
    process(data)           # data is available

# Producer
with condition:
    data_available = True
    condition.notify()      # wake up waiting thread
```

**Channel (Go, Rust, Elixir):**
- Typed pipe for communication between goroutines/threads
- Combines data transfer and synchronization
```go
ch := make(chan int, 10)  // buffered channel
ch <- 42                  // send
value := <-ch             // receive (blocks if empty)
```
- "Don't communicate by sharing memory; share memory by communicating."

**Rule of thumb:** Prefer message passing (channels, queues) over shared memory with locks. If using locks, always acquire in the same order (prevent deadlock). Use the highest-level primitive available. In most web applications, concurrency is handled by the framework (Puma threads, Node event loop).
