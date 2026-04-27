### PgBouncer transaction mode vs session mode

### Transaction mode

- A server connection is assigned only for the duration of a transaction
- Great connection multiplexing for web apps
- Usually the best default for Rails requests

### Session mode

- A client keeps the same server connection for the whole session
- Needed when session-level state must persist
- More expensive because multiplexing is lower

### Transaction mode limitations

- Session-level `SET` values do not persist
- Long-lived session state is unsafe
- Some prepared statement and temp-table patterns can break

**Rule of thumb:** Use transaction mode for normal web traffic and session mode only when you truly need per-session database state.
