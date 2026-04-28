### Memory Management — Stack, Heap, Virtual Memory, GC

**Definition:** every process has a **memory layout** (text / data / BSS / heap / stack). **Stack** = automatic, fast, LIFO; **heap** = dynamic, manual or GC-managed. **Virtual memory** gives each process its own address space, mapped to physical RAM via page tables. **Garbage collection** strategies trade pause time, throughput, and memory.

**Process memory layout:**

```
   High addresses
   ┌──────────────────┐
   │ Stack             │  ← local vars, function frames (grows ↓)
   │                   │
   ├──────────────────┤
   │ ...free...        │
   ├──────────────────┤
   │ Heap              │  ← malloc / new (grows ↑)
   ├──────────────────┤
   │ BSS               │  ← uninitialized globals
   ├──────────────────┤
   │ Data              │  ← initialized globals + constants
   ├──────────────────┤
   │ Text (Code)       │  ← executable instructions
   └──────────────────┘
   Low addresses
```

**Stack vs Heap:**

| Property | **Stack** | **Heap** |
|---|---|---|
| Allocation | **Automatic** (function call) | Manual (`malloc`/`new`) or GC |
| Deallocation | **Automatic** (function return) | Manual (`free`) or GC |
| Speed | **Very fast** (pointer bump) | Slower (find free block) |
| Size | Small (1–8 MB typical) | Large (GBs) |
| Order | LIFO | Arbitrary |
| Thread safety | Each thread has own | Shared, needs synchronization |
| Failure mode | Stack overflow | OOM, fragmentation |
| Used for | Local vars, function args, return | Long-lived objects, dynamic size |

**Why stack is fast:**

| Property | Detail |
|---|---|
| Pointer increment / decrement | Single instruction |
| No fragmentation | Strict LIFO |
| CPU cache friendly | Contiguous |
| No metadata | Just stack pointer |

**Heap allocation strategies:**

| Strategy | Detail |
|---|---|
| **Bump allocator** | Fast; only works without free (e.g. arenas) |
| **Free list** | Linked list of free blocks |
| **Buddy system** | Power-of-2 block sizes (Linux kernel) |
| **Slab allocator** | Per-size pools (Linux kernel) |
| **TLS-cache (tcmalloc, jemalloc)** | Per-thread caches reduce contention |

**Virtual memory — every process has its own address space:**

| Concept | Detail |
|---|---|
| Each process | Sees full virtual address space (e.g. 64-bit = huge) |
| OS maps virtual → physical | Page tables |
| Many processes can use the same virtual address | Different physical pages |
| Allows memory > physical RAM | Swap, demand paging |
| **Page** | Fixed block (typically 4 KB; 2 MB / 1 GB huge pages) |
| **TLB** (Translation Lookaside Buffer) | Cache for page table lookups |

**Page table walk:**

```
   Virtual address
       │
       ▼  (TLB hit?)
   ┌─────────────────────┐
   │ TLB                 │  hit → physical address
   └─────────┬───────────┘
             │ miss
             ▼
   ┌─────────────────────┐
   │ Page table walk      │  multi-level, ~4 levels in modern CPUs
   │ (page directory →    │
   │  page table → page)  │
   └─────────┬───────────┘
             │
             ▼
   Physical address
```

**Page fault — when virtual page not in RAM:**

| Type | Detail |
|---|---|
| **Minor** | Page in memory but not yet mapped (e.g. shared library) |
| **Major** | Page on disk (swap), must read in |
| **Invalid** | Bad pointer → segfault |
| **Cost of major** | ~ms (disk seek) |
| **Thrashing** | Too many major faults; CPU mostly waiting |

**Memory-mapped files (`mmap`):**

| Property | Detail |
|---|---|
| Map a file directly into address space | OS handles loading |
| Read file = read memory | Demand-paged |
| Used by | DBs, shared libs, IPC |
| Faster than `read()` for large files | One copy avoided |
| Caveats | Persistent file changes if writable |

**Common memory bugs (low-level languages):**

| Bug | Detail |
|---|---|
| **Memory leak** | Allocated, never freed |
| **Dangling pointer** | Pointer to freed memory (use-after-free) |
| **Buffer overflow** | Write past allocated bounds (security CVE source) |
| **Double free** | Freeing same pointer twice |
| **Stack overflow** | Recursion depth exceeds stack |
| **OOM (Out of Memory)** | RAM + swap exhausted |
| **Fragmentation** | Many small free blocks, no contiguous large block |
| **Off-by-one** | Bound errors in loops |

**Languages and memory model:**

| Language | Strategy |
|---|---|
| **C / C++** | Manual (malloc/free); RAII (C++) |
| **Rust** | Ownership system (compile-time, no GC) |
| **Go** | Concurrent mark-sweep GC |
| **Java** | Generational GC (G1, ZGC, Shenandoah) |
| **Python** | Reference counting + cycle collector |
| **Ruby** | Generational mark-and-sweep + incremental |
| **JavaScript (V8)** | Generational + concurrent |
| **Swift** | ARC (automatic reference counting) |
| **C#** | Generational GC |

