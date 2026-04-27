### AMQP (Advanced Message Queuing Protocol) & RabbitMQ

**What AMQP is:**
- Open standard wire protocol for message-oriented middleware
- Defines: message format, queuing, routing, reliability, security
- Port 5672 (plaintext), Port 5671 (AMQPS — over TLS)
- Primary implementation: RabbitMQ

**AMQP model:**
```
Producer → [Exchange] → Binding → [Queue] → Consumer

Exchange types:
  Direct:  route by exact routing key match
  Fanout:  broadcast to ALL bound queues
  Topic:   route by pattern match (order.* , *.error)
  Headers: route by message headers
```

**RabbitMQ architecture:**
```
Producer → Exchange (direct) → [Queue: orders]     → Consumer A
                              → [Queue: notifications] → Consumer B

Producer → Exchange (fanout) → [Queue: logging]    → Consumer C
                              → [Queue: analytics]  → Consumer D
                              → [Queue: audit]      → Consumer E
```

**Exchange types explained:**
| Type | Routing | Example |
|------|---------|---------|
| Direct | Exact key match | key="order.created" → queue bound with "order.created" |
| Fanout | All bound queues | Broadcast to logging + analytics + audit |
| Topic | Pattern match | "order.*" matches "order.created", "order.shipped" |
| Headers | Header attributes | Route by content-type, priority |

**Message acknowledgment:**
```
1. Consumer receives message
2. Consumer processes message
3. Consumer sends ACK → RabbitMQ removes from queue

If consumer crashes before ACK:
  → Message requeued → delivered to another consumer (at-least-once)

Manual ACK (recommended):
  auto_ack=false → consumer explicitly ACKs after processing
```

**RabbitMQ vs Kafka vs SQS:**
| Feature | RabbitMQ (AMQP) | Kafka | SQS |
|---------|----------------|-------|-----|
| Model | Queue + Exchange routing | Append-only log | Simple queue |
| Routing | Rich (direct, topic, fanout, headers) | Partition by key | None |
| Message replay | No (deleted after ACK) | Yes (retention-based) | No |
| Ordering | Per queue | Per partition | FIFO mode only |
| Throughput | Moderate (~50K msg/s) | Very high (~1M msg/s) | Moderate |
| Protocol | AMQP (open standard) | Kafka protocol (proprietary) | HTTP (AWS) |
| Best for | Complex routing, RPC, task queues | Event streaming, CDC, high throughput | Simple AWS job queues |

**When to use RabbitMQ:**
- Complex routing logic (topic exchanges, headers routing)
- Request-reply (RPC) patterns
- Priority queues
- Moderate throughput with rich features
- Team familiar with AMQP

**Rule of thumb:** RabbitMQ for complex routing and moderate throughput. Kafka for high-throughput event streaming. SQS for simple AWS-native queuing. AMQP is an open standard — but Kafka dominates for event-driven architectures. Choose based on routing complexity vs throughput needs.
