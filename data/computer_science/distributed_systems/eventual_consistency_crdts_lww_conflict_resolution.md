### Eventual Consistency, CRDTs, Conflict Resolution

**Definition:** **eventual consistency** trades real-time consistency for availability + low latency: if no new writes occur, all replicas eventually converge. **CRDTs** (Conflict-Free Replicated Data Types) are data structures designed to merge automatically without coordination. **LWW** is the simplest (and lossiest) merge.

**Consistency models — the spectrum:**

| Model | Promise | Use case | Examples |
|---|---|---|---|
| **Linearizable** | Single global timeline; reads see latest write | Banking, leader election | Spanner, etcd |
| **Sequential** | All clients see same order; not real-time | Strong but slower | RDBMS at Serializable |
| **Causal** | Cause-before-effect preserved | Many distributed apps | Riak, Cosmos DB |
| **Read-your-writes** | A user sees their own writes | UX-friendly subset | Many APIs |
| **Monotonic reads** | A reader never sees older state after newer | Replica routing | Many CDNs |
| **Eventual** | Replicas converge eventually | Most-scalable | DynamoDB, Cassandra, S3, DNS |

**Eventual consistency — what it actually means:**

| Property | Detail |
|---|---|
| Replicas can diverge briefly | Window depends on infra |
| Reads may return stale data | Sometimes minutes |
| **All replicas converge given quiescence** | If writes stop, agreement happens |
| Trades for | Availability + low latency under partition |
| Used by | Cassandra, DynamoDB, S3, DNS, CDN edge caches |

**Read-your-writes — the UX bandage:**

| Approach | Detail |
|---|---|
| Route reads to writer's replica | Sticky routing |
| Use version tokens | Caller sends "my last write was v17" |
| Read from primary for short window | Until replication catches up |
| Cache the write in caller's session | Show user's own data immediately |

**Why CRDTs exist — coordinated merge is expensive:**

```
Without CRDT:
  Replicas A, B see different writes
  → Need consensus protocol to agree (Raft, Paxos)
  → Slow, requires majority alive

With CRDT:
  Replicas A, B see different writes
  → Each does local merge using CRDT rules
  → Convergence guaranteed by data-structure design
  → No coordination, no consensus
```

| Property | Detail |
|---|---|
| Mathematically guaranteed convergence | Same end state regardless of merge order |
| No coordination required | Local merging |
| Strong eventual consistency | Stronger than plain eventual |
| Trade-off | Limited operations (only commutative / idempotent ones) |

**Conflict resolution strategies:**

| Strategy | Mechanism | Use case | Risk |
|---|---|---|---|
| **Last-Write-Wins (LWW)** | Highest timestamp wins | Simple registers | Silent data loss |
| **Version vectors** | Per-replica counters track causality | Detect concurrent writes | Bigger metadata |
| **Application merge** | Custom logic per type | Shopping cart, document | Domain code |
| **CRDT** | Auto-merge by type | Counters, sets | Limited operations |
| **Manual reconciliation** | Surface conflicts to user | Wikis, file sync | UX complexity |

**Common CRDTs — the toolkit:**

| CRDT | Operations | Merge | Example |
|---|---|---|---|
| **G-Counter** (grow-only) | `incr` | Max per replica, then sum | Page views |
| **PN-Counter** | `incr`, `decr` | Two G-Counters: one + one – | Likes, inventory |
| **G-Set** (grow-only set) | `add` | Set union | Tags |
| **2P-Set** (two-phase) | `add`, `remove` (once) | Add ∪ Remove (no re-add) | Once-removed lists |
| **OR-Set** (observed-remove) | `add`, `remove` | Tag adds with unique IDs | Shopping cart |
| **LWW-Register** | `set` | Highest timestamp | Simple values |
| **MV-Register** (multi-value) | `set` | Keep all concurrent values | UI shows conflict |
| **RGA / Yjs / Automerge** | Text edit ops | Sequence merge | Collaborative editing |
| **Map (CRDT)** | `set/remove key` | Per-key CRDT merge | Profile |

**G-Counter walked through:**

```
Each replica tracks its own count: { replicaId: count }

Replica A: { A: 5, B: 0, C: 0 }
Replica B: { A: 0, B: 7, C: 0 }
Replica C: { A: 0, B: 0, C: 3 }

Merge (max per replica):
  { A: 5, B: 7, C: 3 }
Total = sum = 15

Same result regardless of merge order — A∪B then C, or B∪C then A — converges.
```

| Property | Detail |
|---|---|
| Each replica only updates its own slot | No conflict at write time |
| Merge takes element-wise max | Always increases |
| Total = sum of all replica counts | Linear |

**OR-Set (observed-remove) — handles add/remove:**

```
Each add gets a unique tag (UUID).
Remove removes only the tags currently observed.

Replica A: add("apple", tag1)            → { apple: {tag1} }
Replica B: add("apple", tag2)            → { apple: {tag2} }
Replica B: remove("apple")                → removes {tag2} only
Merge:                                      { apple: {tag1} }   ← still present (A's add)
```

