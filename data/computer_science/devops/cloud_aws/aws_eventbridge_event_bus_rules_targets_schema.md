### AWS EventBridge

**What EventBridge does:**
- Serverless event bus for event-driven architectures
- Route events from AWS services, custom apps, and SaaS to targets
- Content-based filtering with rules
- Schema registry for event discovery

**Architecture:**
```
Event Sources → [Event Bus] → Rules (pattern matching) → Targets
                                                          ├── Lambda
                                                          ├── SQS
                                                          ├── Step Functions
                                                          ├── SNS
                                                          ├── Kinesis
                                                          ├── API Gateway
                                                          └── Another Event Bus
```

**Event structure:**
```json
{
  "source": "com.myapp.orders",
  "detail-type": "OrderPlaced",
  "detail": {
    "order_id": "123",
    "user_id": "u_456",
    "total": 150.00,
    "items": 3
  },
  "time": "2024-01-15T10:30:00Z"
}
```

**Rules (content-based routing):**
```json
{
  "source": ["com.myapp.orders"],
  "detail-type": ["OrderPlaced"],
  "detail": {
    "total": [{ "numeric": [">", 100] }]
  }
}
```
- Match on any field in the event
- Numeric comparisons, prefix, suffix, exists/not-exists
- One event can trigger multiple rules (fan-out)

**Sending events:**
```ruby
client = Aws::EventBridge::Client.new
client.put_events(
  entries: [{
    source: 'com.myapp.orders',
    detail_type: 'OrderPlaced',
    detail: { order_id: '123', total: 150.0 }.to_json,
    event_bus_name: 'default'
  }]
)
```

**Scheduled rules (cron):**
```
Schedule: rate(5 minutes)    → trigger Lambda every 5 min
Schedule: cron(0 9 * * ? *)  → trigger at 9 AM UTC daily
```
- Replacement for CloudWatch Events scheduled rules
- Use for: cleanup jobs, health checks, periodic processing

**Event replay:**
- Archive events for replay (up to indefinite retention)
- Replay archived events to test new rules or recover from failures

**Schema registry:**
- Auto-discovers event schemas from events on the bus
- Generates code bindings (Java, Python, TypeScript)
- Versioned schemas for evolution

**EventBridge vs SNS vs SQS:**
| Feature | EventBridge | SNS | SQS |
|---------|-------------|-----|-----|
| Pattern | Event routing | Fan-out | Queue |
| Filtering | Rich content-based | Message attributes | No |
| Sources | AWS, custom, SaaS | Custom | Custom |
| Scheduling | Yes (cron/rate) | No | Delay only |
| Replay | Yes (archive) | No | No |
| Best for | Event-driven architecture | Simple fan-out | Job processing |

**Rule of thumb:** EventBridge for event-driven architectures with content-based routing. SNS+SQS for simpler fan-out. EventBridge for scheduled tasks (replaces CloudWatch Events). Use schema registry for event documentation. Archive events for debugging and replay.
