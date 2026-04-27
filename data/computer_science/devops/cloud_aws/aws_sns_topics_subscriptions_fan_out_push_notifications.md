### AWS SNS (Simple Notification Service)

**What SNS does:**
- Pub/Sub messaging: publish one message, deliver to multiple subscribers
- Push-based (SNS pushes to subscribers, unlike SQS where consumers poll)

**How it works:**
```
Publisher → SNS Topic → Subscriber 1 (SQS queue)
                       → Subscriber 2 (Lambda)
                       → Subscriber 3 (HTTP endpoint)
                       → Subscriber 4 (Email)
                       → Subscriber 5 (SMS)
```

**Subscriber types:**
| Type | Delivery | Use case |
|------|----------|----------|
| SQS | Queue for async processing | Fan-out to multiple services |
| Lambda | Direct invocation | Serverless event processing |
| HTTP/HTTPS | Webhook POST | External service notification |
| Email | Email message | Alerts to humans |
| SMS | Text message | Critical alerts, 2FA |
| Kinesis Firehose | Stream to S3/Redshift | Analytics, logging |

**Message filtering (per subscriber):**
```json
{
  "order_type": ["premium"],
  "amount": [{ "numeric": [">", 100] }]
}
```
- Each subscriber can filter which messages they receive
- Reduces noise: subscriber only gets relevant messages
- Filtering happens at SNS (not at the subscriber)

**Fan-out pattern (most common):**
```
Order Service publishes "order_placed" to SNS Topic
  → SQS: Email Service (send confirmation)
  → SQS: Inventory Service (reserve items)
  → SQS: Analytics Service (track metrics)
  → Lambda: Fraud Check (real-time)

Each subscriber processes independently, at its own pace.
If one fails, others are unaffected.
```

**SNS + SQS fan-out vs EventBridge:**
- SNS + SQS: simple fan-out, SQS provides persistence and retry
- EventBridge: more sophisticated routing rules, schema registry, event replay
- Use SNS + SQS for straightforward pub/sub; EventBridge for complex event routing

**FIFO Topics:**
- Ordered, deduplicated message delivery
- Only SQS FIFO queues can subscribe
- Use when: order matters for all subscribers

**Message attributes:**
```
MessageBody: '{"order_id": "123", "total": 500}'
MessageAttributes:
  order_type: { DataType: "String", StringValue: "premium" }
  region: { DataType: "String", StringValue: "us-east" }
```

**Rule of thumb:** SNS for fan-out (one event, many consumers). Always pair with SQS for reliable delivery (SNS alone is fire-and-forget). Use message filtering to reduce subscriber noise. SNS + SQS is the standard decoupling pattern on AWS. Use EventBridge when you need content-based routing rules.
