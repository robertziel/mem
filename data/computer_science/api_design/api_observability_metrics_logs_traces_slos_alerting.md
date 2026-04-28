### API Observability — Metrics, Logs, Traces, SLOs, Alerting

**Cross-ref:** for tracing internals see [microservices/observability_distributed_tracing_*.md](../microservices/observability_distributed_tracing_opentelemetry.md) and [devops/monitoring_observability/distributed_tracing.md](../devops/monitoring_observability/distributed_tracing.md). For Prometheus / Grafana details see [prometheus_grafana.md](../devops/monitoring_observability/prometheus_grafana.md). This file focuses on **what to instrument at the API boundary**.

**Three pillars — what each answers:**

| Pillar | Answers | Storage cost | Cardinality |
|---|---|---|---|
| **Metrics** | "How is the API behaving in aggregate over time?" | Cheap | Pre-aggregated; bounded |
| **Logs** | "What happened in this one request?" | High at scale | Unbounded |
| **Traces** | "Where did this request spend its time?" | Sampled | Per-span |
| **(+ Profiles)** | "Where is the CPU going inside that span?" | Sampled | Per-stack-frame |

> **Alert from metrics, debug with traces, post-mortem with logs.**

**RED — request-driven services (most APIs):**

| Metric | What it measures |
|---|---|
| **R**ate | Requests per second per route |
| **E**rrors | Error rate (4xx user errors, 5xx system errors, separately) |
| **D**uration | Latency percentiles (p50 / p95 / p99) |

**USE — for resources behind the API:**

| Metric | What it measures |
|---|---|
| **U**tilization | % busy (CPU, DB connection, thread pool) |
| **S**aturation | Queue / waitlist length |
| **E**rrors | Per-resource error counters |

**Four Golden Signals (SRE book):**

| Signal | Why |
|---|---|
| Latency | What users feel |
| Traffic | Workload size |
| Errors | What's broken |
| Saturation | How close to capacity |

> RED + saturation ≈ Four Golden Signals. Both work.

**Per-route metrics — what to emit:**

| Metric | Type | Labels |
|---|---|---|
| `http_requests_total` | counter | `route`, `method`, `status_class`, `status` |
| `http_request_duration_seconds` | histogram | `route`, `method`, `status_class` |
| `http_request_in_flight` | gauge | `route` |
| `http_request_size_bytes` / `response_size_bytes` | histogram | `route` |
| `http_4xx_total` / `http_5xx_total` | counter | `route`, `error_code` |
| `http_429_total` (rate-limited) | counter | `route`, `consumer_id` |
| `external_dependency_duration_seconds` | histogram | `dependency`, `route` |
| `db_query_duration_seconds` | histogram | `operation`, `route` |
| `cache_hit_total` / `cache_miss_total` | counter | `cache_name`, `route` |
| `auth_failure_total` | counter | `reason` |
| `idempotency_hit_total` | counter | `route` |

**Cardinality — the silent killer:**

| Anti-pattern | Effect | Fix |
|---|---|---|
| Raw URL with IDs (`/users/42`) as label | Cardinality explodes per user | Templated route (`/users/:id`) |
| User-id as a metric label | Per-user series | Put in trace attributes / logs, not metrics |
| Customer-supplied strings (search query, header values) | Adversarial cardinality | Strip / hash / drop |
| Per-instance `pod_name` as label | Churns on every pod restart | Aggregate; use ID for traces |
| Full URL including query string | Each query string = new series | Use `http.route` |

> Aim for **< 10⁶ active series total**. Pre-compute high-cardinality data into traces / logs, not metrics.

**Status-code grouping:**

| Class | Counter | Why |
|---|---|---|
| `2xx` | Success | Baseline |
| `3xx` | Redirect | Usually fine |
| `4xx` | User error | **Don't alert** unless ratio spikes — clients can be wrong |
| `5xx` | Server error | **Always alert** on rate above SLO |
| `429` | Rate limit | Track per consumer; surface to caller |
| `499` (nginx, client closed) | Timeout / cancellation | High count = slow API or panicked clients |

**Latency — always percentiles, never average:**

| Stat | What it tells you |
|---|---|
| Mean / average | **Misleading** — masks outliers |
| p50 | Typical user experience |
| p95 | "Annoyed user" boundary |
| p99 | Long tail; often the SLO target |
| p99.9 | Catastrophic outliers; per-tenant problems |
| Max | Always exists; least useful as a signal |

**Histogram bucket selection (per route):**

```
buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]   # seconds
```

| Rule | Why |
|---|---|
| Cover the actual latency range | Otherwise percentiles wrong |
| 10–15 buckets typical | Resolution vs cardinality |
| Different buckets per route class | API endpoint vs background job |
| **Native histograms** (Prometheus 2.40+) | Sparse, auto-bucket; preferred where supported |

**Structured log fields — every API request must include:**

