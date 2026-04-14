### AWS SQS (Simple Queue Service)

**What SQS does:**
- Fully managed message queue
- Decouple producers from consumers
- Buffer traffic spikes

**Standard vs FIFO:**
| Feature | Standard | FIFO |
|---------|----------|------|
| Throughput | Nearly unlimited | 300 msg/sec (3000 with batching) |
| Ordering | Best-effort | Guaranteed (per message group) |
| Delivery | At-least-once (may duplicate) | Exactly-once |
| Deduplication | No | Yes (5-min window) |
| Use case | Most workloads, high throughput | Order-sensitive (payments, inventory) |

**Core concepts:**
- **Visibility timeout**: after a consumer reads a message, it's hidden for N seconds. If not deleted (acknowledged), it reappears for another consumer.
- **Message retention**: 1 min to 14 days (default 4 days)
- **Max message size**: 256 KB (use S3 for larger payloads)
- **Long polling**: consumer waits up to 20 seconds for messages (reduces empty responses, saves cost)

**Producer → Queue → Consumer flow:**
```
Producer: SendMessage(queue, body, optional delay)
Consumer: ReceiveMessage(queue, max 10, wait 20s)
          → Process message
          → DeleteMessage(queue, receiptHandle)  ← acknowledges success

If consumer crashes:
  → visibility timeout expires
  → message reappears for another consumer (retry)
```

**Dead Letter Queue (DLQ):**
```
Main Queue: maxReceiveCount = 3
  Message fails 3 times → moves to DLQ automatically

DLQ: inspect failed messages, debug, reprocess
  aws sqs receive-message --queue-url DLQ_URL
  # Fix the issue, then redrive messages back to main queue
```
- Always configure a DLQ (don't lose failed messages silently)
- Set retention on DLQ to 14 days (max time to investigate)

**Delay queue:**
- Delay delivery of new messages by 0-900 seconds
- Use for: scheduled retry, rate limiting, debounce

**SQS + Lambda:**
```
SQS Queue → Lambda (event source mapping)
  Lambda polls the queue automatically
  Batch size: 1-10,000 messages
  Concurrency: scales with queue depth
  On failure: message returns to queue (visibility timeout)
```

**SQS vs SNS vs EventBridge:**
| Service | Pattern | Consumer | Persistence |
|---------|---------|----------|-------------|
| SQS | Queue | Single consumer group | Yes (up to 14 days) |
| SNS | Pub/Sub | Multiple subscribers | No (fire and forget) |
| EventBridge | Event routing | Rule-based routing | No |

**Common pattern (fan-out):**
```
SNS Topic → SQS Queue A (email service)
           → SQS Queue B (analytics service)
           → SQS Queue C (inventory service)
Each queue has independent consumers, independent retry.
```

**Rule of thumb:** Standard queue for most cases (higher throughput). FIFO only when ordering matters (payments, sequential processing). Always set a DLQ (maxReceiveCount=3-5). Use long polling (WaitTimeSeconds=20) to reduce costs. SQS + Lambda is the simplest async processing pattern on AWS.
