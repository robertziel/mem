### Microservices Observability & Distributed Tracing (OpenTelemetry)

**Why microservices need this more than monoliths:**

| Problem | Effect |
|---|---|
| One request hits 5–20 services | Local logs alone can't tell you where it slowed down or failed |
| Failures cascade across boundaries | Root cause may be 4 hops away from the symptom |
| Bottlenecks are in calls, not code | Per-service profiling misses the cross-service waits |

**Three pillars — when to use which:**

| Pillar | Answers | Cardinality | Cost | Storage typical |
|---|---|---|---|---|
| **Logs** | "What happened in this one process?" | High (every event) | High at scale | Loki, ELK, CloudWatch — short retention for verbose, long for structured |
| **Metrics** | "What is happening *aggregate* over time?" | Low (pre-aggregated) | Cheap | Prometheus, Mimir, Datadog — long retention |
| **Traces** | "Where in the call graph did this request go and how long did each hop take?" | Sampled (1–10% typical) | Medium | Jaeger, Tempo, X-Ray, Datadog APM |

> **Rule:** alert from metrics, debug with traces, post-mortem with logs.

**OpenTelemetry (OTel) — the standard you should pick:**

| OTel piece | What it is |
|---|---|
| **API** | Vendor-neutral instrumentation (`tracer.start_span`, `meter.create_counter`, `logger`) |
| **SDK** | Implementation: samplers, batchers, processors |
| **Instrumentation libraries** | Auto-instrument HTTP, DB, Redis, gRPC, queues — drop-in |
| **Collector** | Vendor-neutral pipeline: receive (OTLP/Jaeger/Zipkin) → process (sample, redact, enrich) → export (any backend) |
| **OTLP** | The wire protocol — gRPC or HTTP |
| **Semantic conventions** | Standard attribute names: `http.method`, `db.statement`, `service.name`, ... |

> Adopt OTel even if you're locked into one APM vendor today — it lets you swap backends without re-instrumenting.

**Trace anatomy:**

| Concept | Meaning |
|---|---|
| **Trace** | The whole request, identified by a `trace_id` (16 bytes) |
| **Span** | One unit of work (one HTTP call, one DB query); has a `span_id` (8 bytes), parent reference, start/end, attributes, events |
| **Span kind** | `SERVER`, `CLIENT`, `PRODUCER`, `CONSUMER`, `INTERNAL` |
| **Context** | The `(trace_id, span_id, flags)` tuple that propagates between services |
| **Baggage** | Arbitrary key/values that propagate alongside context (e.g., `tenant=acme`) |
| **Sampling decision** | Made at trace start, propagated downstream so all spans agree |

**W3C Trace Context — the standard propagation header:**

```
traceparent: 00-<trace-id>-<parent-span-id>-<flags>
              ^version    ^16 bytes hex   ^8 bytes hex   ^01 = sampled
tracestate:  <vendor-specific key=value pairs>
```

Auto-injected/extracted by OTel HTTP / gRPC / messaging instrumentations.

**Sampling strategies:**

| Strategy | When to use |
|---|---|
| **Head-based, fixed rate** (e.g. 1%) | Default; cheapest |
| **Head-based, per-route** | Sample errors / slow routes higher |
| **Tail-based** (collector decides after seeing the whole trace) | Always keep error traces; high cost — runs in collector |
| **Rate-limited per service** | Bound costs at the source |

**Metrics — three measurement frameworks:**

| Framework | Signals | Best for |
|---|---|---|
| **RED** | **R**ate, **E**rrors, **D**uration (per service / endpoint) | Request-driven services |
| **USE** | **U**tilization, **S**aturation, **E**rrors (per resource: CPU, disk, queue) | Infrastructure |
| **Four Golden Signals** (SRE book) | Latency, Traffic, Errors, Saturation | Combined view |

**Latency reporting — always percentiles, never averages:**

| Stat | What it tells you |
|---|---|
| p50 | Typical experience |
| p95 | The "annoyed-user" boundary |
| p99 | Long tail — often the SLO target |
| p99.9 | Catastrophic outliers; per-shard / per-tenant problems |
| Mean | Misleading — masks outliers |

**Log correlation contract:**

| Field | Why |
|---|---|
| `service.name` | Filter by service |
| `trace_id` + `span_id` | One-click jump from log to trace |
| `severity` | Filter alerts |
| `user.id` / `tenant.id` | Slice by entity for support |
| Timestamp in **UTC ISO-8601** | Cross-region sorting |

Structured logs (JSON or logfmt) — never plain strings — are required for any of this to work.

**Health endpoints (Kubernetes-style):**

| Endpoint | Purpose | Failure action |
|---|---|---|
| `/livez` | Process alive? | K8s restarts pod |
| `/readyz` | Can serve traffic? Checks DB / cache / dependencies | K8s removes from load balancer |
| `/startupz` | Initial boot done? | K8s waits before liveness/readiness apply |
| `/metrics` | Prometheus scrape | — |

**Alerting strategy:**

| Anti-pattern | Better |
|---|---|
| Alert per service | Alert on user-facing symptoms (error rate, latency, success rate of business flows) |
| Alert on every CPU spike | Alert on SLO-burn rate (you're spending error budget faster than the window) |
| Static thresholds | Adaptive (multi-window multi-burn-rate) |
| Page on warnings | Page only on what requires immediate human action; everything else → ticket |

**Tool quick map:**

| Concern | Open-source | Commercial |
|---|---|---|
| Tracing backend | Jaeger, Grafana Tempo, Zipkin | Datadog APM, Honeycomb, New Relic, Lightstep |
| Metrics backend | Prometheus + Grafana, Mimir | Datadog, Chronosphere, Wavefront |
| Logs backend | Loki, ELK / OpenSearch | Datadog, Splunk, Sumo Logic |
| Service graph | Kiali (Istio), Grafana service map | Datadog Service Map, Honeycomb |
| AWS-native | — | X-Ray (traces), CloudWatch (logs/metrics) |
| All-in-one OTel | OTel Collector + Grafana stack | Datadog, Honeycomb, New Relic |

**Pitfalls:**

| Pitfall | Effect |
|---|---|
| 100% sampling | Trace store explodes, cost blows up |
| No tail-based sampling | Errors get sampled away |
| Logs without `trace_id` | No cross-correlation; logs become useless |
| Cardinality explosion in metrics (per-user labels) | Prometheus / TSDB blows up |
| One alert per service | Alert fatigue; real signals get lost |
| Drift between code and OTel attribute names | Use OTel semantic conventions; don't invent |

**Rule of thumb:** **OpenTelemetry for instrumentation, OTel Collector for the pipeline, swap backends as needed.** **Trace ID on every log line — non-negotiable.** RED on every service. **Alert on user-facing symptoms (error rate, SLO burn), debug with traces, post-mortem with logs.** In a microservices system, observability isn't a layer you add — it's the only way to understand what's actually happening.
