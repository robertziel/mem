### CloudWatch — Logs, Insights, Dashboards

**Definition:** AWS-native log management. **Logs** = ingestion + storage; **Insights** = SQL-like query language for ad-hoc analysis; **Dashboards** = custom visualization. Pair with **metric filters** to turn log patterns into alarms without code changes, and **subscription filters** to stream to other services (Lambda, Elasticsearch, S3).

**CloudWatch Logs — basics:**

| Concept | Detail |
|---|---|
| **Log Group** | Container per app/service (e.g., `/ecs/myapp`) |
| **Log Stream** | Per-source stream (per-container, per-instance, per-Lambda) |
| **Log Event** | One entry with timestamp + message |
| **Retention** | 1 day to indefinite (default: never expire — costs grow!) |
| **Encryption** | KMS optional |
| **Cross-account** | Subscriptions or destination accounts |

**Hierarchy example:**

```
Log Group: /ecs/myapp
  ├── Log Stream: ecs/myapp/container-id-1
  ├── Log Stream: ecs/myapp/container-id-2
  └── Log Stream: ecs/myapp/container-id-3

Log Group: /aws/lambda/order-processor
  ├── Log Stream: 2026/04/27/[$LATEST]abc123
  └── Log Stream: 2026/04/28/[$LATEST]xyz789
```

**Log retention defaults — costly trap:**

| Default | Detail |
|---|---|
| New log groups | **Never expire** by default |
| Per-MB ingestion + storage cost | Adds up over time |
| Set retention immediately | 7 / 14 / 30 / 90 days typical |
| Or ship to S3 + delete from CloudWatch | Cheaper long-term |

**Filter patterns (basic):**

```
# Simple text match
ERROR

# JSON filter
{ $.level = "ERROR" }
{ $.user_id = "u_42" }

# Numeric comparison
{ $.latency > 5000 }

# Compound
{ ($.level = "ERROR") && ($.service = "payment") }

# Regex (for unstructured)
?ERROR
%pattern%

# IP / status code filtering
{ $.status_code = 5* }
```

**Log Insights — SQL-like query:**

```sql
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by bin(5m)
| sort @timestamp desc
| limit 100
```

**Common Log Insights queries:**

```sql
-- Errors over time, 5-min buckets
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by bin(5m)
| sort @timestamp desc

-- Top 10 slowest API calls
fields @timestamp, @message
| filter @message like /HTTP/
| parse @message /latency=(?<latency>\d+)/
| stats avg(latency), max(latency) by bin(1h)

-- Group by user
fields @timestamp, user_id, action
| filter level = "INFO"
| stats count() by user_id
| sort count desc
| limit 10

-- Find specific request
fields @timestamp, @message
| filter @message like /req_abc123/
| sort @timestamp asc
```

**Log Insights commands:**

| Command | Purpose |
|---|---|
| `fields` | Select fields |
| `filter` | WHERE clause |
| `parse` | Extract via regex |
| `stats` | Aggregate (count, sum, avg, min, max, pct) |
| `sort` | Order |
| `limit` | Top N |
| `display` | Field formatting |
| `bin(N)` | Time bucket (e.g., `bin(5m)`, `bin(1h)`) |

**Auto-detected fields:**

| Field | Detail |
|---|---|
| `@timestamp` | Event time |
| `@message` | Full log message |
| `@logStream` | Stream name |
| `@log` | Log group ARN |
| `@ingestionTime` | When CW received it |
| Plus: any JSON fields are auto-parsed | Top-level + nested |

**Metric filters — turn logs into metrics:**

```
Pattern:    "OutOfMemoryError"
Namespace:  Custom/MyApp
Metric:     OOMCount
Value:      1 (every match increments by 1)

→ Now you can alarm: OOMCount > 0 in 5 min → page
```

| Use case | Detail |
|---|---|
| Error count from logs | No code change needed |
| Slow query detection | Pattern + numeric value extraction |
| Security events | Pattern: failed logins → metric → alarm |
| Custom business metric | E.g., `orders_placed` from log line |

**Subscription filters — stream logs out:**

| Destination | Use case |
|---|---|
| **Lambda** | Real-time processing, alerting |
| **Kinesis Data Streams** | Multi-consumer streaming |
| **Kinesis Firehose** | Deliver to S3, OpenSearch, Splunk |
| **Cross-account** | Centralized logging account |

**Streaming pattern:**

```
CloudWatch Logs Subscription Filter
        ↓
Kinesis Firehose
        ↓ (optional Lambda transform)
        ├── S3 (long-term archive)
        ├── OpenSearch (search + dashboards)
        └── Splunk (SIEM)
```

**Dashboards — custom visualization:**

