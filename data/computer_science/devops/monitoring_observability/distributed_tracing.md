### Distributed Tracing (DevOps Operational View)

**Cross-ref:** for application-side instrumentation depth see [microservices/observability_distributed_tracing_opentelemetry.md](../../microservices/observability_distributed_tracing_opentelemetry.md). This file is the **operations** angle — backends, sampling, costs, ops.

**The question tracing answers:** "Where in the call graph did this request spend its time, and where did it fail?"

**Anatomy:**

| Concept | Detail |
|---|---|
| **Trace** | One full request — identified by `trace_id` (16 bytes hex) |
| **Span** | One unit of work — identified by `span_id` (8 bytes), with `parent_span_id` |
| **Span kind** | `SERVER` / `CLIENT` / `PRODUCER` / `CONSUMER` / `INTERNAL` |
| **Span attributes** | Key-value tags — service, method, db.statement, http.url |
| **Span events** | Time-stamped events within a span (e.g., GC pause) |
| **Span status** | `OK` / `ERROR` |
| **Context** | The `(trace_id, span_id, flags, baggage)` propagated between services |
| **Baggage** | Arbitrary key-values that flow alongside context (tenant_id, feature flag) |

**Context propagation — the wire format:**

| Standard | Header | Used by |
|---|---|---|
| **W3C Trace Context** | `traceparent: 00-<trace-id>-<parent-span-id>-<flags>` + `tracestate` | OpenTelemetry default |
| **B3** (Zipkin) | `X-B3-TraceId`, `X-B3-SpanId`, `X-B3-Sampled` | Older Zipkin / Spring Cloud Sleuth |
| **Jaeger** | `uber-trace-id` | Older Jaeger clients |
| **AWS X-Ray** | `X-Amzn-Trace-Id` | AWS-native services |
| **Datadog** | `x-datadog-trace-id`, `x-datadog-parent-id` | Datadog APM |

> Modern stacks emit **W3C** by default; OTel libraries auto-extract / re-inject across HTTP, gRPC, message queues.

**Backend choice — what each one is good at:**

| Backend | Strength | Watchpoint |
|---|---|---|
| **Jaeger** | OSS, CNCF, K8s-native | Storage scalability requires Cassandra / ES |
| **Grafana Tempo** | Object-store backed (S3 / GCS) — cheap; trace-by-ID lookup; integrates Loki / Grafana | No full-text search across spans (rely on metrics + logs for that) |
| **Zipkin** | Older, simpler | Smaller community now |
| **AWS X-Ray** | AWS-native, integrates IAM | AWS-only |
| **Honeycomb** | Wide events; high-cardinality query; bubble-up analysis | Commercial |
| **Datadog APM** | Tight metrics / logs / traces correlation | Commercial; cardinality cost |
| **New Relic / Lightstep / Dynatrace** | Full-stack APM | Commercial |
| **SigNoz** | OSS APM | Smaller community than Jaeger |
| **Tempo + Grafana + Mimir + Loki + Alloy** | All-OSS observability stack | Self-hosted ops cost |

**OpenTelemetry pipeline (operational view):**

```
App SDKs ─►  Side-car / agent  ─►  OTel Collector  ─►  Backend(s)
   │             (optional)         (process,           Jaeger / Tempo / X-Ray
   │                                 sample, redact,    / Datadog / Honeycomb
   │                                 enrich, fan out)
```

**OTel Collector — the operational center of gravity:**

| Capability | Why |
|---|---|
| **Receive** OTLP / Zipkin / Jaeger / Prometheus / fluent / etc. | Vendor-neutral intake |
| **Process** | batch, retry, attribute manipulation, redact PII, **tail sampling** |
| **Export** | Multi-backend fan-out (e.g. Tempo + Datadog simultaneously) |
| **Isolation** | Run as agent (per-host) or gateway (centralized) |
| **Vendor independence** | Swap backends without re-instrumenting apps |

**Sampling strategies — keeping costs sane:**

| Strategy | When chosen | Pros | Cons |
|---|---|---|---|
| **Head sampling** (fixed rate, e.g., 1%) | At trace start | Cheap, simple | Errors may be sampled away |
| **Head sampling per-route** | At trace start | Higher rate for slow / error routes | Manual rule maintenance |
| **Rate-limited per service** | At trace start | Bound cost at the source | Coarse |
| **Tail sampling** (in Collector) | After trace completes | Keep all errors + slow traces; sample only "boring" ones | Requires Collector + memory to buffer |
| **Probabilistic + dynamic** | Hybrid | Adaptive | More config |

> **Tail sampling rule:** keep 100% of errors and slow traces, sample 1–5% of normal — best signal-to-cost ratio.

**Tail-sampling Collector config (sketch):**

```yaml
processors:
  tail_sampling:
    decision_wait: 30s
    policies:
      - name: errors-keep
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: slow-keep
        type: latency
        latency: { threshold_ms: 1000 }
      - name: probabilistic
        type: probabilistic
        probabilistic: { sampling_percentage: 5 }
```

**Cost anatomy — what drives the bill:**

