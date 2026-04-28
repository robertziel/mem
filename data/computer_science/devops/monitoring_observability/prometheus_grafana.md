### Prometheus & Grafana (Metrics, PromQL, Alertmanager)

**The stack:**

```
Apps expose /metrics ─► Prometheus scrapes (pull) ─► TSDB
                                                       │
                                  ┌────────────────────┤
                                  ▼                    ▼
                         Alertmanager (alerts)   Grafana (dashboards)
                                  │
                  Slack / PagerDuty / Email / OpsGenie
```

**Prometheus — what it is:**

| Property | Detail |
|---|---|
| Model | **Pull-based** (Prometheus scrapes targets) |
| Format | OpenMetrics text exposition over HTTP `/metrics` |
| Storage | Local TSDB; durable segments + WAL |
| Long-term storage | **Thanos**, **Cortex**, **Mimir**, VictoriaMetrics |
| Service discovery | K8s, Consul, EC2, GCE, Azure, file-SD, DNS |
| Query language | **PromQL** |
| HA | Run two instances scraping the same targets — independent stores |

**Pull vs push — Prometheus's choice:**

| Pull (Prometheus default) | Push (other systems) |
|---|---|
| Server initiates scrape | Client sends to gateway |
| Easy "is this target up?" | Push gateway buffers if upstream down |
| Service discovery drives target list | Targets must know server address |
| **Pushgateway** for batch jobs | Optional component |

> Prometheus is **pull-only**. Use **Pushgateway** only for short-lived batch jobs that finish before the next scrape.

**Metric types — pick the right one:**

| Type | Behavior | Use for | Don't use for |
|---|---|---|---|
| **Counter** | Monotonically increases (resets on restart) | Total requests, errors, bytes processed | Anything that goes down |
| **Gauge** | Goes up and down | Active connections, queue size, memory in use, temperature | Things you want to rate over time |
| **Histogram** | Bucketed distribution | Request duration, response size — server-side aggregation | When you don't need percentiles |
| **Summary** | Client-side quantile calculation | Same as histogram, but quantiles fixed per instance | When you need to aggregate across instances |

> **Histogram beats Summary** for cross-service percentiles — summary quantiles can't be aggregated; histograms can via `histogram_quantile()`.

**Histogram bucket selection:**

| Concern | Detail |
|---|---|
| Pick buckets covering your real latency distribution | e.g., `[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]` for HTTP |
| Too few buckets → bad percentile resolution | At least 10 |
| Too many → cardinality explosion | Each bucket × each label = a series |
| Use **native histograms** (Prometheus 2.40+) | Sparse, auto-bucketed, much smaller |

**Labels — the cardinality control:**

| Practice | Effect |
|---|---|
| Stable, low-cardinality labels (`method`, `status`, `route`) | Healthy time series count |
| User-id / request-id as labels | **Cardinality explosion** — each unique value = a new series |
| Templated path (`/users/{id}`) not raw URL (`/users/42`) | Bounded |
| Status as label | Yes — small set |
| Customer-supplied strings | **No** |
| Pod name | Eventually-bounded but churns |

> Aim for < 10⁶ active series total. Each unique label combination is a series.

**PromQL essentials:**

| Goal | Query |
|---|---|
| Per-second request rate (5-min window) | `rate(http_requests_total[5m])` |
| Errors per second | `rate(http_requests_total{status=~"5.."}[5m])` |
| Error ratio | `rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])` |
| 95th percentile latency | `histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))` |
| Average latency | `rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])` |
| Top 5 pods by CPU | `topk(5, rate(container_cpu_usage_seconds_total[5m]))` |
| Memory used vs limit | `container_memory_usage_bytes / container_spec_memory_limit_bytes` |
| Saturation (queue length / capacity) | `queue_size / queue_capacity` |
| Counter increase last hour | `increase(http_requests_total[1h])` |
| Time since last successful job | `time() - last_succeeded_timestamp_seconds` |
| Recording rule pre-aggregation | `job:http_requests:rate5m` (renamed for cheaper dashboards) |

**`rate` / `irate` / `increase` — pick by use:**

| Function | Behavior |
|---|---|
| `rate(counter[5m])` | Per-second average over the window — smoothed |
| `irate(counter[5m])` | Per-second over **last two samples** — instant, noisy |
| `increase(counter[1h])` | Total count over window — absolute |
| Use `rate` for dashboards / alerts | Most common |
| Use `irate` for short-window debugging | Spot transients |
| `increase` for "count in last hour" | Reporting |

