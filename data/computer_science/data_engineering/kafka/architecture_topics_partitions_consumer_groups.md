### Kafka Architecture (Topics, Partitions, Consumer Groups, Replication)

**What Kafka is:** distributed, durable, append-only log of records. Producers write, consumers read independently, retention is time/size-based.

**Core vocabulary:**

| Term | What it is |
|---|---|
| **Cluster** | Set of brokers under one configuration |
| **Broker** | One Kafka server; hosts partitions |
| **Topic** | Named stream (logical) — partitioned across brokers |
| **Partition** | Ordered, immutable, append-only sequence within a topic — the unit of parallelism |
| **Offset** | Monotonically increasing per-partition position of a record |
| **Record** | The message: `(key, value, headers, timestamp)` |
| **Producer** | Client that writes records |
| **Consumer** | Client that reads records |
| **Consumer Group** | Set of consumers cooperating to consume a topic; each partition is read by **exactly one** consumer in the group |
| **Replication** | Each partition is mirrored to N brokers (one leader + followers) |
| **ISR** (In-Sync Replicas) | Followers caught up enough to be eligible for leadership |
| **Controller** | Broker that manages cluster metadata + leader elections |

**Modes — KRaft vs ZooKeeper:**

| Mode | Status | Notes |
|---|---|---|
| **KRaft** (no ZooKeeper) | **Default for new clusters** since Kafka 3.3+, GA 3.5 | Self-managed metadata via Raft |
| ZooKeeper-based | Deprecated, removed in Kafka 4.0 | Old clusters still in production must migrate |

**Partition is the unit of:**

| Property | Detail |
|---|---|
| **Ordering** | Strict per-partition; no global ordering across a topic |
| **Parallelism** | Max consumers per group = partitions in topic |
| **Throughput** | Each partition's I/O is bounded by leader broker; scale = more partitions |
| **Replication** | One replica set per partition |
| **Storage placement** | Each partition lives on one leader broker (with replicas elsewhere) |

> **You cannot reduce partitions** — only increase. **Re-keying** after adding partitions is hard. **Plan partition count generously** at topic creation.

**Partition assignment — how producers pick:**

| Method | When |
|---|---|
| **Key-based** (`hash(key) % partitions`) | Records with same key → same partition (per-key ordering) |
| **Sticky partitioner** (default since 2.4 when no key) | Fill one partition's batch, then rotate — better batching than round-robin |
| **Round-robin** (legacy default with no key) | Each record alternates partitions — worse batching |
| **Custom partitioner** | Domain-specific routing |

> Adding partitions later **breaks `hash(key) % N` ordering** for existing keys — they remap. Plan ahead, or use sticky/manual partitioning.

**Consumer groups — the parallelism model:**

```
Topic: 4 partitions (P0, P1, P2, P3)

Group A (2 consumers):                Group B (4 consumers):
   C1 ── P0, P1                          C1 ── P0
   C2 ── P2, P3                          C2 ── P1
                                         C3 ── P2
                                         C4 ── P3

Group C (5 consumers — one is idle, no partitions left)
```

| Rule | Detail |
|---|---|
| Each partition → exactly one consumer in a group | The constraint that bounds parallelism |
| Multiple groups → independent consumers of the same topic | Each has its own offsets |
| Consumers > partitions = some idle | Wasted clients |
| Rebalance triggered by consumer join/leave/timeout | Pause then redistribute |

**Rebalance algorithms — pick by stability needs:**

| Strategy | Behavior |
|---|---|
| `RangeAssignor` (default) | Per topic, ranges of partitions per consumer |
| `RoundRobinAssignor` | Alternate across topics |
| `StickyAssignor` | Minimize movement on rebalance |
| **Cooperative sticky** (Kafka 2.4+) | Incremental rebalance — consumers don't all stop at once |

**Replication & ISR:**

| Concept | Detail |
|---|---|
| `replication.factor` | Total copies per partition (production: **3**) |
| Leader | Handles all reads + writes for the partition |
| Follower | Replicates from leader; may serve reads with `KIP-392` |
| **In-Sync Replicas (ISR)** | Followers caught up within `replica.lag.time.max.ms` |
| Leader election | On leader failure, controller elects from ISR |
| `unclean.leader.election.enable=false` | Refuse to elect a non-ISR leader (prevents data loss) |

