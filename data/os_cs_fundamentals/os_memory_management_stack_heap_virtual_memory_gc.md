### Memory Management

**Memory layout of a process:**
```
High address
+------------------+
| Stack            |  <- local variables, function calls (grows down)
|                  |
+------------------+
| (free space)     |
+------------------+
| Heap             |  <- dynamic allocation (malloc/new, grows up)
+------------------+
| BSS              |  <- uninitialized global variables
+------------------+
| Data             |  <- initialized global variables
+------------------+
| Text (Code)      |  <- compiled program instructions
+------------------+
Low address
```

**Stack vs Heap:**
| Feature | Stack | Heap |
|---------|-------|------|
| Allocation | Automatic (function call) | Manual / GC (new, malloc) |
| Deallocation | Automatic (function return) | Manual (free) / GC |
| Speed | Very fast (pointer bump) | Slower (find free block) |
| Size | Small (1-8 MB typical) | Large (GBs) |
| Order | LIFO | Arbitrary |
| Thread safety | Each thread has own stack | Shared, needs synchronization |

**Virtual memory:**
- Each process thinks it has the entire address space
- OS maps virtual addresses to physical RAM pages
- Enables: isolation, memory larger than physical RAM, shared libraries
- **Page** - fixed-size block of memory (typically 4 KB)
- **Page table** - maps virtual pages to physical frames
- **TLB** - cache for page table lookups (Translation Lookaside Buffer)

**Page fault:**
- Access a page not in physical RAM
- OS loads page from disk (swap) into RAM
- **Thrashing** - too many page faults, system spends more time swapping than executing

**Memory-mapped files (mmap):**
- Map a file directly into process address space
- Read file = read memory (OS handles loading pages)
- Used by: databases, shared libraries, IPC

**Common memory issues:**
- **Memory leak** - allocated memory never freed (grows over time)
- **Dangling pointer** - pointer to freed memory (use-after-free)
- **Buffer overflow** - writing past allocated bounds (security vulnerability)
- **Stack overflow** - too deep recursion, stack exhausted
- **OOM (Out of Memory)** - system runs out of RAM + swap

**Garbage collection strategies:**
| Strategy | How | Languages |
|----------|-----|-----------|
| Reference counting | Track references per object, free at zero | Python (+ cycle detector), Swift, Rust (ownership) |
| Mark and sweep | Mark reachable objects, sweep unreachable | Ruby, Java, Go |
| Generational GC | Separate young/old generations, GC young more often | Java, .NET, Ruby |
| Concurrent GC | GC runs alongside application | Java G1/ZGC, Go |

**Generational hypothesis:**
- Most objects die young
- Generational GC optimizes for this: frequent GC of young generation, rare GC of old
- Young objects surviving multiple GCs get promoted to old generation

**Rule of thumb:** Stack for local variables and function calls (fast, automatic). Heap for dynamic data that outlives its scope. Virtual memory provides isolation and allows overcommitment. Memory leaks in GC languages usually mean unintended references preventing collection. Monitor RSS and heap size in production.
