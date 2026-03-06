### Threads vs. Workers vs. Processes

Quick distinction:

- **Threads** -> Lightweight execution units inside one process; share memory.
- **Workers** -> A role label, not a runtime primitive; a worker can be implemented as a thread or as a process.
- **Processes** -> OS-isolated execution units with separate memory; heavier than threads.

**Gotcha**: "worker" by itself does not tell you memory isolation or overhead.

**Rule of thumb**: Ask "Is this worker a thread or a process?" before reasoning about performance and safety.
