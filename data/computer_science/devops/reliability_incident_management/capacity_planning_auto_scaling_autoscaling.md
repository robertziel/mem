### Capacity Planning & Auto-Scaling

**Capacity planning loop:**

| Step | What you do |
|---|---|
| 1. **Baseline** | Measure current load: req/s, p50/p95/p99 latency, CPU, mem, connections, queue depth |
| 2. **Project** | Estimate growth — historical trend + business plans + scheduled events |
| 3. **Buffer** | Add headroom (commonly 30–50 % above projected peak) |
| 4. **Test** | Load test ahead of need; verify the headroom holds |
| 5. **Review** | Re-baseline quarterly + before any major launch |

> If your "capacity plan" is `=AVG(last_quarter)`, you don't have one — that's just looking back.

**Metrics to track — by layer:**

| Layer | Metrics |
|---|---|
| **App** | RPS, p50/p95/p99 latency, error rate, queue depth, in-flight requests |
| **Container / VM** | CPU %, memory %, swap, FD count |
| **Network** | Bandwidth, packets/sec, conntrack, TCP retransmits |
| **Disk** | IOPS, throughput, queue depth, %util, free space |
| **Database** | Connections (active / max), slow query rate, replication lag, buffer hit ratio |
| **Cache** | Hit rate, eviction rate, memory used |
| **Queue / message bus** | Depth, consumer lag, processing time per message |
| **Business** | Active users, transactions/sec, revenue events — connect tech to demand |

**Saturation signals — what "almost out of capacity" looks like:**

| Resource | Bad signal |
|---|---|
| CPU | Sustained > 70 %; load average > cores |
| Memory | Swap activity, OOMKills |
| Disk | Queue depth growing, %util ≈ 100 |
| DB connections | Approaching pool / server max |
| Thread pool | Reject rate > 0 |
| Queue depth | Growing without bound, latency rising |
| Cache | Hit rate dropping, eviction spiking |
| LB | 5xx ratio rising, health checks flapping |

**Load testing — pick by job:**

| Tool | Strength | Weakness |
|---|---|---|
| **k6** | Scriptable JS, modern UX, great metrics | Single-node by default (k6 Cloud / k6 Operator scales it) |
| **Locust** | Python user-defined behavior, distributed | Slower per-VU than k6 |
| **Gatling** | JVM, recorded scenarios, detailed reports | Steeper Scala/Java learning |
| **JMeter** | Mature; broad protocol support | XML config can be unwieldy |
| **Artillery** | YAML config; good for APIs | Less flexible than scripted tools |
| **wrk** / **wrk2** | Tiny, very fast HTTP benchmark | Single endpoint, simple workload |
| **ab** (Apache Bench) | Ubiquitous quick check | Old; misleading at very high concurrency |
| **vegeta** | Go-based, scriptable, constant-rate hits | Less ecosystem |

**Test types — different questions:**

| Type | Goal | Pattern |
|---|---|---|
| **Smoke** | Does it work at all? | Tiny load, full feature set |
| **Load** | Behavior under expected peak | Gradual ramp to target steady state |
| **Stress** | Where does it break? | Beyond expected peak until failure |
| **Spike** | Sudden burst handling | 0 → very high → 0 |
| **Soak / endurance** | Memory leaks, slow degradation | Hours-long steady state |
| **Scalability** | Does adding capacity help linearly? | Same workload at increasing instance counts |
| **Capacity** | What's the max sustainable rate? | Find the ceiling; expect a knee |
| **Chaos / fault injection** | Behavior under partial failure | See `chaos_engineering.md` |

**Auto-scaling strategies:**

| Strategy | Mechanism | When |
|---|---|---|
| **Reactive (metric-based)** | Scale when metric crosses threshold | Default; handles unknown spikes |
| **Predictive / scheduled** | Scale to meet known event ahead of time | Black Friday, marketing send, cron jobs |
| **Target tracking** | "Maintain CPU = 60 %" — let the platform adjust | Simplest reactive; AWS / GCP / K8s HPA all support |
| **Step scaling** | Different response sizes per threshold band | Big spikes need bigger steps |
| **Predictive ML** (AWS Predictive Scaling) | Forecast + pre-warm | Stable seasonal patterns |
| **Reactive + scheduled together** | Pre-warm before a peak; reactive handles surprises | Mature setups |

**Scaling signals — what to scale on:**

| Signal | Best for |
|---|---|
| CPU utilization | CPU-bound services |
| Memory utilization | Right-size first; rarely a great scale signal |
| **Request count per target / instance** (RPS) | Web/API services — most predictive |
| **ALB request count per target** | Common AWS pattern for Fargate / ECS |
| Queue depth (`ApproximateNumberOfMessagesVisible` / lag) | Async workers / consumers |
| Custom CloudWatch / Prometheus metric | Anything domain-specific (active sessions, model inference QPS) |
| External GitHub Actions / cron-driven scale events | Build/CI fleets |

