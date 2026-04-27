### Eventual Consistency and CRDTs

**Eventual consistency:**
- If no new writes occur, all replicas will eventually converge to the same value
- Reads may return stale data temporarily
- Trades real-time consistency for availability and latency
- Used by: DynamoDB, Cassandra, S3, DNS

**Read-your-writes consistency:**
- After a write, the same user always sees their own update
- Other users may see stale data temporarily
- Implementation: route reads to the same replica that handled the write, or use version tokens

**Conflict resolution (when replicas diverge):**

| Strategy | How | Use case |
|----------|-----|----------|
| Last-Write-Wins (LWW) | Highest timestamp wins | Simple, some data loss |
| Version vectors | Track causality per replica | Detect concurrent writes |
| Application-level merge | Custom logic resolves conflicts | Domain-specific (shopping cart) |
| CRDTs | Data structure that auto-merges | Counters, sets, registers |

**CRDTs (Conflict-Free Replicated Data Types):**
- Data structures that can be replicated and merged without coordination
- All replicas converge to the same state regardless of merge order
- No need for consensus protocol

**Common CRDTs:**

**G-Counter (grow-only counter):**
- Each replica maintains its own counter
- Merge: take max of each replica's counter
- Total: sum all replica counters
```
Replica A: {A: 5, B: 0}
Replica B: {A: 3, B: 7}
Merge:     {A: 5, B: 7}  -> total = 12
```

**PN-Counter (positive-negative counter):**
- Two G-Counters: one for increments, one for decrements
- Value = sum(increments) - sum(decrements)
- Use for: like counts, inventory (approximate)

**G-Set (grow-only set):**
- Elements can only be added, never removed
- Merge: union of all sets

**OR-Set (observed-remove set):**
- Add and remove supported
- Each add tagged with unique ID
- Remove only removes observed tags
- Use for: shopping carts, user lists

**LWW-Register (last-write-wins register):**
- Each write has a timestamp
- Merge: keep the value with highest timestamp
- Simple but can lose concurrent writes

**Where CRDTs are used:**
- Redis CRDT (enterprise) - multi-region replication
- Riak - distributed database built on CRDTs
- Collaborative editing (simpler version of OT)
- Offline-first mobile apps (merge when reconnected)

**Rule of thumb:** Eventual consistency is fine for most reads (counters, feeds, caches). Use CRDTs when you need concurrent writes without coordination. LWW is simplest but lossy. PN-Counter for distributed counters. OR-Set for collections with add/remove.
