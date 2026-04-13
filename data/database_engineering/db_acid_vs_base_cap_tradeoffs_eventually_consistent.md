### ACID vs BASE & CAP Tradeoffs

**ACID (traditional relational databases):**
| Property | Meaning | Example |
|----------|---------|---------|
| **Atomicity** | All or nothing — transaction fully commits or fully rolls back | Transfer: debit + credit both succeed or both fail |
| **Consistency** | Transaction brings DB from one valid state to another | Balance can't go negative (constraint enforced) |
| **Isolation** | Concurrent transactions don't interfere | Two transfers don't see each other's intermediate state |
| **Durability** | Committed data survives crashes | Written to WAL before acknowledging |

**BASE (NoSQL / distributed databases):**
| Property | Meaning |
|----------|---------|
| **Basically Available** | System guarantees availability (may return stale data) |
| **Soft state** | State may change over time without input (replication lag) |
| **Eventually consistent** | Given enough time without writes, all replicas converge |

**ACID vs BASE:**
| Feature | ACID | BASE |
|---------|------|------|
| Consistency | Strong (immediate) | Eventual |
| Availability | May sacrifice for consistency | Prioritized |
| Complexity | Simpler to reason about | Requires conflict resolution |
| Performance | Lower (locking, synchronous) | Higher (async, no locks) |
| Use case | Financial, inventory, bookings | Social media, caching, analytics |
| Examples | PostgreSQL, MySQL | DynamoDB, Cassandra, MongoDB (default) |

**ACID consistency vs CAP consistency:**
```
ACID Consistency: "After a transaction, all constraints are satisfied"
  → Referential integrity, CHECK constraints, unique constraints
  → About DATA INTEGRITY within one database

CAP Consistency: "All nodes see the same data at the same time"
  → After a write, all replicas return the latest value
  → About REPLICATION across distributed nodes

They are DIFFERENT concepts that share the same word.
```

**When to choose ACID:**
- Money: bank transfers, payments, billing
- Inventory: stock counts, seat reservations
- User accounts: registration, role changes
- Any "can't afford to be wrong" operation

**When to choose BASE:**
- Social feeds: eventual consistency is fine (slight delay OK)
- View counters: approximate counts acceptable
- Shopping carts: eventual sync across devices
- Caching: stale data is better than no data
- Analytics: can reprocess if slightly off

**Mixing ACID and BASE in one system:**
```
Order Service: ACID (PostgreSQL)
  → Order creation, payment processing must be strictly consistent

Recommendation Service: BASE (DynamoDB/Redis)
  → "Users also bought" can be slightly stale

Notification Service: BASE (SQS)
  → Email can be delayed, duplicate OK (idempotent)
```

**Rule of thumb:** ACID for data that must be correct (money, inventory, auth). BASE for data that can tolerate staleness (feeds, recommendations, analytics). Most production systems use BOTH: ACID for the core, BASE for the edges. ACID "consistency" ≠ CAP "consistency" — know the difference in interviews.
