### Microservices Observability & Distributed Tracing

**Why observability is harder in microservices:**
- One user request touches 5-20 services
- Failures can originate anywhere in the chain
- Logs from each service are isolated
- Performance bottlenecks are hidden in service-to-service calls

**Three pillars applied to microservices:**

**1. Distributed tracing (most important for microservices):**
```
Request -> [API Gateway: 200ms]
             -> [Auth Service: 15ms]
             -> [Product Service: 150ms]
                  -> [Database: 120ms]     ← bottleneck
                  -> [Cache: 2ms]
             -> [Recommendation: 30ms]
```
- Trace ID propagated across all services
- Each service creates a span (unit of work)
- Tools: Jaeger, Grafana Tempo, AWS X-Ray, Datadog APM

**OpenTelemetry (OTel) setup:**
```ruby
# Ruby (opentelemetry-sdk)
require 'opentelemetry/sdk'
require 'opentelemetry/instrumentation/all'

OpenTelemetry::SDK.configure do |c|
  c.service_name = 'order-service'
  c.use_all  # auto-instrument HTTP, DB, Redis, etc.
end

# Custom span
tracer = OpenTelemetry.tracer_provider.tracer('order-service')
tracer.in_span('process_payment') do |span|
  span.set_attribute('order.id', order.id)
  span.set_attribute('payment.amount', amount)
  # ... business logic
end
```

**Context propagation (automatic with OTel):**
```
Service A -> HTTP header: traceparent: 00-<trace-id>-<span-id>-01
Service B -> reads header, creates child span with same trace-id
```

**2. Metrics per service (RED method):**
```
Rate:     requests per second
Errors:   error rate (5xx / total)
Duration: latency percentiles (p50, p95, p99)
```
- Dashboard per service + aggregate dashboard
- Alert on: error rate spike, latency degradation, throughput drop

**3. Structured logs with correlation:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "error",
  "service": "payment-service",
  "trace_id": "abc123def456",
  "span_id": "789xyz",
  "message": "charge failed",
  "user_id": "u_456",
  "error": "card_declined"
}
```
- Include `trace_id` in every log line
- Click trace_id in logs → jump to full distributed trace
- Correlate: logs ↔ traces ↔ metrics

**Service dependency graph:**
- Auto-generated from tracing data
- Shows: which services call which, traffic volume, error rates
- Tools: Kiali (Istio), Grafana service map, Datadog service map

**Health checks and readiness:**
```
GET /health   -> is the process alive? (liveness)
GET /ready    -> can it serve traffic? (readiness, check DB/cache connections)
GET /metrics  -> Prometheus metrics endpoint
```

**Alerting strategy for microservices:**
- Alert on symptoms (user-facing error rate), not causes (one service's CPU)
- SLO-based: alert when error budget is burning too fast
- Avoid alert per service (too many alerts → alert fatigue)
- Escalation: automated page → on-call → team lead

**Rule of thumb:** Adopt OpenTelemetry for vendor-neutral instrumentation. Trace ID in every log line. RED metrics for every service. Alert on user-facing symptoms, debug with traces. Service map from tracing data shows the full picture. Observability is not optional in microservices — it's a prerequisite.
