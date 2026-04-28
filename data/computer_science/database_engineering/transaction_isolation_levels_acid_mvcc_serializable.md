### Transaction Isolation Levels — ACID, MVCC, Serializable

**Definition:** **Isolation levels** define what concurrent transactions can see about each other. Stronger isolation = fewer anomalies but slower / more conflicts. Most web apps run **Read Committed** (the default in Postgres, Oracle, SQL Server). MVCC databases skip blocking by keeping multiple row versions.

**ACID — the four guarantees:**

| Letter | Property | Detail |
|---|---|---|
| **A**tomicity | All-or-nothing | Transaction commits fully or rolls back fully |
| **C**onsistency | Valid → valid | Transitions DB from one valid state to another (constraints, FKs) |
| **I**solation | Concurrency-safe | Concurrent TXs don't corrupt each other |
| **D**urability | Survives crash | Committed data persisted to disk (WAL) |

**Four standard isolation levels — strongest at the bottom:**

| Level | Dirty Read | Non-Repeatable Read | Phantom | Lost Update | Serializable Anomaly |
|---|---|---|---|---|---|
| **Read Uncommitted** | Possible | Possible | Possible | Possible | Possible |
| **Read Committed** | Prevented | Possible | Possible | Possible | Possible |
| **Repeatable Read** | Prevented | Prevented | Possible* | Prevented* | Possible |
| **Serializable** | Prevented | Prevented | Prevented | Prevented | Prevented |

> *Postgres Repeatable Read prevents phantoms (uses snapshot isolation) and detects lost updates as serialization failures.

**Read phenomena explained:**

| Phenomenon | What happens | Example |
|---|---|---|
| **Dirty read** | Read **uncommitted** data from another TX | TX-A reads X=5 from TX-B that hasn't committed; TX-B rolls back; TX-A used phantom data |
| **Non-repeatable read** | Same row read twice gives different values | TX-A reads X=5; TX-B updates X=10 commits; TX-A reads X=10 |
| **Phantom read** | Same query returns different rows | TX-A: `SELECT count(*) WHERE region='EU'` → 5; TX-B inserts EU row, commits; TX-A re-runs → 6 |
| **Lost update** | Two TXs overwrite each other's writes | A and B both read X=5; A writes 6, B writes 7; A's update gone |
| **Write skew** | Two TXs each read disjoint rows + write violating an invariant | Two doctors both check "≥1 oncall," both go off-duty |

**Database defaults:**

| Database | Default level |
|---|---|
| **Postgres** | Read Committed |
| **MySQL InnoDB** | Repeatable Read |
| **Oracle** | Read Committed |
| **SQL Server** | Read Committed (snapshot variant) |
| **CockroachDB** | Serializable |
| **Spanner** | Serializable (external consistency) |
| **DynamoDB** | Eventual consistency by default; Strong consistency opt-in |

**MVCC — Multi-Version Concurrency Control:**

| Property | Detail |
|---|---|
| Each row has multiple versions | Tagged with TX IDs |
| Readers see snapshot at TX/statement start | No locking for reads |
| **Readers don't block writers; writers don't block readers** | Big throughput win |
| Old versions cleaned by VACUUM (Postgres) / purge (InnoDB) | Background |
| Used by | Postgres, MySQL InnoDB, Oracle, SQL Server (snapshot mode) |

**MVCC visualization:**

```
Time →
T1 (writes X=1, commits)
T2 (writes X=2, commits)
T3 (writes X=3, commits, but X column has 3 versions: 1, 2, 3 with TX IDs)

  Reader at T2 sees X=1 (snapshot before T2 wrote)
  Reader at T3 sees X=2 (snapshot before T3 wrote)
  Reader after T3 commit sees X=3
```

| Operation | Lock-free? |
|---|---|
| `SELECT` (without FOR UPDATE) | **Yes** — never blocks writers |
| `INSERT`, `UPDATE`, `DELETE` | Locks rows it touches |
| `SELECT FOR UPDATE` | Locks rows |
| Write conflicts | Detected at commit time |

**Postgres isolation specifics:**

| Level | Detail |
|---|---|
| **Read Committed** (default) | Each statement sees snapshot at statement start; two queries in same TX may see different data |
| **Repeatable Read** | TX sees snapshot at TX start; serialization failures on conflicting writes |
| **Serializable** | Repeatable Read + serialization anomaly detection (SSI); higher abort rate |

**Choosing isolation:**

