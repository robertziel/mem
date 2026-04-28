### Kubernetes Deployments, ReplicaSets & Workload Resources

**Hierarchy — what manages what:**

| Resource | Manages | Lifetime |
|---|---|---|
| **Deployment** | ReplicaSets | One per app version |
| **ReplicaSet** | Pods (replicas) | One per Deployment revision |
| **Pod** | Containers | Ephemeral |

> You almost never create a `ReplicaSet` directly. Edit the Deployment; it creates / scales / replaces RSes for you.

**Workload resource — pick by shape:**

| Resource | Use for | Pod identity | Strategy |
|---|---|---|---|
| **Deployment** | Stateless apps (web, API, workers) | Interchangeable | Rolling / Recreate |
| **StatefulSet** | Stateful apps (DB, Kafka, ZK) | **Stable hostname + persistent volume per replica** | Ordered roll, stable identity |
| **DaemonSet** | One (or N) pods **per node** (log shipper, CNI, node-exporter) | Per-node | Rolling |
| **Job** | Run to completion (batch, migration) | Disposable | Parallelism + completion count |
| **CronJob** | Job on a schedule | Disposable | cron expression |
| **ReplicaSet** | Plain replicas, no rollout strategy | Interchangeable | Just maintains count — almost never used directly |
| **ReplicationController** | Legacy ancestor of ReplicaSet | — | Don't use — superseded |

**Deployment skeleton:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: web }
spec:
  replicas: 3
  selector:
    matchLabels: { app: web }
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata: { labels: { app: web } }
    spec:
      containers:
        - name: web
          image: myapp:1.2.0
          ports: [{ containerPort: 8080 }]
          readinessProbe:
            httpGet: { path: /ready, port: 8080 }
          livenessProbe:
            httpGet: { path: /healthz, port: 8080 }
          resources:
            requests: { cpu: "100m", memory: "256Mi" }
            limits:   { cpu: "1",    memory: "512Mi" }
