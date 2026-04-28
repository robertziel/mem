### Consensus & Leader Election (Raft, Paxos, etcd, Quorum)

**The consensus problem:** N nodes must agree on a single value (or sequence) **even when** some nodes fail or messages are lost / reordered / delayed.

**Why it's hard — what consensus must guarantee:**

| Property | Means |
|---|---|
| **Agreement** | All non-faulty nodes decide the same value |
| **Validity** | The decided value was proposed by some node |
| **Termination** | Non-faulty nodes eventually decide (under reasonable network assumptions) |
| **Integrity** | A node decides at most once |

> **FLP impossibility (1985):** in a fully asynchronous network, no deterministic protocol can guarantee both safety + liveness with even one faulty node. Real systems work by assuming **partial synchrony** (timeouts) and trading liveness for safety under partition.

**Algorithms — at-a-glance:**

| Algorithm | Complexity | Used in | Notes |
|---|---|---|---|
| **Paxos / Multi-Paxos** | High to understand + implement | Google Chubby, Spanner | The original — proven correct, notoriously hard |
| **Raft** | Moderate — designed for clarity | etcd, Consul, CockroachDB, TiKV | The modern default |
| **ZAB** (ZooKeeper Atomic Broadcast) | Moderate | ZooKeeper | Predates Raft; similar leader-based design |
| **Viewstamped Replication** | Moderate | Less common | Concurrent invention with Paxos |
| **EPaxos** (Egalitarian) | High | Some research / TiDB internal experiments | Leaderless variant, faster in some workloads |
| **PBFT / Tendermint / HotStuff** | High | Blockchains | Byzantine fault tolerance (handles malicious nodes) |
| **Gossip + CRDTs** | Different model | Riak, Cassandra (membership), Redis Cluster | Eventual consistency, not strong agreement |

**Failure model — what each algorithm tolerates:**

| Model | Tolerates | Algorithms |
|---|---|---|
| **Crash failures** | Nodes stop / restart | Raft, Paxos, ZAB |
| **Network partitions** | Same — minority side stops accepting writes | Same |
| **Byzantine** (lying / malicious nodes) | Adversarial behavior | PBFT, Tendermint, HotStuff |
| **Asynchronous** (no timing assumptions) | Provably impossible (FLP) | None |

> Most distributed databases are **CFT** (crash-fault tolerant). **BFT** is what blockchains need.

**Quorum math — the foundation:**

| Property | Rule |
|---|---|
| Cluster size N | Number of voting members |
| Quorum size | `⌊N/2⌋ + 1` (strict majority) |
| Failure tolerance | `f = ⌊(N-1)/2⌋` |
| For Byzantine: tolerance | `f = ⌊(N-1)/3⌋` (need 3f+1 nodes) |

| N (cluster size) | Quorum | Tolerates failures |
|---|---|---|
| 1 | 1 | 0 (single point of failure) |
| **3** | 2 | 1 |
| **5** | 3 | 2 |
| 7 | 4 | 3 |
| 9 | 5 | 4 |

> **Always odd numbers (3, 5, 7)**. Even N gives no fault-tolerance benefit and risks split votes.

**Why odd N: even sizes don't help:**

| N | Tolerates | Cost |
|---|---|---|
| 4 | 1 | Same as N=3 — extra node adds no fault tolerance |
| 6 | 2 | Same as N=5 |
| 8 | 3 | Same as N=7 |

**Raft — the modern default:**

| Concept | Detail |
|---|---|
| **Term** | Monotonically increasing logical time; a new term begins with each election |
| **Roles** | Follower / Candidate / Leader |
| **Leader** | Handles all client writes; replicates to followers; sends heartbeats |
| **Follower** | Passive; accepts log entries from leader |
| **Candidate** | Follower that timed out and is requesting votes |
| **Log** | Ordered sequence of (term, index, command) |
| **Commit index** | Highest log index known committed (replicated to majority) |

**Raft state machine:**

```
                 timeout (no heartbeat)
       ┌──────────────────────────────────────┐
       ▼                                       │
  Follower ──── grant vote ────►  Candidate ──── win majority ────► Leader
       ▲                            │                                 │
       │                            │ split vote / new term           │
       │  ◄────  newer term ────────┴──────── newer term ──────────────┘
       └────────────────────────────────────────────────────────────────
```

**Raft write flow:**