**Producer durability — `acks` controls the contract:**

| `acks` | Wait for | Loss risk | Latency |
|---|---|---|---|
| `0` | Nothing — fire and forget | Loss possible | Lowest |
| `1` | Leader writes to local log | Loss if leader crashes pre-replication | Medium |
| `all` (or `-1`) | All ISRs ACK | None (with `min.insync.replicas`) | Highest |

> **Durability formula:** `acks=all` + `replication.factor=3` + `min.insync.replicas=2`.
> A single broker outage still allows writes; two simultaneous outages stop them — fail-safe by design.

**Idempotent + transactional producer:**

| Setting | Effect |
|---|---|
| `enable.idempotence=true` | De-dupes retries within one producer session — no duplicates per partition |
| `transactional.id=<id>` | Multi-partition atomic writes; needs `transactional.id` to survive restarts |
| `read_committed` consumer isolation | Only reads records from committed transactions |
| Result | "Exactly-once semantics" (EOS) — within Kafka |

**Delivery semantics — what's possible:**

| Want | How |
|---|---|
| At-most-once | `acks=0`, no retries |
| **At-least-once** (default safe) | `acks=all` + `enable.idempotence=true` + retries + idempotent consumer |
| Exactly-once **inside Kafka** | Transactional producer + `read_committed` consumer |
| Exactly-once **end-to-end** including external sinks | Sink must be idempotent (or transactional) — Kafka alone can't guarantee this |

**Retention models:**

| Model | Setting | Behavior |
|---|---|---|
| Time | `retention.ms` (default 7 days) | Old records deleted by age |
| Size | `retention.bytes` | Per-partition cap |
| Forever | `retention.ms=-1` | Compacted topics or audit logs |
| **Log compaction** | `cleanup.policy=compact` | Keep latest value per key — perfect for snapshots, materialized state |
| Hybrid | `cleanup.policy=compact,delete` | Compact + age out |

**Tiered storage (KIP-405, Kafka 3.6+):** offload old segments to S3/GCS so brokers hold only the recent window. Reduces broker disk + cost while keeping infinite retention queryable.

**Topic settings — the production minimum:**

| Setting | Recommended |
|---|---|
| `partitions` | Sized for max consumer parallelism + future growth |
| `replication.factor` | **3** |
| `min.insync.replicas` | **2** |
| `cleanup.policy` | `delete` (default) or `compact` for state |
| `retention.ms` | Per use case (7d typical) |
| `compression.type` | `lz4` or `zstd` for high throughput |
| `max.message.bytes` | Default 1 MB; raise carefully — large messages destroy throughput |
| `unclean.leader.election.enable` | `false` |

**Producer settings — durability + throughput:**

| Setting | Effect |
|---|---|
| `acks=all` | Strong durability |
| `enable.idempotence=true` | No duplicates within a session |
| `compression.type=lz4` | Cheap CPU, big wire savings |
| `linger.ms=5–20` | Wait briefly to batch — big throughput win |
| `batch.size=64KB+` | Larger = fewer round-trips |
| `max.in.flight.requests.per.connection=5` | Cap pipelining (must be ≤5 for idempotence to preserve order) |
| `retries=Integer.MAX_VALUE` | Default since Kafka 2.1 |
| `delivery.timeout.ms` | Total time including retries |

**Consumer settings — at-least-once defaults:**

| Setting | Effect |
|---|---|
| `auto.offset.reset=earliest \| latest` | Start position for new groups |
| `enable.auto.commit=false` | **Commit manually after processing** for reliability |
| `max.poll.records=500` | Batch size per poll |
| `max.poll.interval.ms` | Max time between polls; longer than longest processing time |
| `session.timeout.ms` | Heartbeat liveness window |
| `isolation.level=read_committed` | When pairing with transactional producers |
| `fetch.min.bytes` / `fetch.max.wait.ms` | Batch arrivals; lower latency vs higher throughput |
| `partition.assignment.strategy=cooperative-sticky` | Smooth rebalances |