**Aggregation operators:**

| Operator | Effect |
|---|---|
| `sum by (label) (...)` | Sum across all other labels, group by chosen one |
| `avg by (label) (...)` | Same with average |
| `max / min by ...` | Min / max |
| `count by (label) (...)` | Number of series |
| `topk(n, ...)` / `bottomk(n, ...)` | N highest / lowest |
| `quantile(0.95, ...)` | Percentile across **series**, not within histograms |
| `group(...)` | Drop label values (squash) |
| `histogram_quantile(0.95, ...)` | Percentile from a histogram bucket series |

**Vector matching — when joining metrics:**

| Operator | Use |
|---|---|
| `on(label)` | Match only on these labels |
| `ignoring(label)` | Match on everything except these |
| `group_left` / `group_right` | Many-to-one joins |

```promql
# Error rate weighted by traffic
sum by (service) (rate(http_errors_total[5m]))
  /
sum by (service) (rate(http_requests_total[5m]))
```

**Recording rules — pre-aggregate expensive queries:**

```yaml
groups:
- name: http
  interval: 30s
  rules:
    - record: job:http_requests:rate5m
      expr: sum by (job) (rate(http_requests_total[5m]))
```

| Why | Fast dashboards; cheap alert evaluation |
|---|---|
| Naming convention | `<level>:<metric>:<operations>` |
| Rule level | `instance:` / `job:` / `application:` etc. |

**Alert rules — example:**

```yaml
groups:
- name: api
  rules:
    - alert: HighErrorRate
      expr: |
        sum(rate(http_requests_total{status=~"5.."}[5m]))
          /
        sum(rate(http_requests_total[5m])) > 0.05
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "API 5xx rate above 5%"
```

| Field | Detail |
|---|---|
| `expr` | PromQL — alert fires while truthy |
| `for: 5m` | Must be truthy continuously to fire (avoid flapping) |
| `labels` | Routed by Alertmanager |
| `annotations` | Human-readable; use templating |

**SLO-style burn-rate alerting (multi-window, multi-burn-rate):**

| Burn rate | Window | Alert if true |
|---|---|---|
| 14.4× | 1 h + 5 m | Page (fast burn) |
| 6× | 6 h + 30 m | Page (medium) |
| 3× | 1 d + 2 h | Ticket (slow) |
| 1× | 3 d + 6 h | Ticket (slowest) |

> Pair short + long windows so a real outage pages fast, but transient spikes don't.

**Alertmanager — alert routing:**

| Concept | Detail |
|---|---|
| **Receivers** | Slack, PagerDuty, email, webhook, OpsGenie |
| **Routes** | Tree of label-based matches |
| **Group_by** | Batch related alerts (same service / same alert) |
| **Group_wait** | Initial wait before sending grouped alerts |
| **Repeat_interval** | How often to re-page if still firing |
| **Silences** | Mute by label match for a window |
| **Inhibition** | Suppress alert X if alert Y is firing |
| **Templates** | Customize message format |

**Receiver routing example:**

```yaml
route:
  group_by: [alertname, service]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: slack-default
  routes:
    - match: { severity: critical }
      receiver: pagerduty-prod
    - match: { team: data }
      receiver: slack-data-team
```

**Grafana — dashboard fundamentals:**

| Feature | Detail |
|---|---|
| **Data sources** | Prometheus, Loki, Tempo, CloudWatch, Datadog, MySQL, ES, etc. |
| **Panels** | Time series, stat, gauge, table, heatmap, histogram, logs, traces |
| **Variables** | Templated dropdowns (`$service`, `$cluster`) drive queries |
| **Annotations** | Mark deploys / incidents on charts |
| **Folders + permissions** | Per-team scoping |
| **Provisioning** | Dashboards as YAML / JSON in git |
| **Alerting** (Grafana 8+) | Unified alerts across data sources |
| **Drilldown / Explore** | Free-form metric exploration |
| **Public / shared dashboards** | External sharing |
| **Library panels** | Reusable across dashboards |

**Standard dashboards every service needs:**

| Pattern | Panels |
|---|---|
| **RED** (Request, Error, Duration) | rate, error rate, latency percentiles |
| **USE** (Utilization, Saturation, Errors) | CPU/mem/disk usage, queue depth, error counters |
| **Four Golden Signals** | Latency, Traffic, Errors, Saturation |
| **Service overview** | RED + saturation + dependency health |
| **K8s overview** | Pod counts, restarts, CPU/mem per workload |
| **Capacity** | Resource trends + headroom |

