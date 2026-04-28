### Message Queues & Event-Driven Architecture

**Definition:** **message queues** decouple producers from consumers, buffer traffic spikes, enable async processing, and let you retry failures. The three patterns — **queue** (one consumer), **pub/sub** (many subscribers), **event stream** (durable log) — solve different problems. Pick by access pattern, not by tool.

**Why message queues exist:**

| Need | What MQs give you |
|---|---|
| **Decouple producer from consumer** | Independent deploys + scaling |
| **Buffer spikes** | Absorb burst traffic |
| **Async processing** | Don't block user requests |
| **Retry failed work** | Without losing it |
| **Scale consumers independently** | Workers per queue |
| **Smooth out backend load** | Steady consumption rate |

**Three patterns — different shapes:**

| Pattern | Behavior | Examples |
|---|---|---|
| **Queue** | One consumer processes each message | SQS, RabbitMQ, Sidekiq |
| **Pub/Sub** | All subscribers receive every message | SNS, Redis Pub/Sub, MQTT |
| **Event stream** | Ordered, replayable durable log | Kafka, Kinesis, Redis Streams |

**Comparison of common systems:**

| System | Type | Best for |
|---|---|---|
| **AWS SQS** | Queue | Simple jobs, AWS-native |
| **RabbitMQ** | Queue + Pub/Sub | Complex routing, priorities, RPC |
| **Apache Kafka** | Event stream | High throughput, event sourcing, CDC |
| **AWS Kinesis** | Event stream | AWS-native streaming |
| **Redis Streams** | Lightweight stream | Simple streaming alongside Redis |
| **AWS SNS** | Pub/Sub | Fan-out to multiple subscribers |
| **Google Pub/Sub** | Pub/Sub | GCP-native |
| **NATS** | Pub/Sub + JetStream | Lightweight, cloud-native |

**Delivery guarantees:**

| Guarantee | Behavior | Use case |
|---|---|---|
| **At-most-once** | May lose, never duplicate | Fire-and-forget telemetry |
| **At-least-once** | Never lose, may duplicate | **Most common** — pair with idempotency |
| **Exactly-once** | Process exactly once | Hardest; often requires idempotency anyway |

> **At-least-once + idempotent consumer** is the practical "exactly-once" most systems achieve.

**Idempotency — the at-least-once partner:**

```
Processing same message twice produces same result.

Examples:
  CREATE order if not exists  → idempotent
  Charge $100 to card        → NOT idempotent without dedup
  SET counter = 5            → idempotent
  INCREMENT counter           → NOT idempotent without dedup
```

**Idempotency techniques:**

| Technique | Detail |
|---|---|
| **Idempotency key** | `INSERT ... ON CONFLICT DO NOTHING` |
| **Dedup table** | Track processed message IDs (with TTL) |
| **State-based check** | "If status = paid, skip" |
| **Versioned writes** | "Update only if version matches" |
| **Outbox pattern** | DB transaction + event together |

**Dead Letter Queue (DLQ):**

| Property | Detail |
|---|---|
| Messages that fail processing N times | Move to DLQ |
| **Always configure a DLQ** | Don't lose failed messages silently |
| Inspect manually OR replay | Operations runbook |
| Alert on DLQ depth | Indicates systemic problem |
| Per-source retention | Configurable |

**Event-driven architecture patterns:**

| Pattern | Sketch | Use case |
|---|---|---|
| **Event Sourcing** | Commands → events → rebuild state | Audit, time-travel, complex domain |
| **CQRS** | Separate read + write models, sync via events | Read-heavy systems, analytics |
| **Choreography** | Each service emits events, others react | Loose coupling, event-driven domain |
| **Orchestration** | Central orchestrator drives flow | Complex workflows with rollback (Sagas) |
| **Outbox** | DB row + event in one transaction | Atomic dual-write |
| **CDC** | Stream DB changes as events | Reliable event publication |

**Choreography vs Orchestration:**

| Property | Choreography | Orchestration |
|---|---|---|
| Coordinator | None | Central orchestrator |
| Coupling | Loose | Tighter |
| Workflow visibility | Implicit (in events) | Explicit |
| Adding a step | Add a subscriber | Update orchestrator |
| Best for | 2–4 services, simple flows | Complex flows, sagas with rollback |

**Backpressure handling:**

| Symptom | Solution |
|---|---|
| Consumer can't keep up | Add more consumers |
| Producer faster than broker | Rate limit producer |
| Queue depth growing | Alert + autoscale consumers |
| Memory pressure | Cap queue size, drop or fail |
| Slow downstream | Apply circuit breaker |

