### Garbage collector (short)

**GC** automatically frees memory by removing objects that are no longer referenced.

Common GC strategies:
- Mark-and-sweep
- Generational GC

**Trade-off:** GC pauses can affect latency.

**Rule of thumb:** watch object allocation rates and GC time in production.
