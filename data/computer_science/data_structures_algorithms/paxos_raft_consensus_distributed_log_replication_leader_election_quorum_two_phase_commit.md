### Paxos / Raft (distributed consensus, log replication, leader election, quorum, 2PC / 3PC)

**When:** make `N` nodes agree on a value (or sequence of values) **despite crashes**. Replicated state machines, distributed databases, configuration management (etcd, Consul, ZooKeeper), distributed locks.

**The problem:** asynchronous network + crash failures + need for safety (no two leaders accept conflicting values) and liveness (eventually progress).

**FLP impossibility (1985):** in a fully async network with even one crash, no deterministic consensus is *both* safe and live. Practical algorithms achieve **safety always**, **liveness when the network is "well-behaved"**.

#### Schema (consensus essentials)

| Concept | Detail |
|---|---|
| Quorum | Subset of size ≥ ⌊N/2⌋ + 1 (majority) |
| Term / epoch / ballot | Monotonically increasing logical "round" number |
| Leader | The node currently driving the algorithm (some variants are leaderless) |
| Log | Ordered sequence of agreed-on commands |
| Safety | At most one value chosen for any slot |
| Liveness | Progress eventually, given a stable leader and majority alive |
| State machine | Application state — derived by replaying the log |

#### Algorithm comparison

| Algorithm | Year | Designed for | Reputation |
|---|---|---|---|
| **Paxos** (Lamport) | 1989 / 1998 | Single-decree consensus | Foundational; "famously hard to understand" |
| **Multi-Paxos** | — | Sequence of decrees with stable leader | Used by Chubby, Spanner |
| **Raft** | 2014 | Same as Multi-Paxos | **Easier to understand**; default for new systems |
| **Zab** | — | Total order broadcast | Powers ZooKeeper |
| **EPaxos** | 2013 | Leaderless, low-latency | Commits anywhere, gossip |
| **PBFT** | 1999 | Byzantine faults | 3f+1 nodes tolerate `f` Byzantine |
| **HotStuff** / **Tendermint** | Modern | Byzantine + linear messaging | Blockchain consensus |
| **Viewstamped Replication** | 1988 | Same family as Paxos | Pre-dated Paxos publication |

#### Paxos (single-decree, Lamport's original)

| Phase | Role | Action |
|---|---|---|
| **Prepare(n)** | Proposer | Pick proposal #`n`; ask majority of acceptors |
| **Promise(n, accepted)** | Acceptor | Promise not to accept lower; return any previously accepted (n', v') |
| **Accept(n, v)** | Proposer | Pick `v` = highest-numbered previously accepted, else proposer's value; send to majority |
| **Accepted(n, v)** | Acceptor | Accept iff haven't promised higher `n` |
| **Decided** | Anyone | Once a majority accepts (n, v), v is **chosen** |

**Key invariant:** if value `v` is chosen at proposal `n`, every later proposal `n' > n` will pick `v`. (Achieved via Promise carrying back the previously-accepted value.)

#### Multi-Paxos (sequence of decrees)

Run Paxos for each log slot. Optimization: a stable leader skips Phase 1 (Prepare) — once it has a promise from a majority for **all future slots** at proposal #`n`, it just sends Accepts. **Per-decision: 1 round trip.**

#### Raft (the modern equivalent — designed for understandability)

| Subproblem | Mechanism |
|---|---|
| **Leader election** | Randomized timeout → candidate → request votes from majority → win = leader |
| **Log replication** | Leader appends; broadcasts `AppendEntries` to followers; majority response = committed |
| **Safety** | Followers reject `AppendEntries` if their `prevLogTerm/prevLogIndex` don't match — forces consistency before extension |
| **Term** | Monotonically increasing; new leader = new term |
| **Membership change** | Joint consensus (old + new majority both required) for safe reconfig |

**Raft state per node:** current term, who voted for in this term, log, commit index, last applied index.

**Raft RPCs:**