| Field | Source |
|---|---|
| `timestamp` (ISO 8601 UTC) | Log lib |
| `level` | `info` / `warn` / `error` |
| `service.name` | Static config |
| `service.version` / `commit_sha` | Build metadata |
| `request_id` / `trace_id` | Per-request ID |
| `span_id` | Correlate to trace |
| `route` | Templated, e.g. `POST /v1/orders` |
| `method`, `status` | HTTP basics |
| `duration_ms` | Server-side time |
| `consumer_id` / `tenant_id` / `user_id` | Multi-tenancy |
| `client_ip` (anonymized in regulated contexts) | Source diagnosis |
| `user_agent` (truncated) | Bot/SDK identification |
| `error_code`, `error_message` | When 4xx/5xx |
| `db_query_count`, `db_duration_ms` | Slow-query attribution |
| `external_api_calls_count`, `external_duration_ms` | Cascade attribution |
| `cache_hit_count` | Hit-rate signal |

**Structured log JSON example:**

```json
{
  "timestamp": "2024-04-15T10:00:00.123Z",
  "level": "info",
  "service.name": "orders-api",
  "service.version": "1.2.3",
  "request_id": "req_01HV2…",
  "trace_id": "5b8aa5a2c2d6…",
  "span_id": "8aa5a2c2",
  "route": "POST /v1/orders",
  "method": "POST",
  "status": 201,
  "duration_ms": 84,
  "consumer_id": "app_42",
  "tenant_id": "t_7",
  "db_query_count": 3,
  "db_duration_ms": 23,
  "external_api_duration_ms": 0,
  "cache_hits": 2
}
```

**Trace attributes — what to attach to API spans:**

| Attribute | OTel semantic convention | Example |
|---|---|---|
| HTTP method | `http.request.method` | `POST` |
| Route template | `http.route` | `/v1/orders/:id` |
| Status code | `http.response.status_code` | `201` |
| URL components | `url.path`, `url.scheme`, `url.full` (careful — query string) | |
| Server | `server.address`, `server.port` | |
| Client | `client.address` | |
| User agent | `user_agent.original` | |
| Request body size | `http.request.body.size` | |
| Response body size | `http.response.body.size` | |
| Error | `error.type`, `error.message` | Span status `error` |
| Tenant | `tenant.id` | (high-cardinality — fine on traces, not metrics) |
| Consumer | `consumer.id` | |

**SLOs (Service Level Objectives) — define them per route class:**

| Component | Detail |
|---|---|
| **SLI** (indicator) | Measurable signal: success rate, latency |
| **SLO** (objective) | Target: "99.9% of requests succeed", "95% under 300 ms" |
| **SLA** (agreement) | External commitment with consequences |
| **Error budget** | `1 − SLO` — how much you're allowed to fail |
| Window | Rolling 30 days typical |

**Sample API SLOs:**

| Route class | Availability | Latency |
|---|---|---|
| Read endpoints | 99.95% | p95 < 200 ms |
| Write endpoints | 99.9% | p95 < 500 ms |
| Background async | 99.5% | p95 < 5 s |
| Search / aggregation | 99.5% | p95 < 1 s |
| Analytics / reports | 99.0% | p95 < 30 s |

**Burn-rate alerting (multi-window, multi-burn):**

| Burn rate | Window pair | Page or ticket |
|---|---|---|
| 14.4× | 1 h + 5 m | Page (fast burn) |
| 6× | 6 h + 30 m | Page (medium) |
| 3× | 1 d + 2 h | Ticket (slow) |
| 1× | 3 d + 6 h | Ticket (slowest) |

> Burn-rate prevents both flapping (single-window false positives) and slow-rot (long windows that miss real outages).

**Alert design — symptom vs cause:**