**Offset management — three patterns:**

| Pattern | Pros | Cons |
|---|---|---|
| Auto-commit (default) | Simple | At-least-once, but commit can race with processing failure |
| Manual sync (`commitSync()`) | Strong control | Higher latency; blocks |
| Manual async (`commitAsync()`) | Faster | Must handle commit failures yourself |
| **Externalize offsets** (commit to DB alongside business write) | True end-to-end exactly-once | More plumbing |

**Common patterns:**

| Pattern | Use |
|---|---|
| **Compacted topic of state** | Latest snapshot per key — used by Kafka Streams' state stores, materialized views |
| **Outbox pattern** | App writes outbox row in same DB txn; CDC streams it (see `cdc_debezium_change_data_capture_wal_outbox.md`) |
| **Dead-letter topic** | Failed-to-process messages diverted; replayable later |
| **Tombstone for compaction** | Null value → log compaction deletes the key |
| **Replay** | Reset consumer group offsets to reprocess history |

**Operational gotchas:**

| Gotcha | Effect |
|---|---|
| Adding partitions to an existing topic | Breaks key-based partitioning — same key now goes to a different partition |
| Hot partition (one key dominates) | One partition saturates; no parallelism for that key |
| Too few partitions | Caps parallelism; can't scale consumers |
| Way too many partitions | Per-broker overhead (controller, replication, file descriptors); each costs metadata |
| Consumer slower than producer | Lag grows; eventually retention deletes unread data → silent loss |
| Consumer takes too long per record | Heartbeat times out → rebalance → repeated processing of same record |
| `max.message.bytes` too high | Kills throughput; one giant record blocks the partition |
| No idempotent producer | Retries can duplicate records on transient failures |
| Auto-commit on flaky processing | Commits before successful processing; loss on crash |
| ZooKeeper still in use post-3.5 | Plan KRaft migration |

**Sizing rules of thumb:**

| Concern | Heuristic |
|---|---|
| Partitions per topic | ~ `(target_throughput) / (partition_throughput)` ; usually 12–48 to start |
| Partitions per broker | A few hundred OK; thousands → leader-election cost |
| Consumer concurrency | One thread per partition is standard; parallelize within if needed |
| Disk per broker | Size for retention × in-rate × replication-factor + headroom |

**Tooling map:**

| Tool | Use |
|---|---|
| `kafka-topics.sh` | Create/alter/describe topics |
| `kafka-consumer-groups.sh` | Inspect / reset group offsets |
| `kafka-console-producer/consumer` | Quick CLI test |
| **Schema Registry** (Confluent / Apicurio) | Avro / Protobuf / JSON Schema with compatibility checks |
| **Kafka Connect** | Source / sink connectors (Debezium, JDBC, S3, ES) |
| **Kafka Streams / ksqlDB** | Stream processing inside the Kafka ecosystem |
| **Flink, Spark Structured Streaming** | External stream processing |
| **MirrorMaker 2** / Cluster Linking | Cross-cluster replication |

**Pitfalls:**

| Pitfall | Effect |
|---|---|
| Treating Kafka as a database | It's a log — no random access by primary key, no SQL on the cluster |
| One giant topic for all events | Hard to evolve schema; security boundaries blurred |
| Forgetting key | All records on one partition = no parallelism (or sticky stuck) |
| Single replica | One broker outage = data loss for that partition |
| Long-running consumer commits | Can't catch up after failure; lag explosion |
| Not capping `max.poll.records` | One slow batch starves heartbeats |

**Rule of thumb:** **partition by entity (user_id / order_id) for ordering**, **`acks=all` + `replication.factor=3` + `min.insync.replicas=2`** for durability, **`enable.idempotence=true`** always, **manual offset commits** for reliable processing. Start with **12–48 partitions** per topic and **3 brokers**; add partitions before you saturate. **Compacted topics** for state/snapshots, **dead-letter topics** for poison pills, **outbox + CDC** when crossing DB ↔ Kafka boundaries.
