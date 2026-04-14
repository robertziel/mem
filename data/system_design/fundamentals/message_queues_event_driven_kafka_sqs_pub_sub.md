### Message Queues and Event-Driven Architecture

**Why message queues:**
- Decouple producers from consumers
- Buffer traffic spikes (absorb bursts)
- Enable async processing (don't block the user)
- Retry failed operations
- Scale consumers independently

**Queue vs Pub/Sub vs Event Stream:**

| Pattern | Behavior | Use case |
|---------|----------|----------|
| **Queue** | One consumer processes each message | Job processing, task distribution |
| **Pub/Sub** | All subscribers receive every message | Notifications, fan-out |
| **Event stream** | Ordered, replayable log of events | Event sourcing, CDC, analytics |

**Common message queue systems:**
| System | Type | Best for |
|--------|------|----------|
| SQS | Queue | Simple job queues, AWS-native |
| RabbitMQ | Queue + Pub/Sub | Complex routing, priorities, RPC |
| Kafka | Event stream | High throughput, event sourcing, CDC |
| Redis Streams | Lightweight stream | Simple streaming within existing Redis |
| SNS | Pub/Sub | Fan-out to multiple subscribers |

**Delivery guarantees:**
- **At-most-once** - message may be lost, never duplicated (fire and forget)
- **At-least-once** - message never lost, may be duplicated (most common)
- **Exactly-once** - message processed exactly once (hardest, often requires idempotency)

**Idempotency (critical with at-least-once):**
- Processing the same message twice should produce the same result
- Use idempotency keys: `INSERT ... ON CONFLICT DO NOTHING`
- Deduplication table: track processed message IDs

**Dead Letter Queue (DLQ):**
- Messages that fail processing after N retries
- Send to DLQ for manual inspection or separate processing
- Always configure a DLQ (don't lose failed messages silently)

**Event-driven architecture patterns:**
```
Event Sourcing:   [Command] -> [Event Store] -> [Event] -> [Consumers rebuild state]
CQRS:             [Write Model] -> [Event] -> [Read Model] (separate read/write stores)
Choreography:     [Service A emits event] -> [Service B reacts] -> [Service C reacts]
Orchestration:    [Orchestrator] -> tells Service A -> tells Service B -> tells Service C
```

**Backpressure handling:**
- Consumer can't keep up with producer
- Solutions: increase consumers, batch processing, rate limit producer, queue size limits

**Rule of thumb:** Use queues to decouple and buffer. SQS for simple AWS jobs, Kafka for event streaming at scale, RabbitMQ for complex routing. Always design consumers to be idempotent. Always configure a DLQ.
