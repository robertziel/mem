### Incident Response — Severity, Roles, Lifecycle, Postmortem

**Definition:** **incident response** is the structured way teams handle production failures. The discipline isn't just fixing things — it's **mitigating fast, communicating clearly, and learning systematically**. The blameless postmortem is the cultural keystone.

**Severity levels (industry standard SEV / P scale):**

| Level | Impact | Response | Examples |
|---|---|---|---|
| **SEV1 / P1** | Total outage, data loss, security breach | All hands, war room, exec notification | Site down, DB corruption, data leak |
| **SEV2 / P2** | Major feature degraded, partial outage | On-call + team lead, Slack room | Payments failing for some users, auth flaky |
| **SEV3 / P3** | Minor impact, workaround exists | On-call during business hours | Slow page loads, UI bug for one feature |
| **SEV4 / P4** | Cosmetic, no user impact | Normal sprint backlog | Typo, log noise, doc out of date |

**Lifecycle — six phases:**

```
   Detection ──► Triage ──► Communication ──► Mitigation ──► Resolution ──► Postmortem
       │           │            │                 │              │              │
   Alert /      Assign IC,   Status page,      Stop the       Permanent      Learn,
   user        severity     stakeholders     bleeding         fix           prevent
   report
```

| Phase | Goal |
|---|---|
| **Detection** | Find out something's wrong |
| **Triage** | Assess severity, assign incident commander |
| **Communication** | Set expectations with users / stakeholders |
| **Mitigation** | Stop user-impact (rollback, scale, failover) |
| **Resolution** | Permanent fix |
| **Postmortem** | Blameless review + action items |

**Roles during a SEV1/SEV2:**

| Role | Responsibility |
|---|---|
| **Incident Commander (IC)** | Coordinates response, makes decisions, no hands-on debugging |
| **Communications Lead** | Status page updates, customer comms, stakeholder updates |
| **Technical Lead (Subject Matter Expert)** | Hands-on debugging + mitigation |
| **Scribe** | Documents timeline, decisions, actions |
| **Customer Liaison** | (For B2B) Direct customer contact |
| **Exec sponsor** | (For SEV1) Visible exec presence |

> The IC doesn't debug. They keep order, time-box, escalate, decide. Hands-on work is for the Tech Lead.

**Mitigation playbook — quick wins to try first:**

| Symptom | First mitigation |
|---|---|
| Started after recent deploy | **Rollback** the deploy |
| Traffic spike | Scale up + enable rate limiting |
| Single dependency failing | Circuit-break + fall back |
| Region-specific | Failover to other region |
| Database overloaded | Kill long queries, scale up replica reads |
| Memory leak | Restart pods (rolling) |
| Cache cold after restart | Pre-warm or accept brief degradation |
| Cannot identify | Engage more engineers, escalate severity |

> "Rollback first, debug after" is the default. Fixing forward in production rarely beats reverting.

**Communication template:**

```
[STATUS UPDATE — SEV1]
Service:     Payment API
Impact:      ~30% of payment transactions failing (US-East)
Started:     2026-04-27 14:30 UTC
Status:      Investigating  →  Mitigating  →  Resolved
Action:      Rolled back deploy v1.2.3, monitoring recovery
Duration:    15 minutes elapsed
Next update: 14:50 UTC (15 min)
IC:          @alice
```

| Channel | Audience |
|---|---|
| Internal incident channel | Engineers responding |
| Status page | Customers |
| Email / SMS | Affected enterprise customers |
| Twitter / social | Public PR (rare) |
| Exec Slack | Leadership awareness |

**Cadence rules:**

| Severity | Update frequency |
|---|---|
| SEV1 | Every 15 min |
| SEV2 | Every 30 min |
| SEV3 | Every hour |
| Status page | At each state change |

**Postmortem structure (blameless):**

| Section | Detail |
|---|---|
| **Summary** | One paragraph: what / when / impact / duration |
| **Timeline** | Chronological events: detection → mitigation → resolution |
| **Root cause** | The actual mechanism — not just "bug" |
| **Contributing factors** | What made it worse: missing alert, unclear runbook, insufficient testing |
| **What went well** | Praise effective responses |
| **Action items** | Specific, owned, with deadlines (and tracked!) |
| **Lessons learned** | Systemic improvements |

