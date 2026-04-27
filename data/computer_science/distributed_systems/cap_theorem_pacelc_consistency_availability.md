### CAP Theorem and PACELC

**CAP Theorem:**
During a network **partition** (P), you must choose between:
- **Consistency (C)** - every read gets the most recent write (or an error)
- **Availability (A)** - every request gets a response (but may be stale)

You can't have both C and A during a partition.

**In practice:**
- Network partitions WILL happen (you can't choose "no partition")
- The real choice is: CP or AP when a partition occurs

| Choice | During partition | Example systems |
|--------|-----------------|-----------------|
| **CP** | Reject requests to maintain consistency | PostgreSQL, MongoDB, Redis, etcd, ZooKeeper |
| **AP** | Serve stale data to remain available | Cassandra, DynamoDB, CouchDB, DNS |

**PACELC (more nuanced):**
- If **Partition**: choose **A** or **C** (CAP)
- **Else** (no partition): choose **Latency** or **Consistency**

| System | P: A or C | E: L or C |
|--------|-----------|-----------|
| DynamoDB | A | L (eventually consistent reads are faster) |
| Cassandra | A | L |
| PostgreSQL | C | C |
| MongoDB | C | C |
| Cosmos DB | Configurable | Configurable (5 consistency levels) |

**Consistency models (spectrum):**
- **Strong consistency** - reads always return latest write (linearizability)
- **Sequential consistency** - operations appear in some total order consistent with each client's order
- **Causal consistency** - causally related operations ordered, concurrent operations unordered
- **Eventual consistency** - given enough time with no new writes, all replicas converge
- **Read-your-writes** - you always see your own latest write

**When to choose what:**
- **Strong consistency**: banking, inventory (can't oversell), leader election
- **Eventual consistency**: social media feed, view counters, DNS, shopping cart
- **Causal consistency**: chat messages (must see messages in causal order)

**Rule of thumb:** Most web applications can tolerate eventual consistency for reads (serve slightly stale data for speed). Use strong consistency only where correctness requires it (financial transactions, unique constraints). The real choice is usually latency vs consistency, not availability vs consistency.
