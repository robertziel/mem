### Three Pillars of Observability

**Metrics:**
- Numeric measurements over time (counters, gauges, histograms)
- Aggregatable, low cardinality, cheap to store
- Examples: request rate, error rate, CPU usage, queue depth
- Tools: Prometheus, CloudWatch, Datadog, StatsD

**Logs:**
- Discrete events with context (timestamp, message, metadata)
- High cardinality, expensive at scale
- Examples: request log, error stack trace, audit events
- Tools: ELK (Elasticsearch, Logstash, Kibana), Loki, CloudWatch Logs, Datadog Logs

**Traces:**
- End-to-end journey of a request across services
- Shows latency per service, identifies bottlenecks
- Composed of spans (each span = one service/operation)
- Tools: Jaeger, Zipkin, AWS X-Ray, Datadog APM, OpenTelemetry

**When to use each:**

| Signal | Question it answers |
|--------|-------------------|
| Metrics | "Is something wrong?" (alerting, dashboards) |
| Logs | "What happened?" (debugging, auditing) |
| Traces | "Where is the bottleneck?" (distributed debugging) |

**How they connect:**
```
Alert fires (metric: error rate > 5%)
  -> Check dashboard (metric: which endpoint?)
  -> Find error logs (log: what's the error message?)
  -> Trace the request (trace: which downstream service failed?)
```

**OpenTelemetry (OTel):**
- Vendor-neutral standard for collecting all three signals
- SDKs for most languages
- OTel Collector: receives, processes, exports telemetry data
- Export to any backend (Prometheus, Jaeger, Datadog, etc.)
- Recommended over vendor-specific SDKs for portability

**Structured logging:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "error",
  "message": "payment failed",
  "service": "checkout",
  "trace_id": "abc123",
  "user_id": "u_456",
  "error": "card_declined"
}
```
- JSON logs > plain text (searchable, filterable)
- Include trace_id to correlate logs with traces

**Rule of thumb:** Use metrics for alerting and dashboards, logs for debugging, traces for distributed request flow. Adopt OpenTelemetry for vendor-neutral instrumentation. Always use structured (JSON) logging.
