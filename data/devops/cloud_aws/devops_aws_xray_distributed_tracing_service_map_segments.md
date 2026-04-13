### AWS X-Ray (Distributed Tracing)

**What X-Ray does:**
- Distributed tracing for AWS applications
- Traces requests across: API Gateway, Lambda, ECS, EC2, SQS, SNS, DynamoDB
- Service map: visual graph of service dependencies
- Identify latency bottlenecks and errors

**How it works:**
```
Request → [API Gateway] → [Lambda] → [DynamoDB]
             span 1         span 2      span 3
                    ↓
              X-Ray collects all spans → builds trace → service map
```

**Key concepts:**
- **Trace** — end-to-end journey of a request
- **Segment** — work done by one service (Lambda function, ECS task)
- **Subsegment** — subdivision (DB call, HTTP call within a segment)
- **Trace ID** — unique ID propagated across all services
- **Sampling** — collect a percentage of traces (not all, to reduce cost)

**Enabling X-Ray:**

**Lambda (built-in):**
```yaml
# SAM/CloudFormation
Tracing: Active  # one line enables X-Ray for Lambda
```

**ECS:**
```json
// Add X-Ray daemon as sidecar container in task definition
{
  "name": "xray-daemon",
  "image": "amazon/aws-xray-daemon",
  "portMappings": [{ "containerPort": 2000, "protocol": "udp" }]
}
```

**Custom instrumentation (Ruby):**
```ruby
require 'aws-xray-sdk'

# Auto-instrument AWS SDK, HTTP calls, SQL
XRay.recorder.configure(plugins: [:ecs])

# Custom subsegment
XRay.recorder.capture('payment_processing') do |subsegment|
  subsegment.annotations[:order_id] = order.id
  process_payment(order)
end
```

**Service map:**
```
Visual graph showing:
  [API Gateway] → [Lambda: auth] → [DynamoDB: users]
                → [Lambda: orders] → [RDS: orders DB]
                                   → [SQS: notifications]

Each node shows: latency, error rate, request count
Click a node → see trace details, identify slow segments
```

**X-Ray vs OpenTelemetry vs Datadog:**
| Feature | X-Ray | OpenTelemetry | Datadog APM |
|---------|-------|---------------|-------------|
| AWS integration | Native, zero-config for Lambda | SDK setup | Agent + SDK |
| Multi-cloud | No | Yes (vendor-neutral) | Yes |
| Service map | Yes (built-in) | Backend-dependent | Yes (rich) |
| Cost | $5/million traces sampled | Backend-dependent | Subscription |
| Best for | AWS-only, quick setup | Portable, multi-cloud | Rich APM features |

**Rule of thumb:** X-Ray for quick AWS-native tracing (especially Lambda — one line to enable). OpenTelemetry for vendor-neutral, portable instrumentation. X-Ray works well as a quick start; migrate to OTel if you need multi-cloud or richer backends. Always trace in production — you can't debug distributed systems without it.