| RPC | Sent by | Effect |
|---|---|---|
| `RequestVote(term, lastLogIndex, lastLogTerm)` | Candidate | Receiver votes if its log is ≤ as up-to-date and it hasn't voted this term |
| `AppendEntries(term, prevLogIndex, prevLogTerm, entries[], leaderCommit)` | Leader | Receiver appends if logs match at prevLog; updates commit index |

**Heartbeat:** AppendEntries with empty entries; resets follower election timeout.

#### Quorum math

| N nodes | Majority | Tolerates `f` failures |
|---|---|---|
| 3 | 2 | 1 |
| 5 | 3 | 2 |
| 7 | 4 | 3 |
| 2f+1 | f+1 | f |

> Use **odd N** — even N adds latency without tolerating more failures.

> **Byzantine** (PBFT-style): need `3f+1` nodes to tolerate `f` malicious nodes.

#### 2PC vs 3PC vs Consensus

| Protocol | Purpose | Failure tolerance |
|---|---|---|
| **2-phase commit** | Atomic commit across multiple participants | **Blocks** if coordinator fails after Prepare |
| **3-phase commit** | Adds Pre-commit phase to avoid blocking | Doesn't survive partition |
| **Consensus** (Paxos / Raft) | Atomic decision via voting | **Survives** minority failures and partitions |

> 2PC chooses **C+A — sacrifices liveness on coordinator failure**. Raft / Paxos chooses **C+P — sacrifices availability of minority partition**.

#### Use cases

| System | Algorithm |
|---|---|
| Google Chubby | Paxos |
| Google Spanner | Multi-Paxos + TrueTime |
| etcd, Consul, CockroachDB | Raft |
| Apache ZooKeeper | Zab |
| Apache Kafka (controller pre-KRaft) | ZooKeeper, now Raft (KRaft) |
| Kubernetes API server | Backed by etcd (Raft) |
| HashiCorp Vault | Raft |
| Bitcoin / Ethereum | Nakamoto consensus (proof-of-work) — different model |
| Tendermint, HotStuff (modern blockchain) | BFT consensus |
| Oracle, MySQL Group Replication | Variants of Paxos / Raft |

#### Linearizability and reads

A consensus algorithm makes the **log** consistent. To make **reads** linearizable:

| Technique | Cost |
|---|---|
| **Read through log** (write a no-op "read" entry) | High latency |
| **Lease reads** (leader holds a lease; serves reads locally) | Lower latency; needs clock bound |
| **ReadIndex** (Raft) | Confirm leadership with majority, then read locally | Cheap heartbeat round trip |
| **Stale reads from followers** | No consensus; eventual consistency |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Even N (e.g., 4 nodes) | Use 3, 5, 7 — even N tolerates same `f` as odd `N − 1` |
| Reading from a follower expecting linearizability | Use ReadIndex or lease |
| Forgetting term checks on every RPC | Stale leader can corrupt log — always reject if `req.term < current.term` |
| Joint-consensus reconfig skipped | Adding nodes one at a time can split brain — use joint consensus |
| Comparing Raft to 2PC | Different goals — 2PC is for atomic transactions; Raft is for ordered replicated log |
| Treating Paxos as one algorithm | "Paxos" usually means **Multi-Paxos**; Basic Paxos alone is single-decree |
| Picking BFT for crash-only failures | Paxos / Raft are simpler and faster; only use BFT against malicious nodes |

#### Complexity (per operation, stable leader)

| Op | Round trips | Messages |
|---|---|---|
| Raft AppendEntries | 1 | O(N) |
| Multi-Paxos | 1 | O(N) |
| Initial election | 1 | O(N) |
| Reconfiguration (joint consensus) | 2 | O(N) |
| Read (linearizable) | 1 (ReadIndex) | O(N) |

**Rule of thumb:** for new systems, **start with Raft** — same correctness as Multi-Paxos with far better understandability. Use **odd-sized clusters of 3 or 5**. **Quorum = ⌊N/2⌋ + 1**. **Consensus is for replicated log / state machine**, not for atomic transactions across services (that's 2PC). For Byzantine settings, switch to **PBFT / HotStuff**.
