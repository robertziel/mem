### Alerting & On-Call

**SLI / SLO / SLA — three different things:**

| Term | Definition | Example | Audience |
|---|---|---|---|
| **SLI** (indicator) | The measurable signal | "% of requests with status < 500" | Internal — engineering |
| **SLO** (objective) | Internal target on the SLI | "99.9% over rolling 30 days" | Internal — engineering + product |
| **SLA** (agreement) | External commitment with consequences | "99.5% uptime; service credit if breached" | External — customers / contracts |
| Buffer | SLO **stricter** than SLA | If SLA = 99.5%, set SLO ≥ 99.9% | — |

**Common SLI types:**

| SLI | How it's measured |
|---|---|
| **Availability** | `successful_requests / total_requests` |
| **Latency** | `requests_under_threshold / total_requests` (e.g. < 300 ms) |
| **Throughput** | Per-second processed |
| **Quality** | Returned-with-good-data / total |
| **Freshness** | `now - max_event_timestamp` |
| **Correctness** | `passed_validation / total` |
| **Coverage** (data pipelines) | `processed_partitions / expected_partitions` |
| **Durability** | `data_retained / data_promised` |

**Error budget — the central concept:**

| Property | Example |
|---|---|
| Definition | `1 − SLO` over the window |
| 99.9% SLO over 30 days | ~43 m 12 s of allowed downtime |
| 99.95% SLO over 30 days | ~21 m 36 s |
| 99.99% SLO over 30 days | ~4 m 19 s |
| Window | Rolling 28 / 30 days typical |
| Policy | Budget remaining → ship features; budget burned → freeze, focus on reliability |

> **Error budgets turn reliability from a vibe into a quantity.** They make trade-offs between launch speed and ops burden explicit.

**The four golden signals (SRE book):**

| Signal | Detail |
|---|---|
| **Latency** | Time to serve requests; success and error latency separately |
| **Traffic** | Workload (RPS, MB/s, queries/s) |
| **Errors** | Failed-request rate |
| **Saturation** | How "full" the service is (queue depth, worker pool, CPU) |

**RED — for request-driven services:**

| Letter | Metric |
|---|---|
| **R**ate | Requests/sec |
| **E**rrors | Error rate |
| **D**uration | Latency percentiles |

**USE — for resources:**

| Letter | Metric |
|---|---|
| **U**tilization | % busy |
| **S**aturation | Work queued / waiting |
| **E**rrors | Error counts on the resource |

> RED for services, USE for resources, golden signals as the umbrella.

**Symptom vs cause — the most-violated rule:**

