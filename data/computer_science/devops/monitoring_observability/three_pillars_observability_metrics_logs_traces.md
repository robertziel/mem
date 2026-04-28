### Three Pillars of Observability — Metrics, Logs, Traces

**Definition:** **observability** is the ability to understand a system's internal state from its external outputs. The classic **three pillars** — **metrics**, **logs**, **traces** — are complementary signal types. Each answers a different question; you need all three.

**The three pillars:**

| Pillar | Question | Example | Tools |
|---|---|---|---|
| **Metrics** | "Is something wrong?" | request rate, error rate, p99 latency | Prometheus, CloudWatch, Datadog |
| **Logs** | "What happened?" | "PaymentFailed: card_declined" | ELK, Loki, CloudWatch Logs |
| **Traces** | "Where is the bottleneck?" | Span tree across 5 services | Jaeger, Zipkin, X-Ray, Datadog APM |

**Metrics — numeric time series:**

| Property | Detail |
|---|---|
| **Aggregatable** | Sum, avg, p99 across millions |
| **Low cardinality** | Bounded label combinations |
| **Cheap to store** | Time-series databases compress well |
| **Best for alerting + dashboards** | Pre-aggregated by nature |
| **Examples** | RPS, error rate, CPU, queue depth, p99 latency |

**Four metric types:**

| Type | Example | Operation |
|---|---|---|
| **Counter** | `requests_total` | Monotonic increase |
| **Gauge** | `cpu_usage_percent` | Up or down |
| **Histogram** | `request_duration_seconds` | Buckets for percentiles |
| **Summary** | Pre-computed quantiles | Less mergeable than histogram |

**Logs — discrete events with context:**

| Property | Detail |
|---|---|
| **High cardinality** | Trace IDs, request IDs, user IDs |
| **Expensive at scale** | Volume drives cost |
| **Best for debugging + auditing** | Specific events |
| **Should be structured (JSON)** | Searchable / filterable |
| **Examples** | Request log lines, error stack traces, security events |

**Structured log shape:**

```json
{
  "timestamp": "2026-04-27T10:30:00Z",
  "level": "error",
  "message": "payment failed",
  "service": "checkout",
  "env": "production",
  "trace_id": "abc123def456",
  "span_id": "span_789",
  "user_id": "u_456",
  "request_id": "req_xyz",
  "error": "card_declined",
  "card_brand": "visa",
  "amount_cents": 4999
}
```

| Field | Purpose |
|---|---|
| `timestamp` | When |
| `level` | Severity (debug / info / warn / error) |
| `message` | Human-readable |
| `service`, `env` | Where |
| `trace_id` / `span_id` | Correlate with traces |
| `user_id` / `request_id` | Per-user tracing |
| Domain fields | Filterable in queries |

**Traces — request paths across services:**

| Concept | Detail |
|---|---|
| **Trace** | Whole request journey, end-to-end |
| **Span** | One operation in the trace (DB call, HTTP call, function) |
| **Parent / child spans** | Build a tree |
| **Trace ID** | Same across all spans of a request |
| **Span ID** | Per-span unique |
| **Baggage** | Cross-span context (user ID, tenant) |

**Trace visualization:**

```
GET /checkout (200ms total)              [============]
├─ Auth.verify (15ms)                    [=]
├─ Cart.load (50ms)                       [===]
│  └─ DB.query (45ms)                      [===]
├─ Pricing.calculate (80ms)                  [====]
│  ├─ Discount.apply (10ms)                  [.]
│  └─ Tax.compute (60ms)                      [===]
└─ Payment.charge (45ms)                          [==]
   └─ Stripe.api (40ms)                            [==]
```

| Use | Detail |
|---|---|
| Find latency bottleneck | Long span = where time goes |
| Cross-service debugging | Trace propagates between services |
| N+1 detection | Many similar small spans |
| Error attribution | Failed span at the bottom |

**How they connect — the workflow:**

```
1. Alert fires (METRIC: error_rate > 5%)
   ↓
2. Open dashboard (METRIC: which endpoint? which region?)
   ↓
3. Filter logs by endpoint + time (LOGS: what's the error?)
   ↓
4. Click a log → jumps to its trace via trace_id (TRACE: where in the call tree?)
```

| Stage | Pillar |
|---|---|
| Detect | Metrics |
| Localize | Metrics + logs |
| Investigate | Logs + traces |
| Fix | Code change → new deploy |
| Verify | Metrics |

