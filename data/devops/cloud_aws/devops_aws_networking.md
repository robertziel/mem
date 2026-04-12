### AWS Networking Services

**Route53 (DNS):**
- Managed DNS service
- Routing policies: Simple, Weighted, Latency, Failover, Geolocation, Multi-value
- Health checks: monitor endpoints, trigger failover
- **ALIAS record** - AWS-specific, works at zone apex (unlike CNAME)
- Supports private hosted zones (internal DNS within VPC)

**CloudFront (CDN):**
- Global content delivery network
- Edge locations cache content close to users
- Origins: S3, ALB, custom HTTP
- Supports: TLS, custom domains, signed URLs, Lambda@Edge
- Use OAC (Origin Access Control) to restrict S3 access

**API Gateway:**
- Managed API frontend (REST, HTTP, WebSocket)
- Features: throttling, API keys, auth (Cognito, Lambda authorizer), caching
- HTTP API: simpler, cheaper, faster (most new projects)
- REST API: more features (request validation, WAF, usage plans)
- Integrates with Lambda, HTTP backends, AWS services

**SQS (Simple Queue Service):**
- Fully managed message queue
- **Standard** - at-least-once delivery, best-effort ordering
- **FIFO** - exactly-once, guaranteed ordering (lower throughput)
- Dead Letter Queue (DLQ) for failed messages
- Use for: decoupling services, background jobs, buffering

**SNS (Simple Notification Service):**
- Pub/sub messaging
- Topics: fan-out to multiple subscribers
- Subscribers: SQS, Lambda, HTTP, email, SMS
- Use for: event fan-out, alerts, notifications

**SQS vs SNS vs EventBridge:**

| Service | Pattern | Use case |
|---------|---------|----------|
| SQS | Queue (1 consumer) | Job queues, task buffers |
| SNS | Pub/Sub (fan-out) | Notifications, multiple consumers |
| EventBridge | Event bus (routing rules) | Event-driven architecture, cross-service |

**EventBridge:**
- Serverless event bus
- Rules route events to targets based on pattern matching
- Sources: AWS services, custom apps, SaaS
- Schema registry for event discovery
- Use for: event-driven architectures, decoupled microservices

**Rule of thumb:** Route53 for DNS, CloudFront for static content and API caching, SQS for job queues, SNS for fan-out, EventBridge for event-driven architectures. Use HTTP API Gateway (not REST) unless you need REST-specific features.
