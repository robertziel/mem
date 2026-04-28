### ACID vs BASE & CAP Tradeoffs

**Definition:** **ACID** is the relational-DB transaction guarantee model (atomicity, consistency, isolation, durability). **BASE** is the eventual-consistency model used by many distributed NoSQL stores (basically available, soft state, eventually consistent). **CAP** is a related but distinct concept about replication. **Most production systems use BOTH**: ACID for the core (money, inventory), BASE for the edges (feeds, analytics).

**ACID — the relational guarantee model:**

| Letter | Property | Example |
|---|---|---|
| **A** — Atomicity | All or nothing — TX commits fully or rolls back | Transfer: debit + credit both succeed or both fail |
| **C** — Consistency | TX brings DB from one valid state to another | Balance can't go negative (constraint) |
| **I** — Isolation | Concurrent TXs don't interfere | Two transfers don't see each other's intermediate state |
| **D** — Durability | Committed data survives crash | Written to WAL before ACK |

**BASE — the eventual-consistency model:**

| Letter | Property |
|---|---|
| **BA** — Basically Available | System guarantees availability (may return stale) |
| **S** — Soft state | State may change over time without input (replication) |
| **E** — Eventually consistent | Given quiescence, all replicas converge |

**ACID vs BASE — side by side:**

| Property | **ACID** | **BASE** |
|---|---|---|
| Consistency | Strong (immediate) | Eventual |
| Availability | May sacrifice for consistency | Prioritized |
| Complexity | Simpler to reason about | Requires conflict resolution |
| Performance | Lower (locking, sync) | Higher (async, no locks) |
| Use case | Financial, inventory, bookings | Social media, caching, analytics |
| Examples | PostgreSQL, MySQL, Oracle | DynamoDB, Cassandra, MongoDB (default) |

**ACID consistency vs CAP consistency — the confusion:**

| Concept | What it means |
|---|---|
| **ACID consistency** | After a transaction, all DB constraints satisfied (FK, CHECK, unique) — about **data integrity** within ONE database |
| **CAP consistency** | All replicas see same data at same time — about **replication** across distributed nodes |

> **They share the same word but are different concepts.** Don't conflate them in interviews.

**When to choose ACID:**

| Use case | Why |
|---|---|
| **Money** | Bank transfers, payments, billing |
| **Inventory** | Stock counts, seat reservations |
| **Auth / accounts** | Registration, role changes |
| **Unique constraints** | Email, username uniqueness |
| **Audit trails** | Compliance |
| **Bookings** | Concert seats, hotel rooms |
| Any "can't afford to be wrong" operation | Default for these |

**When to choose BASE:**

| Use case | Why |
|---|---|
| **Social feeds** | Eventual consistency fine (slight delay OK) |
| **View counters** | Approximate counts acceptable |
| **Shopping carts** | Eventual sync across devices |
| **Caching** | Stale beats no-data |
| **Analytics** | Can reprocess if slightly off |
| **Recommendations** | Slightly stale fine |
| **Event ingestion** | Log everything, eventually aggregate |

**Mixing ACID and BASE in one system (most apps do this):**

```
   ┌────────────────────────────────────┐
   │ Order Service                       │ ← ACID (Postgres)
   │   payment, inventory, order state   │
   └─────────────────┬──────────────────┘
                     │ (events on commit)
                     ▼
   ┌────────────────────────────────────┐
   │ Recommendation Service              │ ← BASE (Redis / DynamoDB)
   │   "users also bought" can be stale  │
   └────────────────────────────────────┘
                     ▲
                     │
   ┌────────────────────────────────────┐
   │ Notification Service (SQS + Lambda) │ ← BASE (delays + retries OK)
   │   email, push, slack                  │
   └────────────────────────────────────┘
```

**ACID isolation levels — the spectrum:**

| Level | Dirty Read | Non-Repeatable Read | Phantom |
|---|---|---|---|
| **Read Uncommitted** | Possible | Possible | Possible |
| **Read Committed** (Postgres default) | Prevented | Possible | Possible |
| **Repeatable Read** | Prevented | Prevented | Possible (Postgres prevents) |
| **Serializable** | Prevented | Prevented | Prevented |

