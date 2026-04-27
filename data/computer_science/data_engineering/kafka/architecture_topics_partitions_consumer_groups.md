### Kafka Architecture

**What Kafka is:**
- Distributed event streaming platform
- Durable, ordered, append-only log
- High throughput (millions of messages/sec)
- Used for: event streaming, CDC, log aggregation, metrics, messaging

**Core concepts:**
- **Topic** - named stream of messages (like a table in a DB)
- **Partition** - ordered, immutable sequence of records within a topic
- **Offset** - position of a message within a partition (monotonically increasing)
- **Broker** - Kafka server, stores partitions
- **Producer** - writes messages to topics
- **Consumer** - reads messages from topics
- **Consumer Group** - set of consumers that share partitions (parallel processing)

**Architecture:**
```
Producers -> [Broker 1] [Broker 2] [Broker 3] -> Consumers
              Topic A:    Topic A:    Topic A:
              P0, P1      P2, P3      P4, P5    (partitions distributed)
```

**Partitioning:**
- Messages with same key go to the same partition (ordering per key) — but only while partition count stays constant; adding partitions remaps future records
- No key = **sticky partitioning** since Kafka 2.4 (default): pick a partition and fill its batch, then rotate — better batching/locality than naive round-robin (which legacy clients still use)
- Partition count determines max parallelism (one consumer per partition per group)
- Cannot decrease partitions (only increase)

**Consumer groups:**
```
Topic: 4 partitions
Consumer Group A: [C1: P0,P1] [C2: P2,P3]  (2 consumers, 2 partitions each)
Consumer Group B: [C1: P0] [C2: P1] [C3: P2] [C4: P3]  (4 consumers, 1 each)
```
- Each partition consumed by exactly one consumer in a group
- Multiple groups can read the same topic independently
- Adding consumers beyond partition count = idle consumers

**Replication:**
- Each partition has replicas across brokers
- One leader (handles reads/writes), followers replicate
- `replication.factor = 3` (typical production setting)
- ISR (In-Sync Replicas): followers that are caught up

**Message delivery guarantees:**
- `acks=0` - fire and forget (fastest, may lose messages)
- `acks=1` - leader acknowledged (balanced)
- `acks=all` - all ISRs acknowledged (safest, highest latency)
- Exactly-once: `enable.idempotence=true` + transactional producer

**Retention:**
- Time-based: `retention.ms=604800000` (7 days default)
- Size-based: `retention.bytes`
- Compacted: keep latest value per key (for state/snapshots)

**Key configurations:**
```
# Producer
acks=all
enable.idempotence=true
max.in.flight.requests.per.connection=5

# Consumer
auto.offset.reset=earliest|latest
enable.auto.commit=false   (commit offsets manually for reliability)
max.poll.records=500

# Topic
partitions=12
replication.factor=3
min.insync.replicas=2
```

**Rule of thumb:** Partition by entity ID (user_id, order_id) for ordering. Set `acks=all` + `min.insync.replicas=2` for durability. Start with 3x expected consumer count for partition count. Use consumer groups for parallel processing. Disable auto-commit for reliable processing.
