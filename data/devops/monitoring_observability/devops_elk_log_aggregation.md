### Log Aggregation (ELK, Loki)

**ELK Stack:**
- **Elasticsearch** - search and analytics engine (stores logs)
- **Logstash** - log pipeline (collect, parse, transform, ship)
- **Kibana** - visualization UI (search, dashboards)
- Alternative: EFK (Fluentd instead of Logstash) or EFKb (Fluent Bit)

**ELK data flow:**
```
App -> stdout -> Fluent Bit (DaemonSet) -> Elasticsearch -> Kibana
                 (collect + parse)         (index + store)   (query + visualize)
```

**Fluent Bit vs Fluentd:**
| Feature | Fluent Bit | Fluentd |
|---------|-----------|---------|
| Resource usage | Lightweight (~450KB) | Heavier (~40MB) |
| Written in | C | Ruby |
| Best for | Edge/DaemonSet collection | Aggregation, complex routing |
| Plugins | Fewer | Extensive ecosystem |

**Loki (Grafana's log solution):**
- Log aggregation inspired by Prometheus
- Only indexes labels (not full text) -> much cheaper than Elasticsearch
- Pairs with Grafana for querying
- Uses LogQL (similar to PromQL)

```logql
# All error logs from web service
{app="web"} |= "error"

# Parse JSON logs and filter
{app="web"} | json | status >= 500

# Count errors per minute
count_over_time({app="web"} |= "error" [1m])
```

**Structured logging best practices:**
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "error",
  "service": "payment-api",
  "trace_id": "abc-123-def",
  "request_id": "req-789",
  "message": "charge failed",
  "error_code": "card_declined",
  "user_id": "u_456",
  "amount_cents": 5000
}
```

**Log levels:**
- `DEBUG` - detailed diagnostic info (disabled in production)
- `INFO` - normal operations (request served, job completed)
- `WARN` - unexpected but handled (retry succeeded, deprecated usage)
- `ERROR` - failure requiring attention (unhandled exception, service unavailable)
- `FATAL` - application cannot continue

**What NOT to log:**
- Passwords, tokens, API keys, credit card numbers
- PII without consent (use masking/redaction)
- High-volume debug logs in production

**Rule of thumb:** Log to stdout (12-factor). Use structured JSON. Ship with Fluent Bit as DaemonSet. Loki for cost-effective logs in Grafana stack. ELK for full-text search requirements. Always include trace_id for correlation.