**Blameless principles — the cultural keystone:**

| Principle | Detail |
|---|---|
| Focus on systems, not individuals | "How did the system allow this?" |
| Assume best intentions | Engineer made best decision with info available |
| Hindsight bias is real | Don't judge past actions with present info |
| Goal: prevention, not punishment | If people fear blame, they hide problems |
| Action items must be **specific + owned + dated** | "Improve testing" ≠ owned action |

**Key incident metrics:**

| Metric | What |
|---|---|
| **MTTD** | Mean Time To Detect — alert speed |
| **MTTA** | Mean Time To Acknowledge — on-call response |
| **MTTR** | Mean Time To Resolve — total recovery |
| **MTBF** | Mean Time Between Failures — system reliability |
| **Severity-weighted incident count** | Burden on team |
| **Action-item completion rate** | Are we actually learning? |

**Pre-incident hygiene (preparation):**

| Practice | Detail |
|---|---|
| Runbooks for common failures | Step-by-step recovery |
| On-call rotation + handoff | Clear ownership |
| Alert hygiene | Page only when human action needed |
| Game days / chaos engineering | Practice failures |
| Status page template ready | Don't compose mid-incident |
| Comms templates ready | Reduce cognitive load |
| Rollback rehearsed | Verify it works |
| Access checked | On-callers can do what they need |

**Pre-mortem (proactive review):**

| Question | Detail |
|---|---|
| "What if this fails on Friday at 3pm?" | Tabletop exercise |
| What would alert? | Detection check |
| Who'd be paged? | On-call coverage |
| What's the runbook? | Recovery path |
| What's the blast radius? | Containment |
| Could we recover without engineering? | Self-healing |

**On-call hygiene — sustainable rotation:**

| Practice | Detail |
|---|---|
| One primary, one backup per shift | Not solo |
| Shift length 1 week, 24/7 only with care | Burnout-aware |
| Compensation (time off / pay) | Not free overtime |
| Page only when human action required | Otherwise file ticket |
| Weekly on-call review | Tune alerts, fix runbooks |
| Track pages per shift | If > 5/shift, alert hygiene problem |

**Anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| Blameful postmortems | Fear culture, hidden problems |
| No action items, just "lessons learned" | No actual improvement |
| Action items without owner / deadline | Never done |
| Skipping postmortems for SEV3 | Patterns never surface |
| One person both IC and Tech Lead | Cognitive overload |
| Customer comms after engineering "fixes" it | Trust damaged |
| "Heroes" celebrated for fighting fires | Wrong incentive |
| No escalation path | IC stuck escalating sideways |
| Permanent SEV2 baseline (incident always open) | Numbness |
| Rolled back fix that's not addressed in code | Same incident next week |

**Decision matrix:**

| Question | Answer |
|---|---|
| Should I escalate severity? | When in doubt, yes — easy to downgrade |
| Should I rollback? | Almost always yes if tied to a deploy |
| Should I update status page? | If users notice, yes |
| Should I wake someone up? | If SEV1/SEV2 + needed expertise |
| Should I do a postmortem? | Always for SEV1/SEV2; selectively for SEV3 |
| Should I bring in legal / PR? | Data exposure → yes immediately |

**Cross-references:**

- Disaster recovery (RTO/RPO): [disaster_recovery_*.md](disaster_recovery_dr.md)
- Monitoring + alerting: [monitoring_stack_*.md](../monitoring_observability/monitoring_stack_apm_error_tracking_logging.md)
- Three pillars (metrics/logs/traces for triage): [three_pillars_*.md](../monitoring_observability/three_pillars_observability_metrics_logs_traces.md)
- Chaos engineering: [chaos_*.md](../../distributed_systems/chaos_engineering_failure_injection.md)

**Rule of thumb:** **Mitigate first, investigate later — rollback is usually fastest.** Communicate **early and often** even if you don't have answers yet. Run **blameless postmortems** for every SEV1/SEV2 with **specific, owned, dated action items**. Track **MTTD / MTTA / MTTR** and **action-item completion**. Pre-build runbooks, comms templates, and on-call coverage so the team isn't composing mid-fire.
