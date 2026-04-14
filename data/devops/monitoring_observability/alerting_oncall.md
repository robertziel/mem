### Alerting and On-Call

**SLI / SLO / SLA:**
- **SLI (Service Level Indicator)** - measured metric (e.g., 99.2% of requests < 200ms)
- **SLO (Service Level Objective)** - internal target (e.g., 99.9% availability per month)
- **SLA (Service Level Agreement)** - contractual promise with consequences (e.g., 99.5% uptime, refund if breached)
- SLO should be stricter than SLA (buffer for reaction)

**Error budget:**
- If SLO = 99.9% per month: error budget = 0.1% = ~43 minutes of downtime
- While error budget remains: ship features
- When error budget depleted: prioritize reliability

**Golden signals (from Google SRE):**
1. **Latency** - time to serve requests (p50, p95, p99)
2. **Traffic** - request rate (requests/sec)
3. **Errors** - error rate (5xx, failed requests)
4. **Saturation** - resource utilization (CPU, memory, disk, connections)

**RED method (for services):**
- **Rate** - requests per second
- **Errors** - errors per second
- **Duration** - latency distribution

**USE method (for resources):**
- **Utilization** - % of resource used
- **Saturation** - work queued/waiting
- **Errors** - error count

**Alerting best practices:**
- Alert on symptoms (high error rate), not causes (CPU high)
- Use severity levels: Critical (page), Warning (ticket), Info (dashboard)
- Include runbook link in alert
- Avoid alert fatigue: if you ignore an alert, it shouldn't be paging

**Alert structure:**
```
[CRITICAL] Payment API error rate > 5%
Service: payment-api
Environment: production
Current value: 7.3%
Threshold: 5%
Dashboard: https://grafana.internal/d/payments
Runbook: https://wiki.internal/runbooks/payment-errors
```

**On-call practices:**
- Rotation schedule (weekly, follow-the-sun for global teams)
- Escalation policy: primary -> secondary -> engineering manager
- Blameless postmortems after incidents
- Track MTTA (mean time to acknowledge) and MTTR (mean time to resolve)
- Tools: PagerDuty, Opsgenie, Grafana OnCall

**Rule of thumb:** Define SLOs before setting up alerts. Alert on user-facing symptoms. Every page should be actionable. If an alert fires and you can't do anything, it's not a good alert. Track error budgets to balance velocity and reliability.
