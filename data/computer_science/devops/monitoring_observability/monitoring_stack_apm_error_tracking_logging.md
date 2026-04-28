### Production Monitoring Stack — APM + Error Tracking + Logging

**Definition:** the **three-legged stool** of production observability — different tools for different signals. **APM** answers "is the app slow?", **error tracking** answers "what's broken?", **logging** answers "what happened?". You need all three; one cannot replace another.

**The three legs:**

| Leg | Question it answers | Best tools | Sample frequency |
|---|---|---|---|
| **APM** | Is it slow? Which endpoint? Which DB call? | Datadog, New Relic, Scout, AppSignal | Every request, sampled by tier |
| **Error tracking** | What's failing? Stack trace? Affected users? | Sentry, Honeybadger, Bugsnag, Rollbar | Every exception |
| **Logging** | What did the app actually say / do? | ELK, OpenSearch, CloudWatch, Loki, Datadog logs | Per-line stdout |

**Five pillars expanded:**

| Pillar | What it gives you | Tooling |
|---|---|---|
| **Metrics** | Numeric time series — req/s, p99, CPU | Prometheus, Datadog metrics |
| **Logs** | Discrete events with context | ELK, Loki, CloudWatch |
| **Traces** | Request paths across services | OTel, Jaeger, Tempo |
| **Errors** | Exceptions with stack traces | Sentry, Honeybadger |
| **Profiling** | Where time is spent at code level | Pyroscope, Scout, Datadog Continuous Profiler |

**APM — what to expect:**

| Feature | Detail |
|---|---|
| Per-endpoint latency | p50, p95, p99 |
| Apdex score | Satisfied / tolerating / frustrated |
| Throughput (RPM) | Requests per minute |
| DB call breakdown | Slow query top list |
| External call breakdown | Slow vendor APIs |
| Background jobs | Sidekiq / DelayedJob throughput |
| Distributed traces | Request across services |
| Deploy markers | Tied to performance changes |
| Real User Monitoring (RUM) | Browser-side perf |

**Error tracking — what to expect:**

| Feature | Detail |
|---|---|
| Exception aggregation | Group by fingerprint |
| Stack trace + context | Source maps for JS |
| Affected users count | Real user impact |
| Release tracking | Spike on deploy |
| Source code links | Click → file:line |
| Breadcrumbs | Last N actions before crash |
| Alerts | Slack / PagerDuty on threshold |
| Issue ownership | CODEOWNERS-aware routing |

**Logging — structured stdout:**

```ruby
# Bad — unstructured
logger.info "User #{user.id} placed order #{order.id}"

# Good — structured (JSON)
logger.info({
  event: "order_placed",
  user_id: user.id,
  order_id: order.id,
  total_cents: order.total_cents,
  request_id: Current.request_id,
})
```

| Property | Why |
|---|---|
| **Structured** | Searchable + aggregatable |
| **JSON** | Native to log shippers |
| **Stdout, not files** | 12-factor; container-friendly |
| **Request ID / trace ID** | Correlate across services |
| **Filtered** | Strip secrets and PII |

**Rails specifics:**

```ruby
# config/application.rb
config.filter_parameters += %i[password password_confirmation token api_key]

# Structured JSON logger
config.log_formatter = JSONLogFormatter.new
config.logger = ActiveSupport::TaggedLogging.new(Logger.new($stdout))

# Lograge for one-line per request
config.lograge.enabled = true
config.lograge.formatter = Lograge::Formatters::Logstash.new
```

| Setting | Purpose |
|---|---|
| `filter_parameters` | Strip secrets from logs |
| `lograge` | Replace verbose Rails request logs with one structured line |
| `tagged_logging` | Attach request_id / user_id to every log line |
| `log_to: STDOUT` | Container-native |

**Reference architecture (Kubernetes):**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Rails pod #1 │     │ Rails pod #2 │     │ Sidekiq pod  │
│  stdout JSON │     │  stdout JSON │     │  stdout JSON │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       └────────────────────┼────────────────────┘
                            ▼
                  ┌──────────────────┐
                  │  Log shipper     │  (Vector / Fluent Bit)
                  └────────┬─────────┘
                           ▼
              ┌────────────┴────────────┐
              ▼                          ▼
       ┌────────────┐           ┌──────────────┐
       │ ELK / Loki │           │ Datadog APM  │
       │ (search)   │           │ (metrics)    │
       └────────────┘           └──────────────┘
                          │
                          ▼
                ┌──────────────────┐
                │  Sentry          │  ← exceptions only
                └──────────────────┘
