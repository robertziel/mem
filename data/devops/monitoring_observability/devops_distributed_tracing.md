### Distributed Tracing

**Problem it solves:**
- In microservices, one user request hits many services
- Hard to know which service is slow or failing
- Logs from different services are disconnected

**Key concepts:**
- **Trace** - the full journey of a request through all services
- **Span** - one operation within a trace (e.g., one service call)
- **Trace ID** - unique ID shared across all spans in a trace
- **Span ID** - unique ID for each span
- **Parent Span ID** - links child spans to parent (forms a tree)

**Example trace:**
```
Trace: abc-123
  [API Gateway] 200ms
    [Auth Service] 15ms
    [Product Service] 150ms
      [Database] 120ms      <-- bottleneck
    [Cache] 2ms
```

**Context propagation:**
- Trace context is passed between services via HTTP headers
- W3C standard: `traceparent: 00-<trace-id>-<span-id>-01`
- B3 format (Zipkin): `X-B3-TraceId`, `X-B3-SpanId`
- Libraries handle this automatically (OTel SDK, middleware)

**OpenTelemetry setup:**
```
App (OTel SDK) -> OTel Collector -> Backend (Jaeger/Tempo/Datadog)
                  (process, batch, export)
```

**OTel Collector config:**
```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
exporters:
  jaeger:
    endpoint: jaeger:14250
processors:
  batch:
    timeout: 5s
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [jaeger]
```

**Tools:**
- **Jaeger** - open-source, CNCF, popular in K8s
- **Grafana Tempo** - integrates with Loki/Grafana (trace by ID, no indexing)
- **AWS X-Ray** - AWS-native tracing
- **Datadog APM** - commercial, excellent correlation with metrics/logs

**Sampling strategies:**
- **Head sampling** - decide at start (e.g., sample 10% of traces)
- **Tail sampling** - decide after trace completes (keep errors, slow traces)
- Tail sampling is better but requires the OTel Collector

**Rule of thumb:** Adopt OpenTelemetry for instrumentation. Propagate trace context through all services. Use tail sampling to keep interesting traces. Correlate traces with logs via trace_id.