| Property | Detail |
|---|---|
| Concurrent add + remove → add wins | "Add bias" |
| Each add survives its own removes | Without coordination |
| Used in shopping carts | Shopify uses OR-Set internally |

**LWW pitfall — the silent loss:**

```
Replica A: set X = "v1" at t=100
Replica B: set X = "v2" at t=100  (concurrent — same logical clock)
Merge:     keeps highest timestamp, but if equal, deterministic tiebreaker (replica ID)
           → one write silently lost
```

| Defense | Detail |
|---|---|
| Use version vectors | Detect concurrency, surface conflict |
| Application merge | Smart resolution (e.g., for prices, take min/max) |
| MV-Register | Keep all concurrent values, let app pick |
| Hybrid Logical Clocks | Stronger ordering than wall-clock |

**Where CRDTs are used (real systems):**

| System | Detail |
|---|---|
| **Riak** | Built on CRDTs; many types built-in |
| **Redis Enterprise CRDB** | Active-active geo replication |
| **Yjs / Automerge** | Collaborative editing (Notion, etc.) |
| **Azure Cosmos DB** | LWW + custom merge resolvers |
| **Apple iCloud** | Some sync uses CRDTs |
| **Figma** | Collaborative cursors / comments |
| **Mobile offline-first** | Sync on reconnect |

**When eventual consistency is OK:**

| Workload | OK? | Notes |
|---|---|---|
| Page view counters | Yes | Off by 1 doesn't matter |
| Social feed ordering | Yes | Slight reordering fine |
| Caches | Yes | Stale-while-revalidate |
| DNS records | Yes | TTLs are eventual by design |
| Shopping cart | OK with CRDT | Lost item annoying, not catastrophic |
| Likes / reactions | Yes | OR-Set or PN-Counter |
| Inventory (last unit) | **No** | Need linearizable |
| Money / accounts | **No** | Strong consistency required |
| Booking systems | **No** | Double-booking unacceptable |

**Causal consistency — the middle ground:**

```
"If I post then comment on my own post, both must be visible together"
```

| Property | Detail |
|---|---|
| Cause-before-effect preserved | Vector clocks track |
| Stronger than eventual | But cheaper than linearizable |
| Used by | Riak (with vector clocks), Cosmos DB |
| Common application choice | Realistic compromise |

**Vector clocks — how causality is tracked:**

```
Each replica has a logical clock per replica.

A writes:  [A:1, B:0, C:0]
B writes:  [A:0, B:1, C:0]
A reads B's write, then writes: [A:2, B:1, C:0]   ← A's second write happened-after B's

Concurrent if neither dominates the other.
```

| Use | Detail |
|---|---|
| Detect concurrency | Two clocks neither greater than the other |
| Order causal events | Total order via clock comparison |
| Bigger metadata | One counter per replica |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Choosing eventual for money | Real bugs, lost transactions |
| LWW for everything | Silent data loss on concurrent writes |
| Naive timestamp comparison | Clock skew → wrong winner |
| Forgetting tombstones | Removed elements come back on merge |
| OR-Set re-adding after remove | Confusing UX without explanation |
| Cosmos DB with LWW + bad clocks | Nondeterministic merge |
| Treating CRDT counter as exact | It's only eventually exact |
| Reading from stale replica without RYW | User confused by their own writes |

**Decision matrix:**

| Need | Pick |
|---|---|
| Counter (likes, views, throughput) | **PN-Counter** |
| Tag list, no removal | **G-Set** |
| Cart, with add/remove | **OR-Set** |
| Profile field | **LWW-Register** + version vector |
| Collaborative document | **RGA / Yjs / Automerge** |
| Inventory | Strong consistency (not CRDT) |
| Money | Strong consistency (not CRDT) |
| Cache | Eventual consistency |
| Cross-region replication | Causal or CRDT |

**Cross-references:**

- Distributed locks (when CRDTs aren't enough): [distributed_locks_*.md](distributed_locks_redis_redlock_fencing_token.md)
- Idempotency (related but different): [idempotency_*.md](idempotency_key_exactly_once_deduplication.md)
- Consensus / Raft (linearizable alternative): [consensus_raft_*.md](consensus_raft_paxos_leader_election.md)
- Transaction isolation: [transaction_isolation_*.md](../database_engineering/transaction_isolation_levels_acid_mvcc_serializable.md)

**Rule of thumb:** **Eventual consistency is fine for most reads** (counters, feeds, caches, DNS). Reach for **CRDTs** when you need **concurrent writes without coordination** — pick the type by the operation: **PN-Counter** for distributed counters, **OR-Set** for collections with add/remove, **LWW-Register** for simple scalars (with caveats), **RGA / Yjs / Automerge** for collaborative documents. Use **strong consistency** (linearizable / serializable) for **money, inventory, bookings** — anywhere a stale read is dangerous.