**Per-message size considerations:**

| MQ | Typical max |
|---|---|
| SQS | 256 KB (extended client up to 2 GB via S3) |
| RabbitMQ | Configurable (default no hard limit, but watch memory) |
| Kafka | 1 MB default, configurable |
| Redis Streams | 512 MB string limit |
| **Best practice** | Pass IDs, not blobs — store payload in S3 / DB |

**Throughput characteristics:**

| MQ | Typical throughput |
|---|---|
| SQS | Tens of thousands msg/s |
| RabbitMQ | ~100K msg/s per node |
| Kafka | Millions msg/s per cluster |
| Kinesis | 1 MB/s per shard ingest |
| Redis Streams | Hundreds of thousands msg/s |

**Ordering guarantees:**

| MQ | Ordering |
|---|---|
| SQS Standard | None |
| SQS FIFO | Per-message-group |
| RabbitMQ | Per-queue |
| Kafka | Per-partition |
| Kinesis | Per-shard |
| Redis Streams | Per-stream |

> Cross-partition / cross-shard ordering is rarely guaranteed. Design with this in mind.

**Event design — schema discipline:**

| Practice | Detail |
|---|---|
| **Past-tense names** | `OrderPlaced`, not `CreateOrder` |
| **Self-contained payload** | Don't make consumer call back |
| **Immutable** | Once published, never edited |
| **Versioned** | `event_version` field |
| **Idempotency key** | For dedup |
| **Causation + correlation IDs** | Trace event chains |
| **One aggregate per event** | Don't span aggregates |

**Schema management:**

| Tool | Detail |
|---|---|
| **Schema Registry** (Confluent) | Schemas tied to topics |
| **Avro / Protobuf / JSON Schema** | Format options |
| Backward compatibility | Add fields, never break |
| Forward compatibility | Tolerant readers |

**Decision matrix — pick the right MQ:**

| Need | Pick |
|---|---|
| Simple async jobs in AWS | **SQS** |
| Background jobs in Rails | Sidekiq (Redis-backed) |
| Complex routing, priorities | **RabbitMQ** |
| High-throughput streaming, replay | **Kafka** |
| AWS-native streaming | **Kinesis** |
| Lightweight stream alongside Redis | **Redis Streams** |
| Pub/Sub fan-out | SNS or Pub/Sub |
| Event sourcing | Kafka or EventStoreDB |
| Cross-cloud portability | Kafka |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| At-least-once without idempotent consumer | Duplicate processing corrupts state |
| No DLQ | Failed messages lost silently |
| Ordering assumed across partitions | Cross-partition surprises |
| Huge payloads in messages | Broker pressure, network choke |
| Synchronous "message and wait" patterns | Recreating RPC |
| Pub/Sub for durable messaging | Messages lost on disconnect (use Streams) |
| One topic for everything | No routing, no scaling |
| No schema registry | Producer breaks consumers silently |
| Long-running consumers without heartbeat | Visibility timeout fires, redelivery |
| Consumer that retries forever | DLQ + alerting needed |

**Operational checklist:**

| Item | Detail |
|---|---|
| DLQ configured | All queues |
| Alert on DLQ depth | Detect systemic failures |
| Alert on consumer lag | Backpressure |
| Idempotent consumers | Always |
| Schema versioning | Forward + backward compat |
| Retry policy | Exponential backoff |
| Tracing | Correlation IDs flow through events |
| Monitoring | Per-topic / per-queue metrics |

**Cross-references:**

- Choreography vs orchestration: [choreography_*.md](../../distributed_systems/choreography_event_based_decentralized_coordination.md)
- Kafka deep dive: [kafka_*.md](../../data_engineering/kafka_event_streaming_topic_partition_offset.md)
- Sagas: [sagas_*.md](../../distributed_systems/sagas_distributed_transactions_compensation.md)
- Idempotency: [idempotency_*.md](../../distributed_systems/idempotency_key_exactly_once_deduplication.md)
- CDC + outbox: [cdc_*.md](../../data_engineering/cdc_debezium_change_data_capture_wal_outbox.md)
- AWS Kinesis: [aws_kinesis_*.md](../../devops/cloud_aws/aws_kinesis_data_streams_firehose_realtime_streaming.md)

**Rule of thumb:** **Use queues to decouple and buffer.** **SQS** for simple AWS jobs; **Kafka** for high-throughput event streaming; **RabbitMQ** for complex routing. **Always design consumers to be idempotent** (at-least-once is the practical norm). **Always configure a DLQ** + alert on its depth. Pass **IDs, not blobs**, and version your **event schemas** with backward compatibility from day one.
