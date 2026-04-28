### Database Replication Topologies (Primary–Replica, Failover, Sync vs Async)

**Why replicate — four distinct goals:**

| Goal | What it gives you |
|---|---|
| **High availability** | Survive a primary failure with promotion |
| **Read scaling** | Spread reads across replicas |
| **Geographic distribution** | Lower-latency reads near users |
| **Disaster recovery** | Cross-region copy of state |

> Each goal has different topology + consistency tradeoffs. Picking one without naming the goal leads to over- or under-engineering.

**Three architectural shapes:**

| Topology | Writes accepted by | Use when |
|---|---|---|
| **Single-leader** (primary–replica) | One node | **Default** — strong consistency on the primary, scaled reads on replicas |
| **Multi-leader** (multi-master) | Multiple nodes | Multi-region writes, offline-capable apps |
| **Leaderless** (Dynamo-style) | Any node | Extreme write availability, eventual consistency |

**Single-leader — the workhorse:**

```
Writes ──► Primary ──async (or sync) replication──► Replica 1
                                              ─────► Replica 2
                                              ─────► Replica 3
Reads ──► Primary OR any Replica
```

| Property | Detail |
|---|---|
| Write path | Single primary; serialized order |
| Read path | Primary (strong) or replicas (lagging) |
| Failover | Promote a replica when primary fails |
| Examples | PostgreSQL, MySQL, RDS, Aurora (storage-replicated), Mongo replica set, Redis (replica-of) |
| Strong consistency | On primary; replicas only **eventually** consistent |

**Sync vs async vs semi-sync:**

| Mode | Primary waits for... | Data loss on primary crash | Latency |
|---|---|---|---|
| **Async** | Nothing — writes to local log + ACKs immediately | **Possible** (any unreplicated change is lost) | Lowest |
| **Sync** | All replicas ACK | None | Worst (one slow replica blocks) |
| **Semi-sync** | At least one replica ACKs | Bounded — survives one node loss | Balanced |
| **Group commit / quorum** | Quorum (e.g., 2 of 3) ACK | Survives minority loss | Tunable |

> Production default: **semi-sync or quorum-based** with `min.insync.replicas`-style guarantees. Pure async risks data loss; pure sync makes any one slow replica an outage.

**Replication lag — the always-present hazard:**

| Symptom | Cause | Mitigation |
|---|---|---|
| **Read-your-writes** broken (you write, then read your own data and see old) | Read hits a stale replica | After write, route reads to primary for that user / session |
| **Cross-user staleness** | Async replica behind | Acceptable for many UIs |
| **Monotonic-read violation** (user sees data, then "older" data) | Different replicas in successive reads | Pin user to one replica or read from primary |
| **Consistent-prefix violation** | Out-of-order delivery | Single-leader avoids; multi-leader needs care |
| **Causal consistency** | Cause without effect | Causal tokens (`pg_lsn`, vector clocks) + "wait until ≥ token" |

**Replication mechanisms — at the byte level:**

| Mechanism | What it ships | Pros | Cons |
|---|---|---|---|
| **Statement-based** | SQL statements | Compact | Non-deterministic functions diverge (`NOW()`, `RAND()`) |
| **Row-based / WAL / binlog** | Physical row changes | Deterministic | Larger volume; tied to engine version |
| **Logical replication** (PG `pglogical`, MySQL row-binlog filtered) | Decoded row events | Cross-version, table-selective | Setup complexity |
| **Storage-level replication** (Aurora, Spanner) | Underlying block writes | Very low overhead, multi-AZ | Vendor-locked |

**Failover — the operational dance:**

| Step | Action |
|---|---|
| 1 | Detect primary failure (heartbeat / health check timeout) |
| 2 | Choose new primary — **most-up-to-date replica** by LSN / GTID |
| 3 | Reconfigure surviving replicas to follow the new primary |
| 4 | Update clients (DNS, connection string, service discovery) |
| 5 | Old primary, when it returns, must rejoin as a replica |
| 6 | Backfill / replay any in-flight changes on old primary |

**Failover hazards:**

| Hazard | Cause | Mitigation |
|---|---|---|
| **Data loss** | Async replica was behind by N seconds | Sync / semi-sync; lose less |
| **Split-brain** | Network partition; both sides accept writes | Fencing (`STONITH`), quorum-based election (Raft / Paxos), single coordinator |
| **Lost-update** after old primary returns | Old primary had unreplicated writes | Treat old primary as read-only until reconciled |
| **Cascading failure during failover** | App reconnect storm | Connection pool with backoff + jitter |
| **Manual failover taking too long** | No automation | Use managed automation (Patroni, RDS Multi-AZ, repmgr) |

**Election / consensus algorithms:**

| Algorithm | Used in |
|---|---|
| **Raft** | etcd, CockroachDB, TiKV, Consul |
| **Paxos** / Multi-Paxos | Spanner, ZooKeeper (ZAB) |
| Sentinel-style monitor (loose) | Redis Sentinel |
| External coordinator | Patroni (PG + etcd), Orchestrator (MySQL) |

**Tools for HA / failover (single-leader):**

| Stack | Tool |
|---|---|
| PostgreSQL | Patroni + etcd (or Consul) — gold standard |
| PostgreSQL (cloud) | RDS / Aurora Multi-AZ; AlloyDB; Cloud SQL |
| MySQL | Orchestrator, Galera (multi-leader), Vitess, ProxySQL |
| Redis | Sentinel (single-leader HA), Redis Cluster (sharded) |
| Mongo | Replica set with built-in election |
| Kafka | KRaft (Raft-based controller) — replaces ZK |

