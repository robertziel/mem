### Database Locks (Shared, Exclusive, Advisory, Deadlock)

**Why locks exist:**
- Prevent concurrent transactions from corrupting data
- MVCC handles most concurrency, but some operations need explicit locks

**Lock levels in PostgreSQL:**
| Lock | Acquired by | Conflicts with | Blocks |
|------|------------|---------------|--------|
| ACCESS SHARE | `SELECT` | ACCESS EXCLUSIVE | Nothing (reads don't block reads) |
| ROW SHARE | `SELECT FOR SHARE`, `SELECT FOR KEY SHARE` | EXCLUSIVE, ACCESS EXCLUSIVE | — |
| ROW EXCLUSIVE | `INSERT`, `UPDATE`, `DELETE`, `SELECT FOR UPDATE`, `SELECT FOR NO KEY UPDATE` | SHARE, EXCLUSIVE, ACCESS EXCLUSIVE | — |
| SHARE | `CREATE INDEX` (non-concurrent) | ROW EXCLUSIVE, EXCLUSIVE | Writes |
| EXCLUSIVE | Some ALTER TABLE | Almost everything | Reads + writes |
| ACCESS EXCLUSIVE | `DROP TABLE`, `ALTER TABLE`, `VACUUM FULL` | Everything | Everything |

**Row-level locks:**
```sql
-- Lock specific rows (pessimistic locking)
SELECT * FROM orders WHERE id = 1 FOR UPDATE;
-- Other transactions trying to update/delete row 1 will wait

-- Skip locked rows (useful for job queues)
SELECT * FROM jobs WHERE status = 'pending'
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;
-- Returns first unlocked pending job (no waiting)
```

**Advisory locks (application-level):**
```sql
-- Session-level lock (held until session ends or explicit unlock)
SELECT pg_advisory_lock(12345);
-- ... critical section ...
SELECT pg_advisory_unlock(12345);

-- Transaction-level lock (released at COMMIT/ROLLBACK)
SELECT pg_advisory_xact_lock(12345);

-- Try without blocking
SELECT pg_try_advisory_lock(12345);  -- returns true/false
```
Use for: deployment locks, preventing concurrent migrations, application-level mutex.

**Deadlock:**
```
Transaction A: locks row 1, then tries to lock row 2
Transaction B: locks row 2, then tries to lock row 1
→ Both waiting forever → DEADLOCK

PostgreSQL detects deadlocks (check every deadlock_timeout, default 1s)
→ Kills one transaction with: ERROR: deadlock detected
```

**Preventing deadlocks:**
- Always lock rows in the same order (e.g., by ID ascending)
- Keep transactions short (less time holding locks)
- Use `SKIP LOCKED` for queue-like patterns
- Avoid `SELECT ... FOR UPDATE` on large sets

**Monitoring locks:**
```sql
-- Currently held locks
SELECT l.locktype, l.relation::regclass, l.mode, l.granted, l.pid,
       a.query, a.state
FROM pg_locks l
JOIN pg_stat_activity a ON a.pid = l.pid
WHERE NOT l.granted;  -- waiting locks

-- Blocked queries
SELECT blocked.pid AS blocked_pid,
       blocked.query AS blocked_query,
       blocking.pid AS blocking_pid,
       blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_locks bl ON bl.pid = blocked.pid AND NOT bl.granted
JOIN pg_locks gl ON gl.relation = bl.relation AND gl.granted
JOIN pg_stat_activity blocking ON blocking.pid = gl.pid
WHERE blocked.pid != blocking.pid;
```

**Lock timeout (fail fast instead of waiting):**
```sql
SET lock_timeout = '5s';
-- If lock can't be acquired in 5 seconds → error instead of waiting forever
-- Essential for migrations on busy tables
```

**Rule of thumb:** MVCC handles most concurrency — explicit locks are rarely needed. Use `FOR UPDATE SKIP LOCKED` for job queues. Advisory locks for application-level coordination. Keep transactions short to minimize lock contention. Always set `lock_timeout` in migrations. Monitor `pg_locks` for blocked queries.
