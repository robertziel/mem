### Transaction Isolation Levels

**ACID properties:**
- **Atomicity** - all or nothing (transaction fully commits or fully rolls back)
- **Consistency** - transaction brings DB from one valid state to another
- **Isolation** - concurrent transactions don't interfere
- **Durability** - committed data survives crashes (written to disk)

**Isolation levels (weakest to strongest):**

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Performance |
|-------|-----------|-------------------|-------------|-------------|
| Read Uncommitted | Possible | Possible | Possible | Fastest |
| Read Committed | Prevented | Possible | Possible | Fast |
| Repeatable Read | Prevented | Prevented | Possible* | Medium |
| Serializable | Prevented | Prevented | Prevented | Slowest |

*PostgreSQL's Repeatable Read also prevents phantom reads (it uses snapshot isolation).

**Read phenomena explained:**
- **Dirty read** - read uncommitted data from another transaction (they might rollback)
- **Non-repeatable read** - read same row twice, get different values (another tx committed between reads)
- **Phantom read** - re-execute a query, get different rows (another tx inserted/deleted rows)

**PostgreSQL default: Read Committed**
- Each statement sees a snapshot as of statement start
- Two queries in the same transaction may see different data
- Good for most web applications

**PostgreSQL Repeatable Read (snapshot isolation):**
- Transaction sees a snapshot as of transaction start
- Consistent view throughout the transaction
- Serialization failure if concurrent transactions modify same data

**Serializable:**
- Transactions appear to execute one at a time
- Prevents all anomalies
- Higher abort rate (must retry on serialization failure)
- PostgreSQL uses Serializable Snapshot Isolation (SSI)

**MVCC (Multi-Version Concurrency Control):**
- PostgreSQL, MySQL InnoDB, Oracle use MVCC
- Each row has multiple versions (with transaction IDs)
- Readers don't block writers, writers don't block readers
- Old versions cleaned up by vacuum (PostgreSQL) or purge (MySQL)

**Choosing isolation level:**
- **Read Committed** - default for most web apps (balance of safety and performance)
- **Repeatable Read** - when transaction needs consistent view (reports, financial calculations)
- **Serializable** - when correctness is critical (inventory, booking systems)

**Handling serialization failures:**
```python
MAX_RETRIES = 3
for attempt in range(MAX_RETRIES):
    try:
        with db.transaction(isolation='serializable'):
            # business logic
            db.commit()
        break
    except SerializationFailure:
        if attempt == MAX_RETRIES - 1:
            raise
        continue  # retry the transaction
```

**Rule of thumb:** Read Committed is fine for most web apps. Use Repeatable Read for consistent snapshots. Serializable only when correctness is critical (and handle retries). Understand MVCC to reason about concurrent behavior.