| ✅ Symptom (alert on these) | ❌ Cause (don't page on these) |
|---|---|
| User-facing 5xx ratio > X% | One pod's CPU > 90% |
| p95 latency regression | DB connection pool 80% used |
| Error-budget burn rate | One container restarted |
| Login success rate drop | Memory > 70% on one node |
| Payment failure rate | High GC time |
| Queue depth growing without bound | One disk near full |
| Customer-visible login flow broken | One container's restart count > 0 |

> **Symptoms get pages. Causes belong on dashboards.** If you can't answer "what does this alert mean for users?", it's a cause-level metric.

**Alert severity tiers:**

| Tier | Means | Routing | Response |
|---|---|---|---|
| **Critical / P1** | User-visible incident; SLO at risk | Page (24/7) | Acknowledge < 5 min; engage incident response |
| **Warning / P2** | Degradation likely soon | Ticket / Slack | During business hours |
| **Info / P3** | Anomaly worth investigating | Dashboard / weekly review | Async |

> If you'd ignore the page at 3 AM, it shouldn't page. Move it to ticket.

**Burn-rate alerting (multi-window, multi-burn-rate):**

| Burn rate | Window pair | Means | Tier |
|---|---|---|---|
| 14.4× | 1 h + 5 m | Burning monthly budget in ~2 days | Page (fast) |
| 6× | 6 h + 30 m | Burning monthly budget in 5 days | Page (medium) |
| 3× | 1 d + 2 h | Burning monthly budget in 10 days | Ticket (slow) |
| 1× | 3 d + 6 h | Continuous breach | Ticket (slowest) |

> Pair short + long windows so a real outage pages fast, but transient spikes don't. Single-window thresholds always either flap or miss.

**Alert anatomy — what every alert needs:**

| Field | Purpose |
|---|---|
| **Title** | One-line problem |
| **Severity** | P1 / P2 / P3 |
| **Affected service / route / region** | Scope |
| **Current value vs threshold** | "Why" in numbers |
| **Time started** | Duration |
| **Dashboard link** | Drill-down |
| **Runbook link** | Step-by-step response |
| **Owner / team** | Who responds |
| **Recent deploys / changes** | Probable cause |

**Sample alert payload:**

```
[P1] Payment API 5xx rate above SLO
Service: payment-api  •  Region: us-east-1  •  Env: prod
Current: 7.3% over 5m   Threshold: > 5% for 5m
Started: 2024-04-15 10:14 UTC
Dashboard: https://grafana.internal/d/payments
Runbook:   https://runbooks.internal/payment-5xx
On-call:   @platform-pri
Recent:    deploy payment-api v1.4.2 at 10:08 UTC
```

**Runbook contents — every alert should link to one:**

| Section | Detail |
|---|---|
| **Summary** | What this alert means |
| **Probable causes** | Top 3 likely sources |
| **Diagnostic steps** | Commands / queries to run |
| **Mitigation** | Quick rollback / failover / circuit-break |
| **Escalation** | When and to whom |
| **Comms** | Status-page update template |
| **Post-incident** | Owner, follow-up tracking |

**On-call rotation — make it humane:**

| Concern | Detail |
|---|---|
| Rotation length | 1 week typical; 24h shifts during incident |
| Follow-the-sun | Multi-region rotation reduces night pages |
| Primary + secondary | Secondary pages if primary doesn't ack in N minutes |
| **Compensation** | Pay or time-off for nights / weekends |
| Hand-off ritual | Outgoing → incoming: open incidents, recent deploys, watchpoints |
| **Pager budget** | "If > N pages a week, that's a project to fix" |
| Limits | New hires shouldn't be on-call for first month |
| Alternative shifts | Tired person can swap |

**Incident response process:**

| Step | Action |
|---|---|
| 1 | **Acknowledge** the page (MTTA — Mean Time To Acknowledge) |
| 2 | **Assess** severity, affected scope |
| 3 | **Communicate** in incident channel + status page |
| 4 | **Mitigate** before diagnosing — restore service, then investigate |
| 5 | **Diagnose** root cause |
| 6 | **Resolve** the immediate issue |
| 7 | **Stand down** the incident |
| 8 | **Post-mortem** within a week (blameless) |

> **Mitigate first, root-cause second.** Fully diagnosing before rolling back is a common rookie move.

**Incident roles (during an active P1):**

| Role | Responsibility |
|---|---|
| **Incident Commander (IC)** | Coordinates; doesn't fix code |
| **Operations / Investigators** | Diagnose, mitigate |
| **Communications** | Update status page, exec, customers |
| **Scribe** | Timeline, decisions, evidence |
| **Subject-matter experts** | On-call from affected service |

**Status page comms — three honest beats:**

| Stage | Message template |
|---|---|
| **Investigating** | "We're investigating reports of [symptom]. Updates in 15 min." |
| **Identified** | "We've identified [cause] affecting [scope]. Working on a fix." |
| **Monitoring** | "A fix has been deployed. Monitoring for full recovery." |
| **Resolved** | "All systems operational since [time]. Post-mortem to follow." |

**Postmortem (blameless) structure:**

| Section | Content |
|---|---|
| Summary | One paragraph |
| Impact | Who / how many / how long / financial |
| Timeline | UTC entries with evidence links |
| Root cause(s) | "5 whys" — multiple often |
| Detection | How we noticed; could it be sooner? |
| Mitigation | What stopped the bleeding |
| What went well | Things to keep doing |
| What went poorly | Things to fix |
| Action items | Concrete, owned, dated |

> **Blameless** means analyzing systems, not punishing humans. Punishing kills the reporting culture and you find out about issues from customers next time.

**Metrics to track for the on-call program:**

| Metric | Healthy |
|---|---|
| **MTTA** (Mean Time To Acknowledge) | < 5 min |
| **MTTR** (Mean Time To Recovery) | Service-dependent — track trend |
| **Pages per week** | Falling, not rising |
| **Off-hours page %** | Bound it; chronic = ops problem |
| **Pages by alert** | Top offenders → fix or remove |
| **% pages with runbook hits** | High = runbooks work |
| **% incidents with action items closed within 30 days** | Health of follow-up culture |
| **Error-budget burn rate** | Within target |
| **Time spent on toil** vs project work | Goal: project work > toil |

**Alert hygiene — the practices that prevent fatigue:**

| Practice | Effect |
|---|---|
| **Tune** alerts that fire and resolve themselves quickly | No-action pages disappear |
| **Auto-resolve** alerts when the metric recovers | No manual close |
| **Snooze / silence** during deploys / known maintenance | Prevent expected noise |
| **Group** related alerts | One incident = one page, not 50 |
| **Inhibit** child alerts when parent fires | "DB down" suppresses "many query timeouts" |
| **Per-service ownership** + escalation tree | Nobody pages "the team" — pages a specific rotation |
| **Post-incident retro on the alert itself** | Did we get it right? Did the runbook work? |
| **Ban "warning emails"** | Either it's actionable (alert) or it isn't (dashboard) |

**Tooling map:**

| Need | Tool |
|---|---|
| Paging + escalation | PagerDuty, Opsgenie, Grafana OnCall, Squadcast, FireHydrant |
| Status page | Statuspage.io, BetterStack, Instatus, internally-built |
| Incident management | FireHydrant, Rootly, Incident.io, Jeli |
| Runbooks | GitHub wiki, Confluence, Notion, dedicated runbook tools |
| Metrics + alerts | Prometheus + Alertmanager, Datadog Monitors, Grafana Alerting |
| SLO tracking | Sloth, Pyrra, Nobl9, Datadog SLOs |
| Postmortem facilitation | FireHydrant Retro, Jeli, Howie |
| ChatOps | Slack / Teams + bots |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Alert on cause-level metrics | Alert fatigue |
| No SLOs defined | Reactive culture; no shared bar |
| Alerts without runbooks | "What do I do?" panic |
| One big "production" rotation | Every alert pages everyone; ownership unclear |
| Public-facing status page lying / late | Loss of trust |
| Diagnose before mitigating | Outage prolonged |
| Punitive postmortems | Hide future incidents |
| Same alert thresholds across services | Inappropriate per service |
| Threshold tuned to a single window | Flaps or misses |
| 100 % response-team fix | Symptoms keep returning if upstream not addressed |
| No follow-up on action items | Same incident, six months later |
| New hire on-call week one | Burns them out, bad for incident |

**Alert quality checklist (per alert):**

| Check | Pass? |
|---|---|
| Symptom-level (user-visible) | ✅ |
| Threshold + window aligned with SLO burn | ✅ |
| Runbook link present | ✅ |
| Owner / team unambiguous | ✅ |
| Severity matches actual urgency | ✅ |
| Auto-resolves when metric recovers | ✅ |
| Reviewed in last 6 months | ✅ |
| Pages < 1× / week (otherwise tune) | ✅ |

**Cross-references:**

- Prometheus + alerting rules + Alertmanager: [prometheus_grafana.md](prometheus_grafana.md)
- API-level observability: [api_observability_*.md](../../api_design/api_observability_metrics_logs_traces_slos_alerting.md)
- Capacity / autoscaling: [capacity_planning_*.md](../reliability_incident_management/capacity_planning_auto_scaling_autoscaling.md)
- Chaos engineering: [chaos_engineering.md](../reliability_incident_management/chaos_engineering.md)

**Rule of thumb:** **define SLOs first; alerts are derived from them.** **Alert only on symptoms** that affect users; **causes go on dashboards**. **Runbook on every alert**, **MTTA < 5 min**, **mitigate before diagnosing**, **blameless postmortems** with tracked action items. The single best metric for an on-call program is **declining pages per week** — silence is the goal.
