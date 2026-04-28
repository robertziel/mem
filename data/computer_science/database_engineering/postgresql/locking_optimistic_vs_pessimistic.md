### Optimistic vs Pessimistic Locking

**Definition:** two strategies for handling concurrent updates to the same row. **Optimistic** assumes conflicts are rare and detects them at save time; **pessimistic** assumes conflicts are likely and prevents them with row locks.

**Core comparison:**

| Property | **Optimistic** | **Pessimistic** |
|---|---|---|
| When the lock is acquired | **Never** — uses a version column | At read time (`SELECT ... FOR UPDATE`) |
| What blocks | Nothing — concurrent reads + writes proceed | Other transactions on the same row block |
| Conflict detection | At save: version mismatch → error | At read: lock waits / times out |
| Failure mode | `StaleObjectError` → retry | Lock wait timeout / deadlock |
| Throughput when no contention | Best | Slightly lower (lock overhead) |
| Throughput under heavy contention | Bad — many retries | Better — serializes |
| Risk of starvation | Application-level (retry storm) | DB-level (lock timeout) |
| Best for | Mostly-independent updates | Hot rows, money, inventory |

**Optimistic — Rails example (built-in `lock_version`):**

```ruby
class Order < ApplicationRecord
  # add_column :orders, :lock_version, :integer, default: 0, null: false
end

# Worker A and B both load the same order
order_a = Order.find(1)  # lock_version = 0
order_b = Order.find(1)  # lock_version = 0

order_a.update!(status: "paid")     # lock_version becomes 1
order_b.update!(status: "shipped")
# → ActiveRecord::StaleObjectError — version was bumped under us
```

| Mechanism | Detail |
|---|---|
| Column `lock_version` | Auto-detected by ActiveRecord (or override with `self.locking_column = :version`) |
| `UPDATE ... WHERE id = ? AND lock_version = ?` | If 0 rows updated → conflict |
| Bump on save | `lock_version = lock_version + 1` |
| Caller responsibility | Catch `StaleObjectError` and retry / merge |

**Pessimistic — Rails example:**

```ruby
Order.transaction do
  order = Order.lock.find(1)             # SELECT ... FOR UPDATE
  order.update!(status: "paid")
end

# Or block form:
Order.find(1).with_lock do |order|
  order.update!(status: "paid")
end

# Non-blocking:
order = Order.lock("FOR UPDATE NOWAIT").find(1)    # raise immediately if locked
order = Order.lock("FOR UPDATE SKIP LOCKED").find(1) # skip locked rows (job queues)
```

| Variant | Effect |
|---|---|
| `FOR UPDATE` | Lock for write; readers block |
| `FOR NO KEY UPDATE` | Weaker — allows FK reads |
| `FOR SHARE` | Read lock; concurrent reads OK; writers block |
| `NOWAIT` | Raise immediately if can't acquire |
| `SKIP LOCKED` | Skip already-locked rows — perfect for job queues |

**Conflict scenarios — concrete:**

| Scenario | Optimistic outcome | Pessimistic outcome |
|---|---|---|
| Two users edit same wiki page | First save wins, second gets `StaleObjectError`, app shows merge UI | Second user blocks until first commits, then sees latest |
| Decrement inventory by 1, two concurrent | Race possible if you read-modify-write without version | Lock serializes; safe |
| Increment counter | Better: `UPDATE ... SET count = count + 1` (atomic, lockless) | Lock works but unnecessary |
| Approval workflow with stale data | Optimistic catches the race; user re-reads | Pessimistic prevents the race |

**The atomic-update alternative — neither lock needed:**

```ruby
# Race-free without any locking:
Account.where(id: 1).update_all("balance = balance - 100")

# With a guard:
Account.where(id: 1).where("balance >= 100").update_all("balance = balance - 100")
```

> Many "concurrent update" problems disappear if you let the database do the math in one statement. Reach for locking only when you need read-then-decide-then-write.

**Decision tree:**

