### Event sourcing (short)

Instead of storing current state, store **a log of events**.

- State is rebuilt by replaying events.
- Events are immutable and append-only.

**Pros:** auditability, time-travel debugging.
**Cons:** complexity, event versioning.

**Rule of thumb:** use for domains that need a clear history of changes.