| Widget | Detail |
|---|---|
| **Metric** | Single metric line / area / number |
| **Logs** | Recent matching log events |
| **Logs Insights** | Query result inline |
| **Alarm** | Status |
| **Text** | Markdown notes |
| **Custom** | Any combination |

**Dashboard JSON example:**

```json
{
  "widgets": [{
    "type": "metric",
    "x": 0, "y": 0, "width": 12, "height": 6,
    "properties": {
      "metrics": [
        ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", "app/prod-alb/..."],
        [".", "HTTPCode_Target_5XX_Count", ".", "."]
      ],
      "period": 60,
      "stat": "Average",
      "region": "us-east-1",
      "title": "API Health"
    }
  }]
}
```

**Cross-region / cross-account dashboards:**

| Property | Detail |
|---|---|
| Auto-resolved across regions | Single dashboard, all data |
| Cross-account via OAM (Observability Access Manager) | Newer feature |
| Permissions per source | Granular |

**CloudWatch Logs vs Datadog / Grafana / Splunk:**

| Feature | **CloudWatch** | **Datadog / Grafana / Splunk** |
|---|---|---|
| AWS integration | Native, zero setup | Needs agent / integration |
| Log Insights | SQL-like, basic | More powerful |
| Search speed | OK for moderate scale | Faster at scale |
| APM / tracing | X-Ray (separate) | Built-in |
| Alerting | SNS-based | Richer (PagerDuty native) |
| Cost | Per metric / alarm / log GB | Subscription |
| Multi-cloud | AWS-only | Multi-cloud |
| Best for | AWS-only stacks | Heterogeneous, advanced needs |

**Log shipping options (alternatives to CloudWatch):**

| Tool | Detail |
|---|---|
| **Vector** | OSS log shipper, modern |
| **Fluentd / Fluent Bit** | OSS, K8s standard |
| **Filebeat / Logstash** | Elastic ecosystem |
| **Datadog Agent** | Datadog ecosystem |
| **OTel Collector** | Vendor-neutral (logs + metrics + traces) |

**Cost optimization:**

| Lever | Detail |
|---|---|
| **Set retention** | Default never expire = $$$ |
| **Drop debug logs in prod** | 50–80% volume reduction |
| **Sample healthchecks** | Don't log every `/healthz` |
| **Tier hot / cold** | Recent in CW, older in S3 |
| **Use EMF (Embedded Metric Format)** | Free metrics from logs |
| **Subscribe to S3** for long-term | Cheaper storage |
| **Compress + structured JSON** | Smaller per-event |

**Common patterns:**

| Pattern | Detail |
|---|---|
| **Lambda → CloudWatch Logs auto** | Just print, ends up in CW |
| **Application logs JSON to stdout** | Container collected by CW Agent |
| **Metric filter for error count** | Alarm without code changes |
| **Subscription filter to S3** | Long-term archive |
| **Subscription to OpenSearch** | Real-time log search at scale |
| **Insights query in dashboard** | Live log analytics |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Default `never expire` retention | Storage cost balloons |
| Ingesting verbose debug logs | Cost + noise |
| Plaintext logs (not JSON) | Hard to parse; metric filters limited |
| Lambda printing huge payloads | Per-MB ingestion cost |
| `fields *` in Insights | Slow query |
| Querying long time range without filter | Expensive |
| No subscription filter for compliance | Can't ship to SIEM |
| Per-instance log groups | Hard to query across fleet |
| Embedded secrets in logs | PII / credentials leaked |
| Re-creating LogGroup every deploy | Loses history |

**Decision matrix:**

| Need | Approach |
|---|---|
| Quick AWS log search | Log Insights |
| Long-term audit | Subscription → S3 |
| Real-time alerting on log patterns | Metric filter + alarm |
| Cross-cloud / advanced search | Datadog / Splunk / OpenSearch |
| Streaming to SIEM | Kinesis Firehose |
| Free metrics from logs | EMF |

**Cross-references:**

- CloudWatch Metrics + Alarms: [cloudwatch_metrics_*.md](cloudwatch_metrics_alarms.md)
- Three pillars (metrics / logs / traces): [three_pillars_*.md](../monitoring_observability/three_pillars_observability_metrics_logs_traces.md)
- Monitoring stack: [monitoring_stack_*.md](../monitoring_observability/monitoring_stack_apm_error_tracking_logging.md)
- AWS Kinesis Firehose: [aws_kinesis_*.md](aws_kinesis_data_streams_firehose_realtime_streaming.md)

**Rule of thumb:** **Always set retention** on new log groups (default never-expire is a cost trap). Use **Log Insights** for ad-hoc queries — good enough for most troubleshooting. Use **metric filters** to turn log patterns into alarms without code changes. **Ship to S3** for long-term cheap storage; **subscribe to OpenSearch / Datadog / Splunk** if you need richer search at scale.