```
Are conflicts rare AND can the user fix on retry?
   → Optimistic (lock_version)

Is the row hot AND does inconsistency cost real money?
   → Pessimistic (FOR UPDATE)

Is the update an atomic arithmetic / state change?
   → Neither — single SQL UPDATE with WHERE guard

Is this a job queue picking work?
   → SELECT ... FOR UPDATE SKIP LOCKED
```

**Real-world fits:**

| Use case | Lock |
|---|---|
| Editing a blog post / wiki | Optimistic — collaborative-edit UX |
| Money transfer | **Pessimistic** — must serialize |
| Inventory decrement | Pessimistic OR atomic UPDATE with check |
| Order state machine (placed → paid → shipped) | Optimistic — state collisions rare |
| Job queue worker picking next job | `FOR UPDATE SKIP LOCKED` |
| Counter increments (likes, views) | Atomic UPDATE — neither lock |
| Distributed leader election | Different tool — Redis / etcd / Zookeeper |

**Failure handling:**

| Lock | Failure | Handler |
|---|---|---|
| Optimistic | `StaleObjectError` | Retry (idempotent) or surface conflict to user |
| Pessimistic | `LockWaitTimeout` | Retry with backoff; alert on growth |
| Pessimistic | Deadlock (Postgres detects) | One TX is killed; caller retries |
| Pessimistic | Long lock holding | Timeout the transaction (`statement_timeout`) |

**Postgres specifics:**

| Setting | Effect |
|---|---|
| `lock_timeout` | Max wait for any lock |
| `statement_timeout` | Max time for a statement |
| `deadlock_timeout` | How often to check for deadlocks |
| `idle_in_transaction_session_timeout` | Kill connections holding locks idle |
| MVCC | Readers don't block writers; writers don't block readers |

> Postgres MVCC means **`SELECT` never blocks on writes** unless you explicitly take `FOR UPDATE`.

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Pessimistic lock outside a transaction | No-op — lock released immediately |
| Long-running TX holding `FOR UPDATE` | Other workers stall |
| Optimistic without retry logic | Random save failures bubble to user |
| Optimistic with non-idempotent retry | Retry causes double-charge |
| `find` then `lock` (separate queries) | Race window between read and lock |
| Forgetting `lock_version` column | Optimistic locking silently disabled |
| Pessimistic + N rows in random order | Deadlock — lock in consistent order |
| Mixing FOR UPDATE with FOR NO KEY UPDATE | FK locks vs row locks confusion |

**Lock ordering — deadlock prevention:**

```ruby
# Always lock rows in the same order across the codebase
ids = [account_a.id, account_b.id].sort
Account.where(id: ids).lock.find_each { |a| ... }
```

**Decision matrix:**

| Need | Pick |
|---|---|
| Rare conflicts, app-level retry possible | **Optimistic** |
| Hot row, money / inventory | **Pessimistic** |
| Read-then-write with branching logic | **Pessimistic** (or optimistic if rare) |
| Pure arithmetic update | **Neither** — atomic UPDATE |
| Job queue | **`FOR UPDATE SKIP LOCKED`** |
| Distributed coordination | Different tool (Redis lock, Zookeeper, etc.) |

**Cross-references:**

- Postgres MVCC + transactions: [transactions_isolation_*.md](transactions_isolation_levels_acid.md)
- PgBouncer (locks + connection pooling interaction): [pgbouncer_*.md](pgbouncer_transaction_mode_vs_session_mode.md)
- Idempotency (when retries are involved): [idempotency_*.md](../../distributed_systems/idempotency_key_exactly_once_deduplication.md)

**Rule of thumb:** **Default to optimistic** with `lock_version` for low-contention rows + clear retry semantics. Switch to **pessimistic `FOR UPDATE`** when conflicts are common and the critical section is short (money, inventory, hot counters). Reach for **`SKIP LOCKED`** in job queues. **Atomic single-statement UPDATEs beat both** when the change is pure arithmetic — never read-modify-write what the database can compute in one shot.
