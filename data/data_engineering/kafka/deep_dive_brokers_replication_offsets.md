### Kafka Deep Dive: Brokers, Partitions, Replication & Consumer Groups

**Broker architecture:**
```
Kafka Cluster:
  Broker 0: [Topic-A P0 (leader), Topic-B P1 (follower)]
  Broker 1: [Topic-A P1 (leader), Topic-A P0 (follower), Topic-B P0 (leader)]
  Broker 2: [Topic-A P0 (follower), Topic-B P1 (leader), Topic-A P1 (follower)]

Controller: one broker elected as controller (manages partition leaders, broker failures)
```
- Each broker stores a subset of partitions
- Brokers are stateless (consumer tracks its own offset)
- Add brokers to scale horizontally (rebalance partitions)

**Partitions deep dive:**
```
Topic: orders (6 partitions, replication factor 3)

  P0: [msg0, msg3, msg6, msg9, ...]   → Leader on Broker 0
  P1: [msg1, msg4, msg7, msg10, ...]  → Leader on Broker 1
  P2: [msg2, msg5, msg8, msg11, ...]  → Leader on Broker 2
  P3: [msg12, msg15, ...]             → Leader on Broker 0
  P4: [msg13, msg16, ...]             → Leader on Broker 1
  P5: [msg14, msg17, ...]             → Leader on Broker 2

Key routing: hash(message_key) % num_partitions → partition number
No key: round-robin across partitions
```

**Ordering guarantee:**
- Within a partition: strict ordering (offset 0, 1, 2, ...)
- Across partitions: NO ordering guarantee
- To guarantee order for entity: use entity ID as message key → same partition
- Example: `key=user_123` → all events for user 123 go to same partition → ordered

**Replication:**
```
Partition 0:
  Leader (Broker 0):   [msg0, msg1, msg2, msg3]  ← writes go here
  Follower (Broker 1): [msg0, msg1, msg2, msg3]  ← replicated
  Follower (Broker 2): [msg0, msg1, msg2]         ← slightly behind (ISR)

ISR (In-Sync Replicas): followers that are caught up with leader
  - If leader dies → one of the ISR followers becomes new leader
  - min.insync.replicas=2: require at least 2 ISR for writes to succeed
```

**Consumer groups:**
```
Topic: orders (6 partitions)

Consumer Group A (3 consumers):
  Consumer-1: reads P0, P1
  Consumer-2: reads P2, P3
  Consumer-3: reads P4, P5

Consumer Group B (1 consumer):
  Consumer-1: reads P0, P1, P2, P3, P4, P5 (all partitions)

Rules:
  - Each partition assigned to exactly ONE consumer per group
  - Multiple groups can read the same topic independently
  - If consumers > partitions → some consumers sit idle
  - If consumer dies → partitions rebalanced to remaining consumers
```

**Offset management:**
```
Partition 0: [0, 1, 2, 3, 4, 5, 6, 7, 8]
                                 ↑
                        Consumer committed offset: 5
                        (messages 0-5 processed, 6-8 pending)

Auto-commit (default): commit periodically (risk: process then crash before commit → reprocess)
Manual commit: commit after successful processing (recommended)

auto.offset.reset:
  earliest → read from beginning (when no committed offset exists)
  latest   → read only new messages (skip history)
```

**Consumer rebalancing:**
- Triggered by: consumer joins/leaves group, new partitions added
- During rebalance: NO messages consumed (brief pause)
- Cooperative rebalancing (newer): only reassign affected partitions (less disruption)
- Static group membership: `group.instance.id` prevents unnecessary rebalances on restart

**Retention:**
| Strategy | How | Use when |
|----------|-----|----------|
| Time-based | Delete segments older than `retention.ms` (default 7 days) | Most use cases |
| Size-based | Delete when topic exceeds `retention.bytes` | Fixed storage budget |
| Compaction | Keep latest value per key, delete older | Stateful topics (config, snapshots) |

**Log compaction (key concept):**
```
Before compaction:
  Key=A: v1, Key=B: v1, Key=A: v2, Key=C: v1, Key=B: v2

After compaction:
  Key=A: v2, Key=C: v1, Key=B: v2  (only latest value per key kept)
```
- Use for: maintaining latest state per entity (changelog topics, KTable)
- Tombstone: `key=A, value=null` → deletes key A from compacted log

**Rule of thumb:** Partition by entity ID for ordering. Set `replication.factor=3` and `min.insync.replicas=2` for production. Manual offset commit for reliability. Start with 3× expected consumer count for partitions. Log compaction for stateful topics. ISR is the foundation of Kafka's durability guarantee.
