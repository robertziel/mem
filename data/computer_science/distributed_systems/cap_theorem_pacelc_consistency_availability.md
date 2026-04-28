### CAP Theorem & PACELC — Consistency, Availability, Partitions

**Definition:** **CAP** says during a network **partition** you must choose **C**onsistency or **A**vailability — you can't have both. **PACELC** extends it: even **without** a partition, there's a tradeoff between **L**atency and **C**onsistency. The real engineering choice is rarely C-vs-A; it's usually **latency vs consistency**.

**CAP Theorem (the canonical statement):**

| Letter | Property |
|---|---|
| **C** | Consistency — every read returns the most recent write (or an error) |
| **A** | Availability — every request returns a response (possibly stale) |
| **P** | Partition tolerance — system survives network splits |

> **Network partitions WILL happen** in any distributed system. You can't choose "no partitions." The real choice is **CP or AP** when one occurs.

**CAP buckets — practical:**

| Choice | During partition | Examples |
|---|---|---|
| **CP** | Reject requests to maintain consistency | Postgres, MongoDB, Redis (mostly), etcd, ZooKeeper, ZooKeeper, HBase |
| **AP** | Serve stale data to remain available | Cassandra, DynamoDB, CouchDB, DNS, S3 |
| **CA** (theoretical only) | Single-node systems; can't actually exist in distributed | — |

**PACELC — the more nuanced version:**

```
   If Partition (P):  choose Availability (A) or Consistency (C)        [CAP]
   Else (E):          choose Latency (L) or Consistency (C)              [PACELC extension]
```

| System | P: A or C | E: L or C |
|---|---|---|
| **DynamoDB** | A | L (eventually consistent reads are faster + cheaper) |
| **Cassandra** | A | L |
| **Postgres** | C | C |
| **MongoDB** | C | C (with default config) |
| **Cosmos DB** | Configurable | Configurable (5 levels) |
| **Spanner** | C (synchronous replication globally) | C (sacrifices some latency for consistency) |
| **CockroachDB** | C | C |
| **Riak** | A | L |

**Consistency models — full spectrum (strong → weak):**

| Model | Detail | Example |
|---|---|---|
| **Linearizable** | Global total order; reads see latest write | Single-master DBs (Postgres, etcd) |
| **Sequential** | All clients see same order; not real-time | RDBMS at Serializable |
| **Causal** | Cause-before-effect preserved | Riak, Cosmos DB option |
| **Read-your-writes** | A user sees their own writes | UX-friendly subset |
| **Monotonic reads** | Reader never sees older state after newer | Replica routing |
| **Eventual** | Replicas converge eventually | DynamoDB, Cassandra, S3, DNS |

**Linearizable vs Sequential vs Causal:**

| Property | Linearizable | Sequential | Causal |
|---|---|---|---|
| Real-time order | ✅ | ❌ | ❌ |
| All clients agree on order | ✅ | ✅ | Per-causal |
| Implementation cost | Highest | Medium | Medium |
| Use case | Banking, leader election | Strong batch consistency | Most distributed apps |

**When to choose each level:**

| Need | Pick |
|---|---|
| **Banking / inventory / unique constraints** | Linearizable / strong |
| **Stock prices, leader election** | Linearizable |
| **Social feed, view counters, chat** | Causal or eventual |
| **DNS, S3, CDN edge caches** | Eventual |
| **Shopping cart** | Eventual + CRDT (OR-Set) |
| **User-facing reads after own write** | Read-your-writes |
| **Distributed configuration** | Linearizable (etcd, Consul) |

**Real-world examples:**

| Scenario | Best fit |
|---|---|
| Account balance | **Linearizable** (no double-spend) |
| Like count | Eventual (off by 1 OK) |
| Hotel booking | Linearizable (no double-book) |
| Friend list | Eventual / causal |
| Distributed lock | Linearizable (etcd) |
| Shopping cart | Eventual (CRDT) |
| Comment thread | Causal |
| Search index | Eventual |
| Audit log | Linearizable + immutable |

**Why "AP vs CP" is misleading:**

| Reality | Detail |
|---|---|
| Most systems aren't pure AP or CP | Behavior varies by operation |
| Cassandra has tunable consistency (per-query) | `QUORUM`, `ALL`, `ONE`, etc. |
| MongoDB has read concerns / write concerns | Configurable |
| Cosmos DB has 5 levels | Per-operation choice |
| Postgres can have async replicas | Mixed model |
| **Better question**: per-operation consistency needs | Not "which DB" |

**Tunable consistency (Cassandra example):**

```sql
-- Strong consistency (slower)
SELECT * FROM users USING CONSISTENCY QUORUM WHERE id = 42;

-- Eventual consistency (faster)
SELECT * FROM users USING CONSISTENCY ONE WHERE id = 42;

-- Maximum durability
INSERT INTO users (...) USING CONSISTENCY ALL;
```

**The Spanner / CockroachDB twist:**

| Property | Detail |
|---|---|
| **Globally distributed + linearizable** | Sounds impossible (CAP) |
| Achievable via | Atomic clocks (Spanner), HLC (CockroachDB) |
| Trade-off | Higher write latency (cross-region commits) |
| Not "violating CAP" | Just careful engineering of partition handling |
| Use case | Money + global presence |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Treating "AP" as "no consistency at all" | Apps need at least RYW |
| Treating "CP" as "no partitions tolerated" | All distributed systems have to handle |
| Choosing Postgres for analytics-only workload | OLTP shape, but easy to start |
| Choosing DynamoDB but expecting strong consistency | Default is eventually consistent |
| Forgetting clock skew in distributed timestamps | LWW conflicts, lost writes |
| Single-region "consistent" with no failover | Outage on region failure |
| Picking C vs A philosophically | Per-operation, per-feature reality |

**Decision matrix:**

| Concern | Approach |
|---|---|
| Bank transfer | Linearizable + 2PC OR Spanner-style consensus |
| User profile | Eventual (with RYW for own user) |
| Leader election | etcd / ZooKeeper (CP) |
| DNS / CDN edge | Eventual |
| Inventory | Linearizable + retry |
| Shopping cart | Eventual + CRDT |
| Social feed | Eventual |
| Real-time bidding | Linearizable + low latency (hard) |

**Cross-references:**

- Eventual consistency + CRDTs: [eventual_consistency_*.md](eventual_consistency_crdts_lww_conflict_resolution.md)
- Distributed locks: [distributed_locks_*.md](distributed_locks_redis_redlock_fencing_token.md)
- Consensus protocols (Raft / Paxos): [consensus_raft_*.md](consensus_raft_paxos_leader_election.md)
- Transaction isolation (single-DB version of consistency): [transaction_isolation_*.md](../database_engineering/transaction_isolation_levels_acid_mvcc_serializable.md)
- SQL vs NoSQL: [sql_vs_nosql_*.md](../database_engineering/sql/sql_vs_nosql_choosing_relational_document_database.md)

**Rule of thumb:** **Most apps tolerate eventual consistency for reads** (slightly stale data, faster). Use **strong consistency** only where correctness requires it (financial, unique constraints, leader election). The real choice is **latency vs consistency**, not availability vs consistency. Network partitions are inevitable — design with **AP or CP per operation**, not as a global choice.