| Need | Level |
|---|---|
| Most web traffic | **Read Committed** |
| Reports / financial calc requiring stable view | **Repeatable Read** |
| Inventory, booking, accounting where invariants matter | **Serializable** |
| Cross-shard / distributed transactions | Spanner / CockroachDB Serializable |
| Fast eventually consistent reads | Eventual consistency (Cassandra / Dynamo) |

**Handling serialization failures (retry pattern):**

```python
MAX_RETRIES = 3
for attempt in range(MAX_RETRIES):
    try:
        with db.transaction(isolation='serializable'):
            balance = db.get_balance(account_id)
            db.update_balance(account_id, balance - 100)
            db.commit()
        break
    except SerializationFailure:
        if attempt == MAX_RETRIES - 1:
            raise
        time.sleep(0.1 * 2**attempt)   # exponential backoff
```

| Property | Detail |
|---|---|
| Higher level → more aborts | Trade-off |
| Always wrap in retry loop | Caller responsibility |
| Idempotent operation | Retry safe |
| Use exponential backoff | Avoid thundering herd |

**Locking modes (Postgres):**

| Lock | Acquired by | Conflicts with |
|---|---|---|
| `ACCESS SHARE` | `SELECT` | `ACCESS EXCLUSIVE` |
| `ROW SHARE` | `SELECT FOR UPDATE/SHARE` | EXCLUSIVE locks |
| `ROW EXCLUSIVE` | `INSERT/UPDATE/DELETE` | DDL locks |
| `SHARE UPDATE EXCLUSIVE` | `CREATE INDEX CONCURRENTLY` | DDL |
| `SHARE` | `CREATE INDEX` (non-concurrent) | Writes |
| `EXCLUSIVE` | Refreshing matview | Most others |
| `ACCESS EXCLUSIVE` | `DROP TABLE`, `ALTER TABLE` | Everything |

**Optimistic vs Pessimistic — the practical choice:**

| Approach | When |
|---|---|
| **Optimistic** (version column) | Low contention, retry on conflict |
| **Pessimistic** (`FOR UPDATE`) | High contention, money / inventory |
| **Atomic UPDATE** (`balance = balance - 100`) | Pure arithmetic, no read needed |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Read Committed + read-then-write logic | Lost updates |
| `FOR UPDATE` outside a TX | No-op |
| Long-running TX | Bloats MVCC tables, blocks VACUUM |
| Serializable without retry logic | Random failures |
| Forgetting `idle_in_transaction_session_timeout` | Connections holding locks forever |
| `SELECT` in Repeatable Read seeing stale data | Expected — that's the point |
| Mixing isolation levels | Confusing |
| Assuming MySQL Repeatable Read = Postgres | MySQL has gap locks; Postgres uses snapshots |
| Believing "serializable = atomic across requests" | Only within ONE TX |

**Two-phase commit (2PC) — distributed:**

| Phase | Detail |
|---|---|
| 1. Prepare | All nodes vote "yes" or "no" |
| 2. Commit / abort | Coordinator broadcasts decision |
| Use case | Cross-DB transactions (rare) |
| Drawbacks | Blocking; coordinator failure |
| Modern alternative | Sagas, eventual consistency, Spanner-style consensus |

**Decision matrix:**

| Pattern | Pick |
|---|---|
| Single-DB web app | Read Committed (default) |
| Read-then-write with stale-detection | Repeatable Read OR optimistic locking |
| Money / inventory / reservations | Serializable + retry, or Pessimistic locks |
| Rolling reports | Repeatable Read |
| Cross-region writes | Eventual consistency + CRDT or saga |
| Distributed strict consistency | Spanner / CockroachDB |

**Cross-references:**

- Postgres locking (optimistic vs pessimistic): [locking_*.md](postgresql/locking_optimistic_vs_pessimistic.md)
- PgBouncer + connection pool interaction: [pgbouncer_*.md](postgresql/pgbouncer_transaction_mode_vs_session_mode.md)
- MVCC details (vacuum, bloat): [innodb_internals.md](innodb_internals.md)
- CRDT / eventual consistency: [eventual_consistency_*.md](../distributed_systems/eventual_consistency_crdts_lww_conflict_resolution.md)

**Rule of thumb:** **Read Committed is the right default for most web apps.** Step up to **Repeatable Read** for stable snapshots in reports and read-modify-write paths; step up to **Serializable** when correctness is paramount (inventory, money) — and always wrap in a **retry loop**. **MVCC** means readers don't block writers in Postgres / MySQL InnoDB / Oracle — but write conflicts still need a strategy (optimistic version column, pessimistic FOR UPDATE, or atomic UPDATEs).