| Step | What happens |
|---|---|
| 1 | Client sends write to leader |
| 2 | Leader appends `(term, index, command)` to its log |
| 3 | Leader broadcasts `AppendEntries` to followers |
| 4 | Followers append to their logs and ACK |
| 5 | When **majority** ACK, leader marks the entry **committed** |
| 6 | Leader applies the entry to the state machine, replies to client |
| 7 | Followers learn commit index from next heartbeat / AppendEntries |

**Raft leader election:**

| Step | Detail |
|---|---|
| 1 | Follower times out (election timeout, randomized 150–300 ms) — no heartbeat received |
| 2 | Becomes Candidate, increments term, votes for itself |
| 3 | Sends `RequestVote` to all peers |
| 4 | Other nodes vote `yes` if they haven't voted in this term and the candidate's log is at least as up-to-date as theirs |
| 5 | Candidate with **majority votes** becomes Leader |
| 6 | Leader sends heartbeats; followers reset their election timers |
| 7 | Split vote → no leader → new term → retry (randomized timeouts break ties) |

**Log replication safety properties:**

| Property | Detail |
|---|---|
| **Election restriction** | Candidate must have all committed entries; voters reject candidates with stale logs |
| **Leader append-only** | Leader never overwrites or deletes its own log |
| **Log matching** | If two logs share a `(term, index)`, all earlier entries are identical |
| **Leader completeness** | Once an entry is committed, all future leaders contain it |
| **State machine safety** | Once a node applies an entry, no node will apply a different value at the same index |

**Linearizable reads in Raft — three options:**

| Strategy | Cost | Detail |
|---|---|---|
| **Read from leader + read index** | One round-trip | Leader confirms it's still leader before serving |
| **Lease-based read** | Local, fast | Leader holds a time-bounded lease; assumes bounded clock skew |
| **Read from any replica + linearizable barrier** | Slowest | Strongest under failures |
| **Eventually consistent read** | None | Read from any node; may be stale |

**Paxos — the lineage:**

| Variant | Detail |
|---|---|
| **Basic Paxos** | One value per instance; phases: Prepare → Promise → Accept → Accepted |
| **Multi-Paxos** | Stable leader optimization; one Prepare phase, many Accepts |
| **Fast Paxos** | Skips a phase under no contention |
| **EPaxos** | Leaderless; commands ordered only when they conflict |
| **Generalized Paxos** | Same family — fewer messages under no conflict |

> If you're building from scratch, pick Raft. Paxos is the academic foundation; **understanding > implementing**.

**ZAB (ZooKeeper):**

| Concept | Detail |
|---|---|
| Total order broadcast | All nodes apply same updates in same order |
| Phases | Discovery, Synchronization, Broadcast |
| Used by | ZooKeeper itself; older Kafka used ZK for metadata |
| Now | Kafka has migrated to KRaft (Raft-based) |

**Coordination services — pick by ecosystem:**

| Service | Strength |
|---|---|
| **etcd** | Kubernetes-native; clean Raft impl; gRPC API; widely deployed |
| **Consul** | Service discovery + KV + ACL + multi-DC; HashiCorp |
| **ZooKeeper** | Mature; Java; declining outside Hadoop / older systems |
| **Cloud-native** | AWS/GCP/Azure offerings (DynamoDB, Spanner, Cosmos DB) hide consensus internally |

**etcd — what you'll touch in K8s:**

| Concept | Detail |
|---|---|
| Backing store for K8s | All cluster state — pods, services, configs |
| Sizing | Recommended 3 or 5 dedicated nodes |
| `--initial-cluster-token` / `--initial-cluster` | Bootstrap members |
| `etcdctl` | CLI for inspection / snapshots |
| Snapshots | `etcdctl snapshot save` — must run regularly |
| Failover | Auto via Raft; quorum required |
| `--auto-compaction-retention` | Prevents unbounded growth |

**Distributed primitives commonly built on top of consensus:**

| Primitive | Detail |
|---|---|
| **Distributed lock** | Lease + key in etcd / ZK; auto-expires on session loss |
| **Leader election** | Compete for a lease; holder is leader |
| **Service discovery** | Watch a path; nodes register on startup |
| **Configuration management** | Store config in KV; clients watch for changes |
| **Distributed counter** | CAS on a key |
| **Barrier** | All N processes wait until last arrives |

**etcd lease pattern (lock / leader election):**

```
1. Acquire a lease with TTL (e.g. 10s).
2. Put a key with the lease.
3. KeepAlive heartbeat refreshes the lease.
4. If the holder dies, lease expires, key auto-deletes — others can acquire.
```

