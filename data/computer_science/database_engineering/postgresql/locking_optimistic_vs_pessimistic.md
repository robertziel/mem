### Optimistic vs pessimistic locking

### Optimistic locking

- Uses a version column such as `lock_version`
- Detects conflicts when saving
- Raises an error such as `StaleObjectError` instead of blocking
- Best when contention is low

### Pessimistic locking

- Uses database row locks such as `FOR UPDATE`
- Blocks competing transactions from changing the row
- Best when contention is high and the critical section is short

### Rails angle

- Optimistic locking is built into ActiveRecord with `lock_version`
- Pessimistic locking is usually done with `lock` or `with_lock`

**Rule of thumb:** Use optimistic locking by default; use pessimistic locking only when conflicts are frequent and the work stays inside a short DB transaction.