**OpenTelemetry (OTel) — the unification:**

| Property | Detail |
|---|---|
| **Vendor-neutral** standard | One SDK, any backend |
| Covers all three pillars | Metrics, logs, traces |
| OTLP protocol | gRPC / HTTP transport |
| OTel Collector | Receive, transform, export to any backend |
| SDKs for most languages | Java, Go, Python, Ruby, Node, .NET |
| Auto-instrumentation | Common frameworks done for you |

**Cost model — logs usually dominate:**

| Pillar | Typical cost shape | Optimization |
|---|---|---|
| Metrics | Cheap; bounded by cardinality | Trim high-cardinality labels |
| Logs | Often #1 expense | Drop debug, sample, tier hot/cold |
| Traces | Sample (1–10% common) | Tail-sampling on errors |
| RUM (frontend) | Per-user-session | Sample by SLA tier |

**Sampling strategies (traces):**

| Strategy | Detail |
|---|---|
| **Head sampling** | Decide at trace start; cheap |
| **Tail sampling** | Buffer all spans, decide at end based on outcome | Keep all errors / slow |
| **Adaptive** | Higher sample rate for rare endpoints | Best of both |
| **100% (no sample)** | Only for low-traffic services or test envs | Expensive |

**Cardinality — the metrics killer:**

| High cardinality | Why bad |
|---|---|
| `user_id` as a label | Millions of unique series |
| `request_id` as a label | Per-request series |
| Free-text `error_message` | Unbounded |
| Per-row business IDs | Series explosion |

| Low cardinality (good) | Why |
|---|---|
| `endpoint`, `method`, `status_code` | Bounded set |
| `region`, `service`, `env` | Small enums |
| `error_class` (no message) | Bounded categories |

> **Logs and traces handle high cardinality. Metrics don't.**

**SLOs and error budgets — building on metrics:**

| Term | Detail |
|---|---|
| **SLI** (Service Level Indicator) | A measured signal: success rate, latency p99 |
| **SLO** (Objective) | Target: "99.9% in 30 days" |
| **SLA** (Agreement) | Contract with consequences |
| **Error budget** | (1 - SLO) × period |
| **Burn rate** | How fast you're spending the budget |

**Alerting hygiene:**

| Rule | Detail |
|---|---|
| Alert on **symptoms** (latency, error rate) not causes (CPU) | User-facing |
| Multi-window burn rate | Fast burn (1h) + slow burn (6h) — Google SRE |
| Runbook link in every alert | Context for first responder |
| Page only when human action required | Otherwise file a ticket |
| Auto-resolve when condition clears | Don't keep stale alerts |

**Anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| Logs as the only signal | No aggregates, no SLOs |
| Metrics with `user_id` as label | Cardinality blowup |
| Unstructured plaintext logs | Hard to search at scale |
| No trace ID in logs | Can't correlate |
| 100% trace sampling | Cost explosion |
| Alerting on every error | Noise; real ones missed |
| Building bespoke instrumentation per service | Use OTel |
| One vendor for everything | Lock-in; OTel layer abstracts |

**Decision matrix:**

| Need | Pillar |
|---|---|
| "Is the system healthy right now?" | Metrics + dashboard |
| "Why did request X fail?" | Logs + trace by request_id |
| "Why is p99 spiking?" | Metrics + traces |
| Audit who did what | Logs |
| Distributed bottleneck | Traces |
| Custom business metric | Metrics (counter / gauge) |
| User-impacting issue | RUM + traces |

**Cross-references:**

- Monitoring stack (APM + error tracking + logging): [monitoring_stack_*.md](monitoring_stack_apm_error_tracking_logging.md)
- Prometheus + Grafana + OTel: [prometheus_grafana_*.md](prometheus_grafana_otel_observability_stack.md)
- API observability (logs/metrics/tracing on endpoints): [api_observability_*.md](../../api_design/observability_logging_metrics_tracing.md)

**Rule of thumb:** **Metrics tell you something is wrong, logs tell you what, traces tell you where.** They're complementary — use all three. Adopt **OpenTelemetry** for vendor-neutral instrumentation, write **structured (JSON) logs** with **`trace_id`** for correlation, keep metric labels **low cardinality** (move user_id and request_id to logs/traces). Alert on **symptoms** (latency / error rate), not causes (CPU). Logs are usually the **biggest line-item** — sample, drop debug, tier storage.
