### Ruby GIL/GVL (Global VM Lock)

**What the GVL is:**
- MRI Ruby has a Global VM Lock (GVL, historically called GIL)
- Only one thread executes Ruby code at a time
- I/O operations release the GVL (threads CAN run in parallel for I/O)
- CPU-bound work: threads DON'T help (GVL blocks parallelism)

```
Thread A: [Ruby code]---[I/O wait]---[Ruby code]
Thread B:               [Ruby code]---[I/O wait]---[Ruby code]
GVL:      [A holds]---->[B holds]--->[A holds]---->[B holds]
```

**Practical implication:**
- Threads useful for I/O (HTTP calls, DB queries) — GVL released during wait
- Threads NOT useful for CPU (computation) — GVL means one thread at a time
- For CPU parallelism: use multiple processes (Puma workers)

**Puma's model:**
```
Master Process
  ├── Worker 1 (separate GVL) → 5 threads (concurrent I/O)
  ├── Worker 2 (separate GVL) → 5 threads
  └── Worker 3 (separate GVL) → 5 threads
```

**Rule of thumb:** GVL means Ruby threads give concurrency (I/O), not parallelism (CPU). For CPU work, use multiple processes. Puma workers = processes (true parallelism), threads per worker = concurrent I/O.
