### Kubernetes Probes (Liveness, Readiness, Startup)

**Three probes — different jobs, different failure consequences:**

| Probe | Question it answers | On failure |
|---|---|---|
| **Liveness** | Is the container *alive* (not deadlocked)? | **Restart container** |
| **Readiness** | Can it *serve traffic* right now? | **Remove from Service endpoints** (traffic stops; pod stays running) |
| **Startup** | Has it *finished starting up*? | While failing, liveness + readiness are **suspended** |

> The single most-confused pair is **liveness vs readiness**: liveness *kills*, readiness *isolates*. Pick the wrong one and you cascade-restart the cluster.

**What each probe should check:**

| Probe | Check **only** | Don't check |
|---|---|---|
| **Liveness** | The process's own internal state — request loop alive, threads not deadlocked | DB / cache / external services — those failing should not kill your pod |
| **Readiness** | Everything required to serve a request — including DB pool, cache warm, queues drained | (cheap, in-process checks only — don't make probe itself heavy) |
| **Startup** | Same as liveness, but with much higher patience | — |

**Probe methods:**

| Method | When to use | Example |
|---|---|---|
| `httpGet` | HTTP services (most common) | `path: /healthz, port: 8080` |
| `tcpSocket` | Non-HTTP services (DB, broker) | `port: 5432` — just verify socket accepts |
| `exec` | Custom check inside the container | `command: ["pg_isready"]` — costs a process fork each probe |
| `grpc` (k8s 1.24+, GA in 1.27) | gRPC services | `port: 50051, service: ""` (uses gRPC health protocol) |

**Probe configuration knobs:**

| Knob | Default | What it does |
|---|---|---|
| `initialDelaySeconds` | 0 | Wait this long after container start before first probe |
| `periodSeconds` | 10 | Probe every N seconds |
| `timeoutSeconds` | 1 | Probe call must respond within N seconds |
| `successThreshold` | 1 | Consecutive successes to flip back to "passing" (must be 1 for liveness/startup) |
| `failureThreshold` | 3 | Consecutive failures before action |
| `terminationGracePeriodSeconds` (probe-level, 1.25+) | inherits pod's | Override grace on liveness-induced kill |

**Effective time budget:** **`initialDelaySeconds + (failureThreshold × periodSeconds)`** is how long a pod has before action.

**Startup probe vs `initialDelaySeconds` — pick the right tool:**

| Need | Use |
|---|---|
| Container ready in seconds | `initialDelaySeconds` on liveness/readiness |
| Container takes 30 s – many minutes to start (JVM, big model load) | **Startup probe** — gives generous budget without weakening steady-state liveness |
| Variable / unpredictable startup time | **Startup probe** with high `failureThreshold` |

**Startup probe example — total patience = `failureThreshold × periodSeconds`:**

```yaml
startupProbe:
  httpGet: { path: /healthz, port: 8080 }
  periodSeconds: 10
  failureThreshold: 30        # 30 × 10 s = 5 min before kubelet gives up
livenessProbe:
  httpGet: { path: /healthz, port: 8080 }
  periodSeconds: 10
  failureThreshold: 3         # only kicks in AFTER startup passed
```

**The classic anti-pattern — liveness checks a dependency:**

```yaml
# ❌ Liveness checks DB connection — if DB blips, every pod restarts → cascade
livenessProbe:
  exec: { command: ["sh", "-c", "psql -c 'SELECT 1'"] }
```

| Problem | Why it cascades |
|---|---|
| DB momentarily unavailable | All pods fail liveness simultaneously |
| All pods restart | Reconnect storms hit the recovering DB |
| New pods fail liveness too | Restart loop |
| Cluster-wide outage from a transient blip | A self-inflicted incident |

> Move dependency checks to **readiness**: pods stay running, traffic drains, no cascade. Only **internal** state belongs in liveness.

**Readiness gates (advanced):**

| Concept | Detail |
|---|---|
| `readinessGates` | Pod-level conditions beyond the probe (e.g. external load balancer registration) |
| LB-readiness gate | `target-health.alb.ingress.k8s.aws/...` — pod isn't "ready" until ALB sees target healthy |
| Use case | Avoid traffic before LB has registered the pod |

**Probe interaction with `terminationGracePeriodSeconds`:**

| Phase | What happens |
|---|---|
| Pod marked for deletion | `SIGTERM` to PID 1; **readiness probe results are ignored** but liveness still applies |
| Application-level "draining" | Set readiness to fail before SIGTERM (preStop hook) so traffic stops first |
| Grace timer expires | `SIGKILL` |

**`preStop` hook + readiness — graceful shutdown pattern:**

```yaml
lifecycle:
  preStop:
    exec:
      command: ["/bin/sh", "-c", "sleep 5"]   # let LB notice readiness drop first
```

| Why | Effect |
|---|---|
| `preStop` runs *before* SIGTERM | Buys a few seconds for endpoint propagation |
| Readiness can't fail-fast on its own during termination | preStop sleep is the practical pattern |

**Probe endpoint design — keep it cheap:**

| Bad | Good |
|---|---|
| `SELECT count(*) FROM users` (DB hit per probe) | In-memory bool flipped by background health-check thread |
| Calls upstream APIs | Cached health status |
| Returns 200 always | Returns a real status code |
| Locks shared resources | Read-only on cached state |
| Massive JSON payload | Minimal `200 OK` body |

**HTTP status semantics:**

| Status | Treated as |
|---|---|
| 200–399 | Pass |
| ≥ 400 (and timeouts / connection errors) | Fail |
| Network unreachable | Fail |

**Service vs Ingress vs LB vs probe interaction:**

| Layer | Probe role |
|---|---|
| Service endpoints | Maintained from **readiness** probe |
| Ingress controller | Reads endpoints; only routes to ready pods |
| Cloud LB target group | May have its own health check independent of K8s probe — keep them aligned |
| HPA | Scales based on metrics; doesn't directly use probes, but a not-ready pod doesn't count as utilized capacity |

**Common mistakes:**

| Mistake | Effect |
|---|---|
| Liveness checks a dependency | Cascade restarts on dependency blip |
| No readiness probe | Pod gets traffic before it's ready → 5xx during rollouts |
| `initialDelaySeconds` too short for slow-starting app | Restart loop during startup |
| Same `initialDelaySeconds` for liveness as for readiness | App killed during cold start |
| Heavy probe endpoint | Probe itself becomes a load source |
| `periodSeconds` too short | DDoS your own service with probes |
| `successThreshold > 1` on liveness | Invalid — must be 1; will fail validation |
| Liveness with `failureThreshold: 1` | Single transient blip = restart |
| Probe path requires auth | Kubelet can't auth → fails forever |
| Forgetting startup probe for JVM apps | Liveness fires during long warmup, restart loop |

**Quick decision matrix:**

| Scenario | Liveness | Readiness | Startup |
|---|---|---|---|
| Stateless web service, < 5 s startup | ✅ self-only | ✅ + DB pool | — |
| Slow JVM (30 s+ startup) | ✅ self-only | ✅ + deps | ✅ generous |
| Worker / queue consumer (no traffic) | ✅ self-only | ❌ (no Service) | If slow start |
| Database container | ✅ TCP/exec | ✅ `pg_isready` | ✅ if init takes time |
| Sidecar that registers with control plane | ✅ self-only | ✅ until registration done | If slow |

**Rule of thumb:** **every production pod has readiness + liveness; add startup if start > 30 s.** **Liveness checks the process itself only**, never dependencies — that's how cascades happen. **Readiness includes dependencies** — failing readiness drains traffic without restarting. **Startup probes replace long `initialDelaySeconds`** for slow boot. **Probe endpoints must be cheap** — they run constantly. **Pair `preStop` sleep with readiness** for graceful shutdown.
