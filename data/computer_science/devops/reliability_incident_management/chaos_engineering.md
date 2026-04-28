### Chaos Engineering

**Definition:** the discipline of injecting controlled failures to expose weaknesses in a system *before* a real outage does. Originated at Netflix (Chaos Monkey, Simian Army, 2011).

**Principles (from "Principles of Chaos"):**

| # | Principle |
|---|---|
| 1 | Start with a **hypothesis** about steady state |
| 2 | Vary real-world events |
| 3 | Run experiments in production (eventually) |
| 4 | Automate experiments to run continuously |
| 5 | **Minimize blast radius** |

**The experiment loop:**

| Step | Detail |
|---|---|
| 1. **Steady state** | Define measurable normal: error rate, latency p99, throughput, business metrics |
| 2. **Hypothesis** | "The system survives losing one AZ with no user-visible impact" |
| 3. **Inject** | Introduce a controlled failure (terminate, latency, partition) |
| 4. **Measure** | Compare against steady state during and after |
| 5. **Stop** | Abort if blast radius escapes; otherwise let the experiment run to completion |
| 6. **Learn** | What surprised you? Document, fix, automate the regression test |

**Failure categories — what to inject:**

| Category | Examples |
|---|---|
| **Infrastructure** | Kill instance, terminate node, full disk, NIC error, AZ failure, region failure |
| **Network** | Added latency, packet loss, jitter, DNS failure, partition between services, blackhole |
| **Application** | Process kill, OOM, CPU stress, slow GC, fork-bomb |
| **Dependency** | Downstream timeout, slow response, error responses, database failover, cache cold |
| **State** | Clock skew, time jump, leap second, certificate expiry, secret rotation |
| **Capacity** | Sudden traffic spike, slow client, unbalanced load |
| **Data** | Corrupted message, malformed payload, encoding mismatch |
| **Human** | Engineer on call gets paged at 3 AM (gameday) |

**Common chaos experiments — pick by what you fear:**

| Experiment | Surfaces |
|---|---|
| Kill a random pod | Probe / restart logic; HPA reaction; service-mesh retry |
| Terminate an EC2 instance | ASG replacement; DNS / LB convergence; in-flight request handling |
| Drop one AZ | Multi-AZ deployment; quorum after partition; cross-AZ failover |
| Inject 500 ms latency between two services | Timeouts; retry storm; backpressure |
| Drop 10 % of packets | Application-level timeout vs TCP retransmit; sensitivity to jitter |
| Block DNS resolution | Stale DNS caches; service discovery; fallback paths |
| Fail the database primary | Failover time; read-replica promotion; connection pool reset |
| Cache invalidation storm | Origin survives traffic shift; thundering herd guards |
| Expire a secret / cert mid-traffic | Rotation discipline; reload-without-restart |
| Clock skew of N seconds | TTL / token expiration; consensus protocols (etcd, ZooKeeper) |

**Tooling landscape:**

| Tool | Use |
|---|---|
| **Chaos Monkey** (Netflix Simian Army) | Random instance termination — the original |
| **Chaos Mesh** | Kubernetes-native, CNCF, feature-rich (pod, network, IO, time chaos) |
| **Litmus** | Kubernetes-native, CNCF, "ChaosHub" library of experiments |
| **Gremlin** | Commercial SaaS — broad attack library, GUI |
| **AWS FIS** (Fault Injection Simulator) | AWS-native; good for EC2, ECS, EKS, RDS |
| **Azure Chaos Studio** | Azure-native counterpart |
| **GCP DTM** (Disruption Test Manager) | GCP-native |
| **Toxiproxy** (Shopify) | TCP-level network conditions (latency, timeout, slow close) — simple, scriptable |
| **stress-ng** | CPU / memory / IO / scheduler stressors at the host level |
| **tc / netem** (Linux) | Kernel-level latency, loss, reorder |
| **Pumba** | Docker chaos (kill / pause / netem on containers) |

**Chaos Mesh / Litmus experiment shape (Kubernetes):**