**Variables / templating tricks:**

| Variable | PromQL source |
|---|---|
| `$service` | `label_values(http_requests_total, service)` |
| `$cluster` | `label_values(up{job="api"}, cluster)` |
| `$instance` | `label_values(up{cluster="$cluster"}, instance)` (cascades) |

**Long-term storage options:**

| Option | Detail |
|---|---|
| **Local TSDB** (default) | 15d default retention; fast queries |
| **Thanos** | S3/GCS-backed; sidecar to Prometheus; PromQL across history |
| **Cortex** | Multi-tenant Prometheus-as-a-Service |
| **Mimir** (Grafana Labs) | Cortex successor; horizontally scalable |
| **VictoriaMetrics** | High-perf alternative TSDB; PromQL+ MetricsQL |
| **Managed** (Grafana Cloud, AWS Managed Prometheus, Chronosphere) | Pay-as-you-go |

**Exposition format quick map:**

```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1024
http_requests_total{method="GET",status="500"} 3
```

**Client libraries:**

| Language | Library |
|---|---|
| Go | `prometheus/client_golang` |
| Python | `prometheus_client` |
| Java | `simpleclient` / Micrometer |
| Node | `prom-client` |
| Ruby | `prometheus-client` (and Rails: `yabeda-prometheus`) |
| Rust | `prometheus`, `metrics` |

**Common patterns:**

| Pattern | Detail |
|---|---|
| Per-service `/metrics` endpoint | Scraped by Prometheus |
| **OpenTelemetry → Prometheus** via OTel Collector exporter | Vendor-neutral instrumentation |
| **Service discovery** via K8s ServiceMonitor / PodMonitor (Prometheus Operator) | Auto-discover targets |
| **Federate** | Higher-tier Prometheus pulls aggregates from regional ones |
| **Remote write** to long-term store | All series stream to Thanos/Mimir/VM |
| **Ad-hoc filters** in Grafana | One dashboard for many environments |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| High-cardinality labels (`user_id`, full URL) | TSDB explodes; query slowdown |
| `rate` on a gauge | Wrong by definition (use `delta` / `deriv`) |
| Wrong window in `rate(metric[w])` | Window too short → noisy; too long → laggy |
| Histogram quantile without `sum by (le)` | Wrong percentile |
| Alert without `for:` | Flaps on every transient blip |
| Unused metrics still scraped | Cardinality + storage cost |
| Missing `topk` / `limit` in dashboards | Unbounded panels lock up the browser |
| Pull from too many tiny targets | Prometheus has scrape budget limits |
| Push everything via Pushgateway | Pushgateway is **only** for batch jobs |
| No retention policy / no remote write | Data loss after default 15 days |
| Different histogram bucket boundaries across services | Can't compare percentiles |

**Health checks for the monitoring itself:**

| Concern | Check |
|---|---|
| Is Prometheus up? | `up{job="prometheus"} == 1` |
| Are scrapes succeeding? | `up{job="my-app"} == 1` |
| Series count growth | `prometheus_tsdb_head_series` |
| Sample ingestion rate | `rate(prometheus_tsdb_head_samples_appended_total[5m])` |
| Alert evaluation latency | `prometheus_rule_evaluation_duration_seconds` |
| Storage size | `prometheus_tsdb_storage_blocks_bytes` |

**Decision shortcuts:**

| Need | Pick |
|---|---|
| Self-host metrics + dashboards | Prometheus + Grafana + Alertmanager |
| Multi-region long-term metrics | + Thanos / Mimir |
| Don't want to operate any of it | Grafana Cloud / AWS Managed Prometheus |
| Vendor-neutral instrumentation | OTel → Prometheus exporter |
| Alerting on SLOs | Multi-burn-rate rules |
| Mixed metrics + logs + traces | Grafana stack (Mimir + Loki + Tempo) |

**Rule of thumb:** **Instrument with counters + histograms** (RED + USE + golden signals). **`rate()` for counters, `histogram_quantile()` for percentiles.** **Keep label cardinality bounded** — that's how Prometheus scales. **Multi-burn-rate alerts on SLOs**, **`for:` clauses to avoid flapping**, **recording rules to pre-aggregate hot dashboards**. Pair with **Thanos / Mimir / VictoriaMetrics** when you outgrow a single Prometheus.