> **Pick the metric that's closest to user-perceived load.** RPS / queue depth usually beat CPU.

**Reactive scaling — knobs that matter:**

| Knob | Effect |
|---|---|
| Target value (e.g., 60 % CPU) | Lower → more headroom but more cost |
| Cooldown (scale-out / scale-in) | Prevents flapping; usually scale-in cooldown > scale-out |
| Min / max capacity | Bound autoscaler behavior |
| Warm-up time | New instances ignored until they finish warming |
| Step thresholds | More aggressive response to big spikes |
| Termination policies | Which instance to kill on scale-in (oldest, most expensive, etc.) |

**Scale-out fast, scale-in slow — the asymmetric rule:**

| Direction | Cooldown | Why |
|---|---|---|
| Scale-out | 1–3 min | Don't lag behind real load |
| Scale-in | 10–30 min | Avoid removing capacity that you needed; avoid flapping; preserve longer-running work |

**Kubernetes scaling — three knobs:**

| Knob | What it scales |
|---|---|
| **HPA** (Horizontal Pod Autoscaler) | Replica count of a Deployment, based on CPU / memory / custom metric |
| **VPA** (Vertical Pod Autoscaler) | Per-pod resource requests/limits (rarely with HPA on the same metric) |
| **Cluster Autoscaler / Karpenter** | Node count of the cluster |
| **KEDA** | Event-driven scaling (queue length, Kafka lag, cron, custom triggers) |

**Cloud autoscaling primitives (rough analog map):**

| Cloud | Service-level | VM-level |
|---|---|---|
| AWS | ECS service autoscaling, Fargate | EC2 Auto Scaling Group |
| GCP | Cloud Run autoscaling, GKE HPA | Managed Instance Groups |
| Azure | App Service plans, AKS HPA | VM Scale Sets |

**Forecasting — turn metrics into a plan:**

| Method | When |
|---|---|
| Linear extrapolation | Short horizon, stable trend |
| Seasonal decomposition (STL, Prophet) | Daily / weekly / yearly seasonality |
| Per-event projection | Marketing campaign, product launch |
| Pure capacity simulation | "If we double users, what breaks first?" |
| Little's Law (`L = λW`) | Quickly relate concurrency, arrival rate, latency |

**Headroom rules — how much margin is sane:**

| Workload type | Headroom |
|---|---|
| Stable, well-understood | 25–30 % |
| Spiky / event-driven | 50 %+ |
| Critical / cannot-fail | 100 %+ (N+1 or N+2 redundancy) |
| Cost-optimized batch | 0–10 % (it's OK to wait) |

**Cost levers (without sacrificing capacity):**

| Lever | Win |
|---|---|
| Reserved / committed-use discounts (1y / 3y) | 30–60 % off baseline |
| Spot / preemptible instances for non-critical | 50–90 % off |
| Right-size first, scale second | Big bills hide as overprovisioning |
| Multi-AZ but **not** multi-region unless needed | Cross-region traffic + storage is expensive |
| Scale-in aggressively in non-prod | Paying for idle staging |
| ARM (Graviton) where supported | ~20 % off + lower watt |
| Auto-stop dev / staging on schedule | Nights + weekends |

**Failure modes / pitfalls:**

| Pitfall | Effect |
|---|---|
| Scaling on CPU when bottleneck is DB connections | Adds instances; DB still saturated |
| Single auto-scaling metric | Misses other saturation signals |
| Cold-start time > scale-out cooldown | Adding instances doesn't help in time |
| No load test before launch | Discover the ceiling under real users |
| Scale-in faster than scale-out | Flapping; capacity oscillates |
| Cluster autoscaler can't add nodes (quota / IP exhaustion) | HPA scales pods that can't schedule — `Pending` storm |
| Database doesn't scale at the same rate | App scales, DB melts |
| Forgetting downstream dependencies | Scale your service, hit a rate-limited 3rd-party API |
| No headroom in a "scaled" fleet | Tiny spike → outage |
| Predictive scaling tuned on stale data | Pre-warming for last year's traffic |

**Pre-launch / pre-event checklist:**

| Check | Pass? |
|---|---|
| Load test at projected peak + 30–50 % | ✅ |
| Verify auto-scaling triggers actually fire under test | ✅ |
| DB connection pool sized for max instances × workers/connection | ✅ |
| Downstream services notified / scaled accordingly | ✅ |
| Cache pre-warmed (if cold start would page out) | ✅ |
| Runbook updated with new thresholds | ✅ |
| On-call has rollback / kill-switch | ✅ |

**Rule of thumb:** **load test before you need to**, and use the result to tune target metrics — not hand-wave a number. **Reactive (target-tracking on RPS or queue depth) is the default**; **scheduled / predictive** for known events; **scale out fast, scale in slow**. **Headroom of 30–50 %** above normal peak is normal; less means you're betting on perfect predictions. **Always include downstream capacity** (DB, queues, third-parties) — scaling the app while the DB tips over just shifts the outage.