| Concept | Detail |
|---|---|
| Experiment CR (`PodChaos`, `NetworkChaos`, `IOChaos`, `TimeChaos`, `StressChaos`) | What to do |
| Selector (label / namespace / annotation) | Where to do it |
| Mode (`one`, `all`, `fixed`, `fixed-percent`, `random-max-percent`) | Scope |
| Duration | How long |
| Schedule | When (one-shot or cron) |
| Workflow | Chain experiments + pause + verify steps |

**Blast radius — the central safety idea:**

| Layer | Limiting tactic |
|---|---|
| Scope | One pod → one zone → one region (escalate slowly) |
| Concurrency | One experiment at a time |
| Time bound | Max duration; auto-rollback |
| Tenant filtering | One tenant only; never the whole fleet |
| Kill switch | A button / CR delete that stops everything immediately |
| Guardrail metrics | Auto-stop if SLO breaches (e.g. error rate > X % for Y minutes) |
| Dry run mode | Plan + dry-run before injecting |

**Maturity levels — where to start:**

| Level | What | Example |
|---|---|---|
| 0. Awareness | Talk about it; ask "what would happen if X failed?" | Architecture review |
| 1. Manual in non-prod | One engineer, staging, defined window | Kill one pod manually |
| 2. Automated in non-prod | Scheduled experiment in staging | Litmus / Chaos Mesh CronJob |
| 3. Manual in prod | Carefully scoped, observed | First production "pod kill" |
| 4. Automated in prod | Continuous, scoped, guardrailed | Chaos Monkey weekly |
| 5. Game days + chaos as release gate | Deploy gate runs chaos in canary | Mature SRE org |

**GameDay — the human side:**

| Element | Detail |
|---|---|
| Goal | Practice incident response with a *known* injected failure |
| Scenario | "us-east-1 is unreachable as of 09:00" — narrate to the on-call team |
| Roles | Game master (who broke it), responders (everyone else), observers |
| Outcome | Run-book gaps, tooling gaps, alert noise — captured as action items |
| Cadence | Quarterly is common; major architecture changes deserve a fresh game day |

**What chaos commonly uncovers:**

| Finding | Fix |
|---|---|
| Missing readiness probe | Add — pod gets traffic before ready |
| Liveness probe checks dependency | Move check to readiness; cascading restarts otherwise |
| Missing timeout on HTTP / DB call | Set explicit timeouts everywhere |
| No retry / no backoff / no jitter | Add resilience patterns |
| Single replica / single AZ | HA is a story you tell, not a state you have |
| Circuit breaker absent | Add; pair with fallback |
| Alert doesn't fire / fires too late | Tune thresholds; verify coverage |
| Run-book stale or wrong | Update + dry-run regularly |
| Cache cold-start meltdown | Pre-warm; tiered fallback |
| Secret rotation breaks running pods | Watch + reload pattern |
| DNS TTL too long | Reduce + use connection-level retries |

**Pre-flight checklist for any production experiment:**

| Check | Reason |
|---|---|
| Hypothesis written | Without one, you're just breaking things |
| Steady-state metrics defined and dashboarded | Know what "fine" looks like |
| Alerting verified working | The auto-abort can fire |
| Blast radius bounded | Selector + mode + duration + concurrency |
| Kill switch tested | One command must reliably stop it |
| Stakeholders informed | On-call, customer-facing, support |
| Time window in business hours | Humans available to respond |
| Rollback plan documented | What you do if it goes worse than expected |
| Post-mortem template ready | Capture findings while fresh |

**Anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| Running chaos in prod with no monitoring | Real outage, no insight |
| No hypothesis ("just see what breaks") | Every result is post-hoc rationalization |
| One huge experiment | Hard to attribute findings to causes |
| Experiments that bypass timeouts / retries | You're testing chaos, not the system's response |
| Skipping fixes between runs | Every run finds the same problem |
| Chaos as a punishment / blame exercise | Kills the culture; nothing gets reported next time |
| No kill switch | The blast radius will exceed plan eventually |

**Rule of thumb:** **start small (kill one pod), verify recovery, escalate slowly.** Every experiment needs a **hypothesis, a steady-state metric, a bounded blast radius, and a kill switch** — without all four, it's not chaos engineering, it's vandalism. **Fix what you find before running more experiments**, otherwise you're collecting findings nobody acts on. **Game days for the human side; automated chaos for the regression side.** The goal isn't to break things — it's to find out where they're already broken.