```

**Tool fits — opinionated picks:**

| Stage | Tool |
|---|---|
| **Tiny startup** | Heroku logs + Sentry free tier |
| **Growing** | Datadog (APM + logs + metrics in one) + Sentry |
| **Cost-conscious mid-size** | Self-host Loki + Grafana + Tempo + Sentry |
| **Enterprise** | OpenTelemetry collector → backend of choice (Datadog, New Relic, Honeycomb, Splunk) |

**Cost shape — log volume is usually #1 expense:**

| Optimization | Effect |
|---|---|
| Drop debug logs in prod | 50–80% volume drop |
| Sample (e.g. log 10% of GET /healthz) | Cut noise |
| Index only relevant fields | Some shippers charge per indexed key |
| Tier hot/cold storage | 7d hot, 90d cold |
| Drop boilerplate (asset 200s) | Less to grep |

**OpenTelemetry — the unification layer:**

| Property | Detail |
|---|---|
| Language SDKs for traces, metrics, logs | One API per language |
| Vendor-agnostic | Send to any backend |
| Auto-instrumentation | Rails, Express, Spring, etc. |
| OTLP protocol | gRPC / HTTP |
| Common backends | Tempo, Jaeger, Datadog, Honeycomb, NewRelic |

**SLOs / SLIs — the upstream of monitoring:**

| Term | Detail |
|---|---|
| **SLI** (indicator) | Measured signal — e.g. request success rate |
| **SLO** (objective) | Target — "99.9% of requests succeed in 30 days" |
| **SLA** (agreement) | Contract with consequences |
| **Error budget** | (1 - SLO) — spend it on shipping |
| **Burn rate** | How fast you're consuming the error budget |

**Alerting hygiene:**

| Rule | Detail |
|---|---|
| **Alert on symptoms, not causes** | "Latency p99 > 2s" beats "CPU > 80%" |
| **Page only when human action required** | Otherwise file a ticket |
| **Multi-window burn rate** | Fast burn (1h) + slow burn (6h) — Google SRE pattern |
| **Runbook link in every alert** | First responder needs context |
| **Actionable, not noisy** | Tune until pages = real issues |
| **Suppress during deploys** | Or use deploy markers |

**Anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| Logs as the only signal | No metrics → no aggregates / dashboards |
| One mega-tool that does everything poorly | "Best of breed" usually wins |
| Alerts on every error | Numbness; real errors missed |
| Logging passwords / tokens / SSNs | Compliance violation |
| Logging without request ID | Can't trace one request across services |
| Page on CPU | High CPU is usually fine |
| Ignoring p99 | Average masks real-user pain |
| Sending Sentry events for expected errors | Validation failures aren't errors |

**Common pitfalls:**

| Pitfall | Detail |
|---|---|
| Skipping `filter_parameters` | Tokens leaked to APM and logs |
| Forgetting Sidekiq integration | Job errors don't reach Sentry |
| Trace ID not propagated | Cross-service traces broken |
| Sampling at the SDK without server understanding | Inconsistent traces |
| Not setting `release` in Sentry | Can't tie spike to deploy |
| Logging huge payloads | Costs explode |
| Mixing logs and metrics in dashboards | Slow queries, wrong granularity |
| No staging for monitoring config | Discover misconfig in prod |

**Decision matrix:**

| Need | Tool |
|---|---|
| Endpoint latency, slow queries | APM |
| Stack traces with user context | Error tracking |
| "What did this service log at 14:02?" | Log search |
| "How did this request flow across services?" | Distributed tracing |
| "Why is p99 spiking?" | APM + RUM + traces |
| Custom business metric | Metrics (Prometheus / Datadog metrics) |
| Continuous profiling | Pyroscope / Datadog Continuous Profiler |

**Cross-references:**

- Prometheus + Grafana + OTel: [prometheus_grafana_*.md](prometheus_grafana_otel_observability_stack.md)
- API observability (logs / metrics / tracing): [api_observability_*.md](../../api_design/observability_logging_metrics_tracing.md)
- SLO / error budget basics: [slo_*.md](slo_sli_error_budget_burn_rate.md)

**Rule of thumb:** **APM for performance, error tracker for exceptions, structured stdout logs for narrative.** They're complementary, not interchangeable. Send **JSON logs to stdout**, attach a **request / trace ID** to every line, **filter secrets**, alert on **symptoms (latency / error rate)** not causes (CPU). Wire up **OpenTelemetry** so you can swap backends later. Logs are usually the largest line-item — sample, drop debug, tier storage.
