### I/O Blocking and Concurrency

When one task is blocked on I/O, the runtime can run other ready tasks.

- **Key point** -> This is why threads or lightweight processes improve throughput for I/O-heavy systems.
- **Key point** -> Concurrency helps hide wait time; it does not magically speed up pure CPU work.

### Elixir BEAM Model

Elixir uses BEAM "processes" (very lightweight VM processes), not OS processes for each task.

- **Key point** -> BEAM schedules many lightweight processes across a smaller set of OS threads.
- **Key point** -> BEAM processes do not share mutable memory like threads do.

**Rule of thumb**: Think of BEAM processes as isolated actors scheduled efficiently by the VM.
