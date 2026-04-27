### Chaos Engineering

**What it is:**
- Deliberately inject failures to test system resilience
- Discover weaknesses before they cause outages
- Build confidence that systems can handle turbulent conditions
- Originated at Netflix (Chaos Monkey, Simian Army)

**Principles:**
1. Start with a hypothesis ("The system can handle losing one AZ")
2. Define steady state (normal metrics: latency, error rate, throughput)
3. Introduce realistic failures
4. Observe deviation from steady state
5. Fix weaknesses found

**Types of failure to inject:**

| Category | Examples |
|----------|---------|
| Infrastructure | Kill instances, AZ failure, disk full |
| Network | Latency injection, packet loss, DNS failure, partition |
| Application | Kill processes, memory pressure, CPU stress |
| Dependencies | Downstream service timeout, database failover |

**Tools:**
- **Chaos Monkey** (Netflix) - randomly terminates instances
- **Litmus** - Kubernetes-native chaos engineering (CNCF)
- **Gremlin** - commercial, SaaS chaos platform
- **AWS Fault Injection Simulator (FIS)** - AWS-managed
- **Toxiproxy** - simulate network conditions (latency, timeout)
- **stress-ng** - CPU/memory/disk stress testing

**Kubernetes chaos experiments:**
```yaml
# Litmus: kill a random pod
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: pod-kill
spec:
  appinfo:
    appns: production
    applabel: app=web
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: '30'
            - name: CHAOS_INTERVAL
              value: '10'
```

**Chaos experiment checklist:**
- [ ] Start in non-production (staging)
- [ ] Have monitoring and alerts in place
- [ ] Define blast radius (limit scope)
- [ ] Have a kill switch (stop experiment immediately)
- [ ] Run during business hours (people available to respond)
- [ ] Document findings and remediation
- [ ] Gradually increase scope and severity

**Common findings:**
- Missing health checks or readiness probes
- No retry logic for transient failures
- Timeout not configured (waiting forever)
- Single points of failure (one replica, one AZ)
- Missing circuit breakers
- Alerts don't fire or are too slow

**GameDay:**
- Scheduled chaos experiment with the whole team
- Simulate a real incident (e.g., "us-east-1 is down")
- Practice incident response procedures
- Debrief and document improvements

**Rule of thumb:** Start small (kill one pod), verify recovery, then escalate. Chaos in production is the goal, but start in staging. Every experiment should have a hypothesis and a kill switch. Fix what you find before running more experiments.
