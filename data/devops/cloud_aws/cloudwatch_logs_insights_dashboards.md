### CloudWatch: Logs, Insights & Dashboards

**CloudWatch Logs:**
```
Log Group:  /ecs/myapp              (container per app)
Log Stream: ecs/myapp/container-id  (per instance)

# Filter patterns
ERROR                              # simple text match
{ $.level = "ERROR" }             # JSON filter
{ $.latency > 5000 }             # numeric comparison
```

- Retention: configurable from 1 day to indefinite (default: never expire)
- Log groups organize streams by application or service
- Log streams represent individual sources (container, instance, function)

**Log Insights (SQL-like query language for log analysis):**
```sql
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by bin(5m)
| sort @timestamp desc
| limit 100
```

**Metric filters:**
- Create CloudWatch metrics from log patterns (e.g., count ERRORs/min)
- Turn log data into actionable alarms without code changes
- Example: filter for "OutOfMemory" in logs, create alarm when count > 0

**Subscription filters:**
- Stream logs to Lambda, Elasticsearch, Kinesis, S3
- Use for: real-time log processing, long-term archival, cross-account aggregation

**Dashboards:**
- Custom dashboards with widgets (metrics graphs, logs, alarms, text)
- Auto-dashboards for AWS services
- Cross-account and cross-region dashboards

**CloudWatch vs third-party:**
| Feature | CloudWatch | Datadog/Grafana |
|---------|-----------|-----------------|
| AWS integration | Native, zero setup | Needs agent/integration |
| Custom metrics | Yes (API) | Yes (agent) |
| Log analysis | Log Insights (basic) | More powerful search |
| APM/tracing | X-Ray (separate) | Built-in |
| Cost | Pay per metric/alarm/log | Subscription |
| Alerting | SNS-based | Richer (PagerDuty native) |

**Rule of thumb:** Use Log Insights for ad-hoc log queries -- it is good enough for most troubleshooting. Use metric filters to turn log patterns into alarms without code changes. Use subscription filters to ship logs to S3 for long-term storage. For deep APM and cross-service tracing, consider Datadog or Grafana Cloud alongside CloudWatch.