| ✅ Symptom (alert on these) | ❌ Cause (don't page on these) |
|---|---|
| User-facing 5xx ratio > X% | One pod's CPU > 90% |
| p95 latency regression | DB connection pool 80% used |
| Error-budget burn rate | One container restarted |
| Login success rate drop | Memory > 70% on one node |
| Payment failure rate | High GC time on one host |
| Queue depth growing without bound | One disk near full |

> Alert on **what users feel**. Cause-level metrics are **dashboards** for diagnosing once paged.

**Structured log levels — when to emit:**

| Level | Use |
|---|---|
| `debug` | Dev only; not shipped to prod logs at scale |
| `info` | Successful operations, request completion |
| `warn` | Recoverable anomaly (retried, fell back to default) |
| `error` | Operation failed; user-visible impact possible |
| `critical` / `fatal` | Service-wide failure; usually paged |

**Sampling for traces — keep cost sane:**

| Strategy | Detail |
|---|---|
| Head sampling (1–10%) | Default; cheap |
| Per-route head sampling | Higher rate on sensitive paths |
| **Tail sampling** (in OTel Collector) | **Keep all errors + slow traces**; sample rest at 1–5% |
| Per-tenant sampling | High-value tenants always sampled |
| Always-on for specific consumer / debug header | Customer support diagnostics |

**Logs — the "what to never log" rule:**

| Don't log | Why |
|---|---|
| Passwords, tokens, full credit cards, secrets | Catastrophic on log compromise |
| PII without classification | GDPR / CCPA |
| Full request body for sensitive endpoints | Same |
| Full Authorization headers | Token leak |
| Stack traces in user-visible logs | Internal info leak |
| High-cardinality fields you'll regret | Searchable but unindexed log space |

**PII redaction patterns:**

| Field | Tactic |
|---|---|
| Email | Hash or mask domain (`a***@example.com`) |
| Credit card | Last 4 only (`****4242`) |
| Tokens | Length + first/last few chars (`abc***xyz`) |
| Phone | E.164 + masked digits |
| Addresses | City + region only |
| Custom fields | Allow-list approach: log nothing not on the list |

**Sampling logs (when log volume is the bottleneck):**

| Strategy | Detail |
|---|---|
| Sample 2xx responses (1%) | They're 99% of volume |
| Always log 4xx + 5xx | Errors are rare and valuable |
| Always log slow requests (`duration > 1s`) | Find anomalies |
| Always log specific consumers / tenants | High-value customers |
| Stream samples with high-quality fields | Cheaper than full firehose |

**Dashboards — what every API service needs:**

| Dashboard | Panels |
|---|---|
| **Service overview** | RED for top-10 routes; saturation; error budget burn |
| **Per-route detail** | Same metrics, drill-down |
| **Per-consumer / tenant** | Rate limits, errors per tenant |
| **Dependency health** | Per-downstream latency + error |
| **Capacity / saturation** | CPU / mem / pool / queue depth |
| **Deploy health** | Compare metrics before/after a deploy mark |

**Common patterns:**

| Need | Pattern |
|---|---|
| Trace ID in client error responses | Helps support match request to incident |
| `X-Request-Id` echoed in response | Useful even without distributed tracing |
| Rate-limit headers (`X-RateLimit-Remaining`) | Self-service diagnosis |
| Deprecation telemetry per consumer | "Who's still calling /v1?" |
| Per-tenant SLO dashboards | Critical for SaaS |
| Anomaly detection (Honeycomb-style bubble-up) | Quickly finds the slice that broke |

**Anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| Average latency only | Hides p99 outliers |
| Page on cause-level metrics | Alert fatigue |
| No trace ID in logs | Can't correlate |
| Full request body in logs | PII leak; storage explosion |
| Single global error rate alert | Per-route regressions invisible |
| No SLO defined | Reactive, not proactive |
| 100% trace sampling | Storage explodes |
| No tail sampling | Errors silently dropped |
| Synchronous log shipping | Adds tail latency to user requests |
| Metric labels with raw URLs | Cardinality kills Prometheus |

**Tooling map:**

| Concern | Tools |
|---|---|
| Metrics | Prometheus, OTel → Prometheus exporter, Datadog, New Relic, Honeycomb (events too) |
| Logs | Loki, ELK / OpenSearch, Datadog, Splunk, CloudWatch |
| Traces | Tempo, Jaeger, X-Ray, Datadog APM, Honeycomb |
| All-in-one | Grafana stack (Mimir + Loki + Tempo) / Datadog / New Relic |
| SLO | Sloth, Pyrra, Nobl9, OpenSLO |
| Anomaly detection | Honeycomb BubbleUp, Datadog Watchdog |
| Profiling | Pyroscope, Parca, Datadog Continuous Profiler |
| Synthetic monitoring | Pingdom, Datadog Synthetics, blackbox-exporter |

**Quick checklist:**

| Check | Pass? |
|---|---|
| RED metrics per route, low cardinality labels | ✅ |
| `request_id` / `trace_id` in every log line | ✅ |
| OTel-compatible tracing | ✅ |
| Tail sampling keeps errors + slow traces | ✅ |
| SLOs defined per route class | ✅ |
| Burn-rate alerts wired up | ✅ |
| 4xx / 5xx separated; alerting only on 5xx + SLO breaches | ✅ |
| Per-tenant / per-consumer rate-limit telemetry | ✅ |
| PII redaction in log pipeline | ✅ |
| Dependency latency tracked alongside route latency | ✅ |
| Per-deploy comparison capability | ✅ |
| Trace ID echoed in client error responses | ✅ |

**Rule of thumb:** **RED metrics on every route**, **`request_id` + `trace_id` in every log**, **traces with tail sampling**, **SLOs and burn-rate alerts** on user-facing flows. **Alert on symptoms (user-facing latency / errors / SLO burn), debug with traces, post-mortem with logs.** **Cardinality discipline** in metrics (templated route, no IDs) is the difference between an observability stack that scales and one that drowns.