```

**Update strategies:**

| Strategy | Behavior | Use when |
|---|---|---|
| **RollingUpdate** (default) | Gradually replaces pods; controlled by `maxSurge` + `maxUnavailable` | Almost always |
| **Recreate** | Terminate all old pods, then create new ones | Stateful migrations that **can't tolerate two versions** running simultaneously; brief downtime |

**Rolling update knobs:**

| Knob | Meaning | Common values |
|---|---|---|
| `maxSurge` | Max pods above desired during update | `1`, `25%`, or higher for fast rollouts |
| `maxUnavailable` | Max pods below desired during update | `0` for zero-downtime, `1`+ for faster |
| `progressDeadlineSeconds` | Mark rollout failed if no progress in N seconds | `600` (10 min) typical |
| `revisionHistoryLimit` | Old ReplicaSets kept for rollback | `10` default; lower in big clusters |
| `minReadySeconds` | Pod must be ready for N seconds before counted | `10`–`30` for cautious rollouts |

> **Zero-downtime baseline:** `maxSurge: 1` + `maxUnavailable: 0`.
> **Fast rollouts:** `maxSurge: 25%` + `maxUnavailable: 25%` (accepts a brief capacity dip).

**Pod-template hash & rollout mechanics:**

| Step | Detail |
|---|---|
| 1 | You change the pod template (image, env, command) |
| 2 | Deployment computes a new `pod-template-hash` |
| 3 | New ReplicaSet `web-<newhash>` created with `replicas: 0` |
| 4 | Scale new RS up by `maxSurge`; scale old RS down respecting `maxUnavailable` |
| 5 | Each new pod must hit `Ready` (readinessProbe) before old pods can be removed |
| 6 | When new RS reaches desired replicas and old RS reaches 0, rollout completes |
| 7 | Old RS retained (per `revisionHistoryLimit`) for rollback |

**`kubectl rollout` toolkit:**

| Command | What |
|---|---|
| `kubectl rollout status deployment/web` | Watch rollout — exits non-zero on failure |
| `kubectl rollout history deployment/web` | List revisions |
| `kubectl rollout history deployment/web --revision=3` | Diff a specific revision |
| `kubectl rollout undo deployment/web` | Revert to previous |
| `kubectl rollout undo deployment/web --to-revision=2` | Revert to specific |
| `kubectl rollout pause deployment/web` | Pause mid-rollout |
| `kubectl rollout resume deployment/web` | Resume |
| `kubectl rollout restart deployment/web` | Trigger restart without changing the spec (rolls all pods) |

**Restart without spec change** = handy when you need fresh pods without bumping image tag (e.g. config in a mounted ConfigMap that you reloaded).

**Scaling:**

| Method | When |
|---|---|
| `kubectl scale deployment/web --replicas=5` | Manual |
| Edit `replicas` in YAML, `kubectl apply` | GitOps-friendly |
| `HorizontalPodAutoscaler` | Reactive scaling on metrics |
| `KEDA` | Event-driven (Kafka lag, queue depth, cron) |
| Cluster Autoscaler / Karpenter | Adds nodes when pods can't schedule |

**Selectors and labels — the binding glue:**

| Selector | Purpose |
|---|---|
| `Deployment.spec.selector.matchLabels` | Must match pod template labels (immutable after create) |
| `Service.spec.selector` | Routes traffic to matching pod labels |
| `NetworkPolicy.spec.podSelector` | Targets pods to apply policy |
| `HPA.spec.scaleTargetRef` | Names the Deployment |

> **`spec.selector.matchLabels` is immutable.** Plan label keys carefully — to change them you must recreate the Deployment.

**Pod template — what every prod pod should have:**

| Setting | Why |
|---|---|
| `resources.requests` (CPU + memory) | Scheduler needs this to place pods correctly |
| `resources.limits` | Prevent noisy-neighbor blowup |
| `readinessProbe` | Control when traffic starts flowing |
| `livenessProbe` | Detect deadlock; restart |
| `startupProbe` (slow-start apps) | Don't kill cold pods |
| `terminationGracePeriodSeconds` | Time to drain before SIGKILL |
| `lifecycle.preStop` | Sleep / signal before SIGTERM for graceful shutdown |
| `securityContext` (`runAsNonRoot`, `readOnlyRootFilesystem`, `allowPrivilegeEscalation: false`) | Hardening defaults |
| `topologySpreadConstraints` | Spread across zones / nodes |
| `affinity` / `antiAffinity` | Co-locate or separate replicas |

**Graceful shutdown — the dance with the Service:**

| Step | What happens |
|---|---|
| 1 | Pod marked for deletion |
| 2 | Endpoint controller removes pod IP from Service endpoints (~seconds; not instant) |
| 3 | Kubelet runs `preStop` hook |
| 4 | Kubelet sends `SIGTERM` to PID 1 |
| 5 | App stops accepting new connections; finishes in-flight requests |
| 6 | After `terminationGracePeriodSeconds`, kubelet sends `SIGKILL` |

> Add `lifecycle.preStop: { exec: { command: ["sh","-c","sleep 5"] } }` to give the LB time to stop sending traffic before your app receives SIGTERM.

**Deployment vs StatefulSet — at-a-glance:**

| | **Deployment** | **StatefulSet** |
|---|---|---|
| Pod name | Random suffix (`web-78ab5-xyz`) | Stable ordinal (`db-0`, `db-1`, `db-2`) |
| Pod identity | Interchangeable | Stable across restarts |
| Storage | Optional, shared | Per-replica PVC via `volumeClaimTemplates` |
| Rollout order | Parallel | Ordered (`db-0` first up, last down) |
| Scaling | Any order | Ordered |
| Network identity | None | Headless Service + per-pod DNS |
| Use for | Stateless apps | Databases, queues, anything with disk-pinned state |

**DaemonSet specifics:**

| Property | Detail |
|---|---|
| Scheduling | One pod per node matching `nodeSelector` / `affinity` / `tolerations` |
| Auto-adapts | New node joins → DaemonSet pod auto-scheduled |
| Use for | log shippers (Fluentd, Filebeat), node monitoring (node-exporter), CNI agents (Calico, Cilium), CSI drivers, security agents (Falco) |
| Rolling update | `RollingUpdate` strategy with `maxUnavailable` |
| Tolerations | Often need to tolerate node taints to run on control plane / GPU nodes |

**Job & CronJob — run-to-completion:**

| Resource | Detail |
|---|---|
| `Job.spec.completions` | How many successful pods needed (`null` = parallel until N) |
| `Job.spec.parallelism` | Max concurrent pods |
| `Job.spec.backoffLimit` | Retries before marking failed |
| `Job.spec.activeDeadlineSeconds` | Hard time limit |
| `CronJob.spec.schedule` | Cron expression (UTC by default in K8s ≤ 1.27; can set `timeZone`) |
| `concurrencyPolicy` | `Allow` / `Forbid` / `Replace` |
| `successfulJobsHistoryLimit` / `failedJobsHistoryLimit` | How many old Jobs to keep |
| `startingDeadlineSeconds` | Skip if scheduler is too late |

**Common patterns:**

| Pattern | Use |
|---|---|
| **Sidecar container** | Logging / proxy alongside main app — `spec.containers[]` (multi-container pod) |
| **Init container** | Wait for DB / seed data / fetch config — `spec.initContainers[]` |
| **Ephemeral container** | Live-debug a running pod (`kubectl debug`) without restart |
| **Topology spread** | One replica per zone for HA |
| **Pod anti-affinity** | "Don't put two replicas on the same node" |
| **PriorityClass** | System-critical pods evict others under pressure |
| **Resource quotas + LimitRange** | Per-namespace caps |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| No `readinessProbe` | Traffic flows to pods that aren't ready → 5xx during rollouts |
| Liveness probe checks DB (cascading) | Pods restart on every DB blip — see [k8s_probes_*](k8s_probes_liveness_readiness_startup_healthcheck.md) |
| `latest` tag in image | Rolling update doesn't actually pull new image; can't roll back deterministically |
| `imagePullPolicy: Always` with no tag pinning | Same problem |
| Changing `selector.matchLabels` after create | Errors — must recreate Deployment |
| `maxUnavailable: 50%` on a 2-replica Deployment | Can drop to 1 replica during update |
| No `revisionHistoryLimit` cap | etcd bloat from old ReplicaSets |
| No `topologySpreadConstraints` | All replicas on one node → AZ outage takes everyone down |
| Resource `limits` set, `requests` missing | Scheduler bin-packs without budget → OOM under pressure |
| Rolling restart without `minReadySeconds` | Flaps if cold-start fails first probe |
| StatefulSet for stateless app | Slower rollout, harder updates — use Deployment |
| Deployment for stateful app | No stable identity, no per-replica volume — use StatefulSet |

**Quick health checks:**

| Command | What it shows |
|---|---|
| `kubectl get deploy` | Replicas / available / up-to-date |
| `kubectl describe deploy/web` | Events, conditions, rollout history |
| `kubectl get rs -l app=web` | All ReplicaSets for the Deployment (one per revision) |
| `kubectl get pods -l app=web --watch` | Pod-by-pod rollout progress |
| `kubectl rollout status deploy/web --timeout=10m` | Block until rollout completes (CI gate) |
| `kubectl logs deploy/web --tail=100 -f` | Tail aggregated pod logs |
| `kubectl top pods -l app=web` | CPU / memory usage |

**Decision shortcuts:**

| Need | Pick |
|---|---|
| Stateless web/API | Deployment |
| Stateful with stable identity + per-replica disk | StatefulSet |
| One pod per node | DaemonSet |
| Run once and finish | Job |
| Run on a schedule | CronJob |
| Rolling out across multi-cluster | Argo Rollouts / Flagger (canary, blue/green analyses) |
| Need progressive delivery (canary, A/B, mirror) | Argo Rollouts / Flagger |

**Rule of thumb:** **Deployment for anything stateless** with `RollingUpdate`, `maxSurge: 1`, `maxUnavailable: 0`. Always set **resources, probes, securityContext, topologySpreadConstraints**. Pin images by digest or immutable tag — **never `latest` in production**. Use **`kubectl rollout`** for everything you can express that way (status / undo / restart). For richer canary / blue-green flows, reach for **Argo Rollouts or Flagger**.