**BASE consistency models (granular spectrum):**

| Model | Detail |
|---|---|
| **Linearizable / strong** | Reads see latest write globally |
| **Causal** | Cause-before-effect preserved |
| **Read-your-writes** | A user sees their own writes |
| **Monotonic reads** | Never see older state after newer |
| **Eventual** | Replicas converge eventually |

**Common BASE patterns:**

| Pattern | Detail |
|---|---|
| **Idempotent consumer** | Re-process same message → same result |
| **Saga** | Distributed TX via compensating actions |
| **CRDT** | Auto-merging data structures |
| **Read replicas with lag tolerance** | Async replicas |
| **Outbox pattern** | DB row + event in same TX |
| **Event sourcing** | Append-only log of facts |

**CAP — quick reminder:**

| Property | What |
|---|---|
| **C** | Consistency (linearizable) |
| **A** | Availability |
| **P** | Partition tolerance |
| **CAP says** | Pick C or A during partition |
| **PACELC** | Even without partition: latency vs consistency |

**Transaction examples:**

```sql
-- ACID transfer (Postgres)
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
INSERT INTO transfers (from, to, amount) VALUES (1, 2, 100);
COMMIT;
-- All four operations atomic; either all happen or none

-- DynamoDB (BASE) — multi-item operation
TransactWriteItems({
  TransactItems: [
    { Update: { Key: { id: 1 }, UpdateExpression: 'SET balance = balance - :amt', ... } },
    { Update: { Key: { id: 2 }, UpdateExpression: 'SET balance = balance + :amt', ... } },
    { Put: { TableName: 'transfers', Item: { id: '...', from: 1, to: 2, amount: 100 } } }
  ]
})
-- DynamoDB transactions exist but cost 2x and have item limits
```

**Decision matrix — by criticality:**

| Need | Pick | Why |
|---|---|---|
| Money / inventory / accounts | **ACID** | Can't be wrong |
| Social feed / counters | **BASE** | Stale is OK |
| Cache | **BASE** | Stale > none |
| Auth state | **ACID** | Sessions must be consistent |
| Analytics / aggregates | **BASE** | Reprocess if needed |
| Configuration changes | **ACID** | Must be consistent across services |
| User profile updates | RYW + eventual | UX-friendly subset |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Using BASE for money | Real bugs, lost transactions |
| Using ACID where it doesn't fit (mass logging) | Slow, contended |
| Confusing ACID consistency with CAP consistency | Wrong design |
| Assuming "NoSQL = eventual consistency only" | Many have configurable strong consistency |
| Reading from replica then writing to primary | Stale reads → corrupt writes |
| No idempotency in BASE consumer | Duplicates corrupt state |
| Not designing for replication lag | Users see their writes disappear |
| Treating Postgres replication as ACID | Replicas are eventually consistent |

**Cross-references:**

- CAP / PACELC: [cap_theorem_*.md](../distributed_systems/cap_theorem_pacelc_consistency_availability.md)
- Transaction isolation levels: [transaction_isolation_*.md](transaction_isolation_levels_acid_mvcc_serializable.md)
- Eventual consistency + CRDTs: [eventual_consistency_*.md](../distributed_systems/eventual_consistency_crdts_lww_conflict_resolution.md)
- SQL vs NoSQL: [sql_vs_nosql_*.md](sql/sql_vs_nosql_choosing_relational_document_database.md)
- Idempotency: [idempotency_*.md](../distributed_systems/idempotency_key_exactly_once_deduplication.md)

**Rule of thumb:** **ACID for data that must be correct** (money, inventory, auth). **BASE for data that can tolerate staleness** (feeds, recommendations, analytics, caching). **Most production systems use BOTH** — ACID for the core, BASE for the edges. **ACID "consistency" ≠ CAP "consistency"** — distinct concepts that share a word. Always pair **at-least-once delivery** with **idempotent consumers** in BASE systems.
