### Incident Response

**Incident severity levels:**
| Level | Impact | Response | Example |
|-------|--------|----------|---------|
| SEV1/P1 | Full outage, data loss | All hands, war room | Site down, DB corruption |
| SEV2/P2 | Major feature degraded | On-call + team lead | Payments failing for some users |
| SEV3/P3 | Minor impact, workaround exists | On-call during business hours | Slow page loads, UI bug |
| SEV4/P4 | Cosmetic, no user impact | Normal sprint work | Typo, minor log noise |

**Incident lifecycle:**
1. **Detection** - alert fires, customer report, monitoring
2. **Triage** - assess severity, assign incident commander
3. **Communication** - status page update, stakeholder notification
4. **Mitigation** - stop the bleeding (rollback, scale up, failover)
5. **Resolution** - permanent fix
6. **Post-incident** - blameless postmortem, action items

**Incident roles:**
- **Incident Commander (IC)** - coordinates response, makes decisions
- **Communications Lead** - updates status page, stakeholders
- **Technical Lead** - leads debugging and mitigation
- **Scribe** - documents timeline and actions

**Mitigation playbook (quick actions):**
```
1. Is it a recent deploy? -> Rollback
2. Is it traffic-related? -> Scale up, enable rate limiting
3. Is it a dependency? -> Check status pages, failover
4. Is it data-related? -> Stop writes, assess blast radius
5. Can't identify? -> Engage more team members, escalate
```

**Communication template:**
```
[STATUS UPDATE - SEV1]
Service: Payment API
Impact: ~30% of payment transactions failing
Start time: 2024-01-15 14:30 UTC
Status: Investigating
Current action: Rolled back deploy v1.2.3, monitoring recovery
Next update: 15 minutes
```

**Postmortem structure:**
1. **Summary** - what happened, impact, duration
2. **Timeline** - chronological events (detection -> resolution)
3. **Root cause** - what actually broke and why
4. **Contributing factors** - what made it worse (missing alerts, unclear runbook)
5. **What went well** - what worked in the response
6. **Action items** - specific, assigned, with deadlines
7. **Lessons learned** - systemic improvements

**Blameless postmortem principles:**
- Focus on systems and processes, not individuals
- "How did the system allow this to happen?"
- Assume everyone acted with best intentions
- Goal: prevent recurrence, not assign blame

**Key metrics:**
- **MTTD** - Mean Time To Detect
- **MTTA** - Mean Time To Acknowledge
- **MTTR** - Mean Time To Resolve
- **MTBF** - Mean Time Between Failures

**Rule of thumb:** Mitigate first, investigate later. Rollback is almost always the fastest mitigation. Communicate early and often. Every SEV1/SEV2 gets a blameless postmortem with tracked action items.