**Multi-leader (multi-master):**

```
[Leader A] ◄──sync/async──► [Leader B]   (region 1 vs region 2)
    │                            │
[Replica A1]              [Replica B1]
```

| Property | Detail |
|---|---|
| Writes accepted by | Multiple nodes |
| Conflict | Same row updated on two leaders → must be resolved |
| Conflict resolution | **LWW** (last-writer-wins by timestamp) / app-defined merge / CRDT |
| Use cases | Multi-region active-active, offline-first apps |
| Examples | DynamoDB Global Tables, Cassandra, Galera, CockroachDB, Couchbase XDCR |

**Conflict resolution strategies:**

| Strategy | Detail |
|---|---|
| **LWW** | Highest timestamp wins — silent data loss for losing side |
| **Vector clocks** | Detects concurrent writes; app resolves |
| **CRDT** (G-Counter, OR-Set, RGA) | Mathematically merge-able types — no conflict by construction |
| **Application merge** | Custom logic on the diverged values |
| **Reject conflicting writes** | Return error to last writer |

**Leaderless (Dynamo-style):**

```
Client ──► writes to W of N nodes
Client ──► reads from R of N nodes
Quorum: W + R > N gives strong-ish consistency
```

| Property | Detail |
|---|---|
| Tunable | `(N, W, R)` per request — `(3, 3, 1)` strong on read, `(3, 1, 3)` strong on write |
| **Quorum** | `W + R > N` ensures every read overlaps every write |
| **Anti-entropy** | Background sync reconciles diverged replicas |
| **Read repair** | On read, push freshest value to stale replicas |
| **Hinted handoff** | If a target node is down, another holds the write and replays later |
| Examples | Cassandra, DynamoDB, Riak, ScyllaDB, Voldemort |

**CAP / PACELC reminder:**

| | Network partition | No partition |
|---|---|---|
| Choose | C (consistency) **or** A (availability) | L (latency) **or** C (consistency) |
| Single-leader sync | CP — refuses writes when partitioned | C-leaning |
| Single-leader async | AP-leaning — replicas may serve stale | L-leaning |
| Multi-leader | AP | L |
| Leaderless | Tunable per request | Tunable |

**Read consistency levels (per-request, where supported):**

| Level | Means |
|---|---|
| Strong / linearizable | Read sees latest write — primary-only or quorum read |
| Bounded staleness | Read may lag by ≤ N seconds |
| Read your own writes | Caller sees their own update |
| Monotonic reads | Successive reads don't go backwards |
| Eventual | Reads converge "eventually" |

**Operational checks — what to watch:**

| Metric | Healthy |
|---|---|
| Replication lag | Seconds, not minutes |
| Replica `behind_master` (MySQL) / `pg_stat_replication` flush lag | Bounded |
| Replica failure count | Low |
| Manual failover duration | < 1 min for managed services |
| Connection pool reset rate | Smooth (no thundering herd) |
| Synchronous-replica health | All `s_streaming` (PG) |

**Multi-region designs — pick a posture:**

| Posture | Detail |
|---|---|
| **Single-region with cross-region read replica for DR** | Simple; failover requires app rework |
| **Multi-region active-passive** | Writes one region; failover redirects DNS / traffic |
| **Multi-region active-active (multi-leader)** | Local writes everywhere; conflicts possible |
| **Globally distributed strongly-consistent** (Spanner / Cockroach / Yugabyte) | Linearizable but pay latency on cross-region quorum |

**Pitfalls:**

| Pitfall | Effect |
|---|---|
| Reading from replica right after writing to primary | Stale read |
| Async replication + brittle failover | Quiet data loss |
| Multi-master without conflict strategy | Diverged rows; quiet data loss |
| Forgetting `min.insync.replicas`-equivalent | One ACK feels safe — until you lose the only copy |
| Promoting a behind replica during failover | Data loss when old primary returns |
| No fencing / STONITH | Split-brain |
| Replicas serve writes by accident (read-write split bug) | Silent inconsistency |
| Treating Aurora as multi-master out of the box | Aurora is single-writer per cluster (Aurora Multi-Master is a separate product) |
| Replicating cross-region without measuring RTT | Sync replication kills tail latency |

**Decision shortcuts:**

| Need | Pick |
|---|---|
| Most apps, one region | Single-leader + 1–2 async replicas + automated failover (RDS Multi-AZ / Patroni) |
| One region, cannot lose any committed data | Single-leader + semi-sync replicas |
| Multi-region reads, single-region writes | Single-leader + cross-region async read replica |
| Multi-region writes, occasional conflicts OK | Multi-leader (DynamoDB Global Tables, CockroachDB) |
| Massive write throughput, eventual is fine | Leaderless quorum (Cassandra) |
| Globally consistent transactions | Spanner / Cockroach / Yugabyte |

**Rule of thumb:** **single-leader is the default** — simplest reasoning, strongest correctness, scaled reads via replicas. Use **semi-sync (or quorum)** to bound data loss. **Automated failover via Patroni / RDS / Sentinel / Orchestrator** — manual is too slow when it counts. **Multi-leader only when multi-region writes are a hard requirement**, and then commit to a real conflict-resolution strategy. **Leaderless (Cassandra, DynamoDB)** when extreme write availability matters and eventual consistency is acceptable. **Always monitor replication lag** — silent staleness becomes a silent outage.
