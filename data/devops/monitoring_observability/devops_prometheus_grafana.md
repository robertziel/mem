### Prometheus and Grafana

**Prometheus:**
- Open-source metrics collection and alerting
- Pull-based: scrapes HTTP endpoints (e.g., `/metrics`)
- Time-series database with powerful query language (PromQL)
- Service discovery for dynamic targets (K8s, Consul, EC2)

**Architecture:**
```
App /metrics -> Prometheus (scrapes) -> stores TSDB
                                    -> evaluates alert rules -> Alertmanager -> Slack/PagerDuty
                                    -> Grafana queries for dashboards
```

**Metric types:**
- **Counter** - only increases (total requests, errors). Use `rate()` to get per-second.
- **Gauge** - goes up and down (temperature, queue size, active connections)
- **Histogram** - distribution of values in buckets (request duration). Use for percentiles.
- **Summary** - like histogram but calculates quantiles client-side (less flexible)

**PromQL essentials:**
```promql
# Request rate per second (last 5 min)
rate(http_requests_total[5m])

# Error rate percentage
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100

# 95th percentile request duration
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Top 5 pods by CPU
topk(5, rate(container_cpu_usage_seconds_total[5m]))

# Alert: high error rate
rate(http_requests_total{status="500"}[5m]) > 0.1
```

**Grafana:**
- Visualization and dashboarding platform
- Data sources: Prometheus, Loki, CloudWatch, Elasticsearch, etc.
- Features: panels, variables, alerting, annotations
- Community dashboards: import pre-built dashboards by ID

**Key Grafana dashboard panels:**
- Request rate (rate of counters)
- Error rate (percentage)
- Latency percentiles (p50, p95, p99)
- Saturation (CPU, memory, disk, queue depth)
- Business metrics (signups, orders)

**Alertmanager:**
- Routes alerts to receivers (Slack, PagerDuty, email)
- Grouping: batch related alerts together
- Silencing: suppress alerts during maintenance
- Inhibition: suppress alerts if a higher-level alert is firing

**Rule of thumb:** Instrument your app with counters (requests, errors) and histograms (latency). Use `rate()` on counters, `histogram_quantile()` for percentiles. Dashboard the RED method (Rate, Errors, Duration) for every service.