**Garbage collection strategies:**

| Strategy | How | Languages |
|---|---|---|
| **Reference counting** | Track refs per object, free at zero | Python (+cycle detector), Swift (ARC), Rust (`Rc`) |
| **Mark-and-sweep** | Mark reachable, sweep unreachable | Ruby, Java (older), Go |
| **Generational** | Young/old gens; GC young more often | Java, .NET, Ruby, V8 |
| **Concurrent** | GC alongside app threads | Java G1/ZGC, Go |
| **Incremental** | Many short pauses instead of one long | Ruby, V8 |
| **Compacting** | Move live objects, defragment | Java, .NET |
| **Tracing** | Walk reachable graph from roots | Most modern GCs |

**Generational hypothesis (the killer optimization):**

| Observation | Detail |
|---|---|
| Most objects die young | Empirically true |
| GC young generation frequently | Cheap (most are dead) |
| GC old generation rarely | Most objects survive |
| Survivors get promoted | Young → Old |
| Reduces total GC work | Big wins |

**JVM GC algorithms:**

| GC | Detail |
|---|---|
| **Serial** | Single-threaded, simple |
| **Parallel** | Multi-threaded young + serial old |
| **CMS** (deprecated) | Concurrent mark-sweep |
| **G1** | Region-based, balanced default since Java 9 |
| **ZGC** | Sub-ms pauses, multi-TB heap |
| **Shenandoah** | Low-pause concurrent (Red Hat) |

**Reference counting — cycle problem:**

```python
a = []
b = []
a.append(b)
b.append(a)
del a
del b
# Reference counts: a refs b, b refs a → never reach 0
# Need cycle collector (CPython has one)
```

| Strategy | Detail |
|---|---|
| Mark cycles unreachable | Python's `gc` module |
| Avoid cycles via ownership (Rust) | `Rc` + `Weak` |
| ARC + weak references | Swift |

**Production memory monitoring:**

| Metric | What |
|---|---|
| **RSS** (Resident Set Size) | Physical RAM used by process |
| **VSZ** (Virtual Size) | Total virtual memory mapped |
| **Heap size** | Application heap |
| **GC pause time** | p99 pause |
| **GC frequency** | Per minute |
| **Allocation rate** | MB/s allocated |
| **Promotion rate** | Young → old per GC |
| **Memory leaks** | Steady RSS growth |

**Tools:**

| Tool | Use |
|---|---|
| `top`, `htop` | Live process memory |
| `ps -o rss,vsz` | Snapshots |
| `pmap PID` | Per-region |
| `valgrind` | C/C++ leak detection |
| `heapdump` (JVM) | Snapshot heap |
| `jcmd / jvisualvm` | JVM analysis |
| `tracemalloc` (Python) | Allocation tracing |
| `pprof` (Go) | Heap profiling |
| `ObjectSpace` (Ruby) | Heap dump |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Massive recursion | Stack overflow |
| Holding references to large objects | Memory leak in GC languages |
| Forgetting `free()` in C | Leak |
| Use-after-free | Crash or security issue |
| Many small allocations | Fragmentation |
| Naive heap allocation in hot path | Slow due to malloc overhead |
| Container memory limits ignored | OOMKilled |
| Heap > available RAM | Constant swapping |
| Long-lived references in caches | Old gen pressure |
| Class-level lazy init grows forever | Looks like a leak |

**Decision matrix:**

| Need | Approach |
|---|---|
| Predictable, no GC pause | Rust, C++ with smart pointers |
| Long-running services | JVM (G1 / ZGC) or Go |
| Quick scripts | Python / Ruby (GC fine) |
| Memory-constrained | Reference counting (Swift / Rust) |
| Real-time / low-pause | Rust, Go, JVM ZGC |
| Web app | Whatever language you know — modern GCs are fine |

**Cross-references:**

- Concurrency / threads vs processes: [concurrency_threads_*.md](concurrency_threads_workers_processes.md)
- I/O models (memory-mapped I/O): [io_models_*.md](io_models_blocking_epoll_event_loop_async.md)
- Ruby GC + GVL: [gvl_*.md](../ruby/core/gvl_global_vm_lock_threads_ractors.md)

**Rule of thumb:** **Stack for local variables and function calls** (fast, automatic). **Heap for dynamic data that outlives its scope.** **Virtual memory** provides isolation and allows memory > physical RAM. **Memory leaks in GC languages usually mean unintended references** preventing collection — profile heap, find the holder. Monitor **RSS + heap size + GC pause time** in production; OOMKilled in containers is the most common K8s failure.
