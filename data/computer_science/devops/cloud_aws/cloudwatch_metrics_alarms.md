### CloudWatch — Metrics & Alarms

**Definition:** AWS's native metrics + alarms service. Auto-collects metrics for AWS services; emit custom ones from your app. **Alarm on user-facing symptoms** (latency, error rate), not just resource metrics (CPU). The free tier covers basics; pay for higher resolution and more alarms.

**Service overview:**

| Capability | Detail |
|---|---|
| Metrics | Numeric time series (1-min default; high-res 1-sec) |
| Alarms | Threshold-based actions (notify, scale, terminate) |
| Logs | Centralized log storage + query (separate cheatsheet) |
| Dashboards | Custom + auto |
| Events / EventBridge | Trigger on AWS events |
| Synthetics | Canary monitoring |
| RUM | Real-user monitoring (frontend) |
| Application Insights | App-level discovery |

**Metric basics:**

| Property | Detail |
|---|---|
| **Namespace** | Grouping (`AWS/EC2`, `AWS/RDS`, `Custom/MyApp`) |
| **Metric name** | Identifier (`CPUUtilization`) |
| **Dimensions** | Labels (e.g., `InstanceId=i-abc`) |
| **Resolution** | 1 min (standard) or 1 sec (high-res, costs more) |
| **Statistics** | Min/Max/Avg/Sum/p95/p99 |
| **Retention** | 15 mo (1-min becomes 5-min after 15 days, 1-hour after 63 days) |

**Metric types — per-source:**

| Source | Auto-collected | Notes |
|---|---|---|
| **EC2** | CPU, network, disk I/O, status checks | **No memory / disk usage by default** |
| **RDS** | Connections, CPU, free storage, I/O | |
| **ALB / NLB** | Request count, target response time, 5XX | |
| **Lambda** | Duration, errors, throttles, concurrent | |
| **S3** | Requests, errors, bytes, latency (per-bucket option) | |
| **SQS** | Queue depth, age of oldest, sent/received | |
| **DynamoDB** | Read/write capacity, throttles, latency | |
| **CloudFront** | Requests, bytes, error rate | |

**Key default metrics for alarming:**

| Service | Metric | What it tells you | Typical alarm |
|---|---|---|---|
| EC2 | `CPUUtilization` | CPU load (%) | > 80% sustained |
| EC2 | `StatusCheckFailed` | Instance health | Any failure |
| RDS | `DatabaseConnections` | Active connections | Approaching max |
| RDS | `FreeStorageSpace` | Disk running low | < 10% free |
| ALB | `TargetResponseTime` | Backend latency | p99 > threshold |
| ALB | `HTTPCode_Target_5XX_Count` | Backend errors | Rate > 1% |
| ALB | `UnHealthyHostCount` | Backend health | > 0 |
| Lambda | `Errors` | Invocation failures | Rate > X% |
| Lambda | `Throttles` | Concurrent limit hit | > 0 |
| Lambda | `Duration` | p99 execution time | > timeout × 0.8 |
| SQS | `ApproximateNumberOfMessagesVisible` | Backlog | Trending up |
| SQS | `ApproximateAgeOfOldestMessage` | Stuck queue | > N seconds |
| DynamoDB | `ThrottledRequests` | Capacity hit | > 0 |

**Missing-by-default metrics (need CloudWatch Agent on EC2):**

| Metric | Why missing |
|---|---|
| Memory usage | Hypervisor can't see inside |
| Disk usage (filesystem) | Same |
| Per-process metrics | Same |
| Custom application metrics | App must publish |

**CloudWatch Agent:**

```bash
sudo yum install amazon-cloudwatch-agent

# Configure /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
# Memory, disk, custom logs, app metrics

sudo systemctl start amazon-cloudwatch-agent
```

| Metric collected | Detail |
|---|---|
| Memory utilization | OS-level |
| Disk usage per filesystem | Per mount point |
| Per-process CPU / memory | If configured |
| Custom application metrics | Via collectd / StatsD plugins |
| Log file collection | Tail and ship |

**Custom metrics — emit from your app:**

```python
import boto3
cw = boto3.client('cloudwatch')

cw.put_metric_data(
    Namespace='Custom/MyApp',
    MetricData=[{
        'MetricName': 'OrdersProcessed',
        'Value': 42,
        'Unit': 'Count',
        'Dimensions': [
            {'Name': 'Service', 'Value': 'checkout'},
            {'Name': 'Region', 'Value': 'us-east-1'},
        ],
    }]
)
```

| Best practice | Detail |
|---|---|
| Batch many metrics in one call | Up to 1000 per request |
| Limit dimension cardinality | High cardinality = expensive |
| Use embedded metric format (EMF) | Logs become metrics — no extra API call |
| Pre-aggregate at app | Don't emit per-request |

**Alarms — anatomy:**

