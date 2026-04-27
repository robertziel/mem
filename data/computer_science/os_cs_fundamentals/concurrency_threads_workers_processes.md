### Threads vs. Workers vs. Processes

Quick distinction:

- **Threads** -> Lightweight execution units inside one process; share memory.
- **Workers** -> A role label, not a runtime primitive; a worker can be implemented as a thread or as a process.
- **Processes** -> OS-isolated execution units with separate memory; heavier than threads.

### Ruby MRI angle

- MRI threads share memory, but the GVL means only one thread runs Ruby code at a time for CPU work.
- Threads are still useful for I/O because waiting threads can yield execution.
- Fibers provide cooperative concurrency inside one thread.
- Ractors use isolated memory and can run in parallel, but with more constraints.

**Gotcha**: "worker" by itself does not tell you memory isolation or overhead.

**Rule of thumb**: Ask both "Is this worker a thread or a process?" and "Which Ruby runtime model applies?" before reasoning about concurrency behavior.