**Split-brain prevention:**

| Mechanism | Detail |
|---|---|
| **Majority quorum** | Only the side with majority can elect a leader / commit writes |
| **Fencing tokens** | Monotonically increasing token; reject older holders' writes |
| **STONITH** ("Shoot The Other Node In The Head") | Hard cluster fencing in HA pairs |
| **Witness / arbiter node** | Tie-breaker without storing data |
| **Static quorum** | Pre-configured quorum size, not dynamic |

> A 2-node cluster can't avoid split-brain — there's no majority. **3 is the minimum useful size.**

**Quorum reads/writes — different model (Dynamo):**

| Variable | Meaning |
|---|---|
| `N` | Total replicas |
| `W` | Write quorum |
| `R` | Read quorum |
| `W + R > N` | Strong consistency |
| `W = N, R = 1` | Read-heavy, slow writes, fast reads |
| `W = 1, R = N` | Write-heavy |
| `W = R = ⌈(N+1)/2⌉` | Balanced majority quorum |

**Common consensus pitfalls:**

| Pitfall | Effect |
|---|---|
| Implementing your own | Subtle bugs that take years to surface |
| Even-numbered cluster | Wasted node, no extra tolerance |
| 2-node "HA" cluster | No quorum possible; split-brain inevitable |
| Stretching across regions naively | Cross-region latency on every commit |
| Single-region 3-node cluster called "HA" | Whole region down = no quorum |
| Disabling fsync to "speed up writes" | Loss on crash; consensus is no longer durable |
| Relying on consensus for high write throughput | Strong consistency caps throughput; consider sharding |
| Forgetting to take etcd snapshots | Recovery requires fresh bootstrap |
| Mixing voting + non-voting (learner) members incorrectly | Quorum math becomes wrong |
| Long-running locks held across deploys | Stuck systems |

**Multi-region considerations:**

| Pattern | Detail |
|---|---|
| Single-region quorum (3 nodes in one region) | Fast, but region outage takes you down |
| Multi-region quorum (e.g. 5 nodes across 3 regions: 2-2-1) | Survives one-region loss; cross-region latency on every commit |
| Local + global tier (Spanner-style) | Local for low latency, global Paxos for cross-region transactions |
| Read replicas in remote regions (non-voting) | Local reads, no impact on quorum |

**Performance budget:**

| Operation | Typical |
|---|---|
| Single-region etcd commit | 5–15 ms |
| Cross-region commit (different cloud regions) | 50–300 ms |
| Election (under failure) | 150–500 ms (Raft randomized timeouts) |
| Throughput per cluster | 10k–100k writes/s; **not a database** |

> Consensus systems are **coordination tools**, not databases. Don't put high-volume application writes into etcd.

**Decision shortcuts:**

| Need | Pick |
|---|---|
| Build a HA service requiring leader election + small KV | **etcd** or **Consul** |
| K8s cluster | etcd (already there) |
| HashiCorp ecosystem (Vault, Nomad, Consul Connect) | Consul |
| BFT (mutual distrust) | Tendermint / HotStuff / blockchain |
| Application data with strong consistency | A real DB built on consensus (CockroachDB, TiDB, Spanner) |
| Just want a distributed cache, not consensus | Redis / Memcached + sharding |
| Don't reinvent | Use a proven library / service |

**Tooling map:**

| Tool | Use |
|---|---|
| **etcd** | Coordination, K8s metadata, distributed locks |
| **etcdctl** | CLI |
| **Consul** | Service discovery + KV + ACL |
| **ZooKeeper** | Legacy / Java ecosystem |
| **CockroachDB / TiDB / YugabyteDB** | SQL on top of Raft |
| **Spanner** | Google-managed Paxos-based global SQL |
| **Patroni** | PostgreSQL HA via etcd/Consul + leader election |
| **Sentinel** | Redis HA (not full consensus, simpler quorum-based) |
| **Tendermint / CometBFT** | BFT consensus |

**Rule of thumb:** **don't implement consensus — use etcd / Consul / ZK / a proper DB.** **Always odd-number clusters (3 or 5)**, **majority quorum prevents split-brain**, **each commit is a round-trip × log + fsync** so don't put high-volume data through it. **Raft is the modern default** — readable, well-tested, with clear semantics. For multi-region HA, **stretch the cluster carefully** (or use a system designed for it like Spanner / Cockroach).