```
Alarm: high-api-latency
  Metric:        AWS/ApplicationELB / TargetResponseTime
  Statistic:     Average
  Dimensions:    LoadBalancer=app/prod-alb/...
  Threshold:     > 2 seconds
  Periods:       3 consecutive periods of 5 minutes
  Datapoints:    "3 out of 3"
  Treat missing: notBreaching | breaching | ignore | missing
  Actions:
    OK   → SNS topic "service-up"
    ALARM → SNS topic "service-down" → PagerDuty
```

**Alarm states:**

| State | Detail |
|---|---|
| **OK** | Metric within threshold |
| **ALARM** | Metric crossed threshold |
| **INSUFFICIENT_DATA** | Not enough data points |

**Alarm actions:**

| Action | Detail |
|---|---|
| **SNS topic** | Email / SMS / Slack / PagerDuty |
| **EC2 action** | Stop / terminate / reboot / recover |
| **Auto Scaling** | Scale out / in |
| **Systems Manager** | Run automation document |
| **Lambda** | Custom handler |

**Composite alarms — combine logic:**

```
Alarm: production-down
  Logic: high-error-rate AND high-latency
  → Alert only when BOTH fire
```

| Use case | Detail |
|---|---|
| Reduce noise | Don't page on minor issues |
| Cross-service correlation | Multi-signal alerts |
| `AND`, `OR`, `NOT` | Boolean logic |

**Alerting hygiene — symptoms over causes:**

| Bad alarm | Good alarm |
|---|---|
| CPU > 80% | API p99 latency > 2s |
| Memory > 90% | Error rate > 1% |
| Disk I/O high | Slow customer-facing endpoint |
| Replica lag | User reports of stale data |

> **Alert on what users feel**, not on infrastructure. Operators care about CPU; **users care about latency and errors**.

**Multi-window burn rate (Google SRE pattern):**

| Window | Detail |
|---|---|
| Fast burn (1h) | "Burning error budget too fast right now" → page |
| Slow burn (6h) | "Sustained issue over hours" → page |
| Combined alarms | Reduce false positives |

**Anomaly detection:**

| Property | Detail |
|---|---|
| ML-based baseline | Learns normal patterns |
| Set anomaly threshold | "Alert when outside expected band" |
| Alarm on anomaly | Less manual tuning |
| Use case | Metrics with seasonality |
| Cost | Per metric |

**Pricing (rough):**

| Item | Cost |
|---|---|
| Standard metrics | Free for AWS service metrics |
| Custom metrics | $0.30 per metric per month |
| Alarms | $0.10 per alarm per month |
| High-resolution | More expensive |
| API requests | $0.01 per 1,000 |
| Logs | $/GB ingested + $/GB stored |

**Common patterns:**

| Pattern | Detail |
|---|---|
| **API health alarm** | 5XX rate + latency p99 |
| **Queue lag alarm** | Oldest message age + visible count |
| **Database health** | Connection count + free storage + replica lag |
| **Cost alarm** | Bill alarm threshold via Billing namespace |
| **DDoS detection** | Request count anomaly at edge |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Alarming on Min/Max instead of Avg / p99 | Noisy or insensitive |
| `Treat missing data: missing` | Alarm goes to INSUFFICIENT_DATA forever |
| Per-instance alarms in ASG | Recreated as instances cycle |
| Alarm on raw count instead of rate | False alarms during low traffic |
| No `Datapoints to alarm` | Spike-in-ratio noise |
| Forgot to set `OK` action | Ticket never auto-closes |
| Alarm at every CPU > 80% | Page fatigue |
| High-resolution metrics for non-critical | Bill explodes |
| Custom metrics with high-cardinality dimensions | Cost runaway |
| No runbook link in alert body | Wakes on-call without context |

**Decision matrix:**

| Need | Approach |
|---|---|
| AWS-native, simple | CloudWatch + SNS |
| Custom metrics from app | EMF in logs OR `PutMetricData` |
| Memory / disk on EC2 | CloudWatch Agent |
| Cross-cloud / advanced APM | Datadog / New Relic / Grafana Cloud |
| Distributed tracing | X-Ray (separate) or OTel |
| Synthetic monitoring | CloudWatch Synthetics |

**Cross-references:**

- CloudWatch Logs / Insights / Dashboards: [cloudwatch_logs_*.md](cloudwatch_logs_insights_dashboards.md)
- Three pillars (metrics / logs / traces): [three_pillars_*.md](../monitoring_observability/three_pillars_observability_metrics_logs_traces.md)
- Monitoring stack (APM + error tracking + logs): [monitoring_stack_*.md](../monitoring_observability/monitoring_stack_apm_error_tracking_logging.md)
- Incident response: [incident_response_*.md](../reliability_incident_management/incident_response.md)

**Rule of thumb:** **CloudWatch for AWS-native monitoring** — free tier covers basics. **Install the CloudWatch Agent on EC2** for memory + disk metrics. **Alarm on user-facing symptoms** (5XX rate, latency p99) not on causes (CPU). Use **composite alarms** to reduce noise. Use **high-resolution metrics** sparingly — cost adds up. Always include a **runbook link** in alert payloads.