| Driver | Effect |
|---|---|
| **Trace volume** (spans/sec) | Linear with sampling rate × throughput |
| **Spans per trace** | More services hops × more instrumented operations |
| **Attribute cardinality** | Per-attribute storage cost; some backends charge for cardinality |
| **Retention** | 7d / 30d / 90d — multiplies storage |
| **Index strategy** | Tempo (no indexing) cheap, Jaeger (full indexing) expensive at scale |
| **Live tail / always-on debug** | Cardinality + storage spike |

**Operational sizing (rough heuristics):**

| Trace rate | Approach |
|---|---|
| < 100 spans/s | Self-host Jaeger w/ in-memory / single backend |
| 1k–10k spans/s | OTel Collector + Tempo or Jaeger w/ Cassandra/ES |
| 10k–100k spans/s | Sharded Tempo / commercial APM; tail sampling mandatory |
| > 100k spans/s | Multi-tier collector pipeline; aggressive sampling; cost-tiered backends |

**Three-pillars correlation — what to wire up:**

| Signal | Tie to traces via |
|---|---|
| **Logs** | Inject `trace_id` + `span_id` into every log line |
| **Metrics** | Use `service.name` + RED metrics; pivot from chart anomaly to traces in same window |
| **Profiles** (continuous profiling) | Pyroscope / Parca / Datadog Profiler tagged with `trace_id` for in-trace flame graphs |

**Cardinality — the silent killer:**

| Anti-pattern | Effect |
|---|---|
| Putting `user_id` as an attribute on every span | Per-user cardinality blow-up |
| Full URL in `http.url` (with query string) | Each unique URL = a unique series in metric exemplars |
| Customer-supplied strings | Adversarial cardinality |
| Per-instance pod name as a tag | Counts every pod restart as a new series |

> Use **`http.route`** (templated path) instead of `http.url`. Put high-cardinality fields in **logs**, not in trace attributes used for indexing.

**Deployment patterns:**

| Pattern | Use |
|---|---|
| **Agent on each host** (DaemonSet) | Apps send to localhost; agent forwards |
| **Sidecar per pod** | Useful when host agent isn't possible |
| **Centralized Collector gateway** | Apps push directly; tail sampling needs central view of trace |
| **Two-tier (agent + gateway)** | Agents for resilience + batching; gateway for tail sampling + global policy |

**Auto-instrumentation — what you get for free:**

| Stack | OTel auto-instrumentation |
|---|---|
| Java / Kotlin | JVM agent — no code change |
| .NET | Auto-attach for ASP.NET / .NET Core |
| Python | `opentelemetry-instrument` runner |
| Node.js | Auto-instrumentation packages |
| Go | Manual or eBPF auto-instr (Beyla, OTel eBPF) |
| Ruby | Gem-by-gem wrappers |
| Service mesh | Istio / Linkerd emit spans for every hop without app changes |

**Linking traces to incidents:**

| Practice | Value |
|---|---|
| Trace ID in user-facing 5xx error responses (`X-Request-Id`) | Ops can grab trace from a single error report |
| Trace ID in support tickets | Customer report → exact trace |
| Exemplar metrics | Click a slow data point → jump to a sample trace |
| Trace-driven SLO burn analysis | "Which traces are eating our error budget?" |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| 100% sampling | Storage explodes |
| 1% head sampling | Errors and slow paths invisible |
| No tail sampling for production | Pay for cargo, miss the signal |
| `trace_id` not in logs | No cross-correlation; debugging via wall-clock time alone |
| Inconsistent attribute names across services | Hard to query; use OTel **semantic conventions** |
| Span attributes with PII | Privacy violations; redact in Collector |
| Mixing trace formats (B3, W3C, Jaeger) | Spans get dropped at boundaries |
| Synchronous span export from app | Latency added to user requests; use batch async |
| Long-running spans (hours) | Many backends drop or split; emit child spans |
| Collector crash without buffer | Trace data loss during outage |

**Health checks for the tracing pipeline itself:**

| Metric | Watch |
|---|---|
| Collector queue depth | Backpressure → drop incoming |
| Export errors per backend | Backend down or rate-limited |
| Tail sampling decision time | Memory pressure |
| Trace cardinality per service | Sudden spike = bug or attack |
| Export latency to backend | Slow exporter = correlation lag |

**Decision shortcuts:**

| Need | Pick |
|---|---|
| OSS, K8s-native, full Grafana stack | **Tempo + Grafana + Mimir + Loki + OTel Collector** |
| OSS, traditional | Jaeger + Cassandra/ES |
| Strong correlation across logs / metrics / traces, willing to pay | Datadog / Honeycomb / New Relic |
| AWS-native, simple | X-Ray |
| Minimal ops, vendor-locked | Managed APM SaaS |
| High-cardinality exploratory queries | Honeycomb |

**Rule of thumb:** **OpenTelemetry to instrument**, **OTel Collector to process**, **swap backends as needs change**. **Tail sample** to keep the interesting traces (errors + slow + key business flows) cheap. **`trace_id` in every log line** is non-negotiable. Watch **cardinality** like memory — it's the hidden cost line. **Tempo for cheap OSS storage; commercial APM when correlation depth justifies the bill.**
