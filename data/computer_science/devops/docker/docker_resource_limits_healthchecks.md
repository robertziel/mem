### Docker — Resource Limits & Health Checks

**Limit categories — what you can constrain:**

| Resource | Knob (CLI) | Compose | Effect when exceeded |
|---|---|---|---|
| Memory | `--memory=512m` | `deploy.resources.limits.memory` | **OOM-killed** (exit 137) |
| Memory + swap | `--memory-swap=1g` | (Compose v2: `mem_swap_limit`) | Same — counts swap toward total |
| Memory reservation (soft) | `--memory-reservation=256m` | `deploy.resources.reservations.memory` | Hint for scheduler / soft limit |
| CPU shares (relative) | `--cpu-shares=1024` | (rare) | Weighted contention; not a cap |
| CPU quota (hard) | `--cpus=1.5` | `deploy.resources.limits.cpus` | **Throttled** (not killed) |
| CPU pinning | `--cpuset-cpus=0,1` | `cpuset` | Bind to specific cores |
| PIDs | `--pids-limit=100` | `pids_limit` | New `fork()` fails — prevents fork bombs |
| File descriptors | `--ulimit nofile=65536` | `ulimits` | Open-file limit |
| Block I/O | `--device-read-bps=/dev/sda:1mb` | `blkio_config` | Throttled |
| Network | (use traffic shaping outside Docker) | — | — |
| Tmpfs / shm | `--shm-size=256m` | `shm_size` | `/dev/shm` size |

**Memory limit behavior — important details:**

| Concept | Detail |
|---|---|
| Hard limit | Container is OOM-killed when exceeded |
| OOM exit code | **137** (= 128 + SIGKILL=9) |
| OOM score | Linux OOM-killer per-cgroup score; you can adjust with `--oom-score-adj` |
| Memory `--memory-swap` | Total of memory + swap; `-1` = unlimited swap (avoid in prod) |
| `--memory-swappiness=0` | Disable swap usage entirely for the container |
| Soft (reservation) vs hard | Hard wins; reservation is just hinting |
| **JVM gotcha** | JVM <11 didn't see cgroup limits; modern JVMs do (`-XX:+UseContainerSupport` default since 10) |
| **Node / Python gotcha** | Some libraries default to host CPU count — set `UV_THREADPOOL_SIZE`, `OMP_NUM_THREADS` explicitly |

**CPU limit behavior:**

| Concept | Detail |
|---|---|
| `--cpus=1.5` | Maps to `cpu.cfs_quota_us` and `cpu.cfs_period_us` |
| Throttling, not killing | Container slows down; processes don't die |
| Throttling visible in `cpu.stat` (`nr_throttled`, `throttled_time`) | Diagnose CPU starvation |
| `--cpu-shares` | Only matters under contention; relative weight |
| `--cpuset-cpus` | NUMA-aware pinning |

**Why every prod container needs limits:**

| Without limits | With limits |
|---|---|
| One runaway container can OOM the host | Bounded blast radius |
| Noisy neighbor contention | Predictable scheduling |
| Resource quota in K8s broken | Pod requests/limits actually enforced |
| Fork-bomb takes down the host | `pids-limit` saves you |

**Health checks — anatomy:**

| Field | Meaning | Default |
|---|---|---|
| `test` | The check command | (none) |
| `interval` | How often | 30 s |
| `timeout` | Per-check timeout | 30 s |
| `retries` | Consecutive failures before unhealthy | 3 |
| `start_period` | Grace at startup; failures don't count | 0 s |
| `start_interval` (newer) | Faster polling during startup | 5 s |

**`test` forms:**

| Form | Use |
|---|---|
| `["CMD", "curl", "-f", "http://localhost:3000/health"]` | No shell |
| `["CMD-SHELL", "curl -f $URL \|\| exit 1"]` | Shell features (env vars, pipes) |
| `["NONE"]` | Disable inherited healthcheck |
| Dockerfile: `HEALTHCHECK CMD …` | Image-level default |

**States:**

| State | Meaning |
|---|---|
| `starting` | Within `start_period` — failures ignored |
| `healthy` | Latest check passed |
| `unhealthy` | `retries` consecutive failures |

**Health-check design rules:**

| Rule | Why |
|---|---|
| Lightweight endpoint (`/healthz`) | Probe must not be a load source |
| Don't hit DB on liveness; do on readiness | Cascade-restart anti-pattern |
| `start_period` covers cold-start time | Avoid restart loops on heavy apps |
| Prefer language-native checks if no `curl`/`wget` in image | Distroless images don't have `curl` |
| Return JSON / structured if useful | Easier debug |
| Idempotent + stateless | Probe must not break the app |

**Distroless / scratch — checking without `curl`:**

| Approach | Detail |
|---|---|
| Static health binary in image | Tiny static Go binary that does the HTTP call |
| Built-in health command (e.g. `/app health`) | Same binary, sub-command |
| `wget` / `curl` not available | Don't assume — distroless skips them |
| Use **gRPC health checking protocol** | Standard health probes for gRPC services |

**Compose example — limits + health:**

```yaml
services:
  web:
    image: myapp:1.2.0
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.5"
        reservations:
          memory: 256M
          cpus: "0.5"
    pids_limit: 200
    healthcheck:
      test: ["CMD-SHELL", "/app health || exit 1"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
    restart: unless-stopped
```

**Restart policies:**

| Policy | Behavior |
|---|---|
| `no` (default) | Never restart |
| `on-failure[:max]` | Only on non-zero exit |
| `always` | Always — even after manual stop |
| `unless-stopped` | Like `always` but respects manual stop |
| K8s-equivalent | `restartPolicy: Always / OnFailure / Never` (Pod-level) |

**Monitoring resource usage:**

| Goal | Command |
|---|---|
| Live resource usage all containers | `docker stats` |
| Snapshot | `docker stats --no-stream` |
| Per-container | `docker stats <name>` |
| State + last exit code | `docker inspect <name> --format '{{.State.Status}}/{{.State.ExitCode}}'` |
| Last health-check log | `docker inspect <name> --format '{{json .State.Health}}' \| jq` |
| Detailed cgroup stats | `cat /sys/fs/cgroup/.../memory.stat` etc. |
| Top by memory | `docker stats --format 'table {{.Name}}\t{{.MemUsage}}'` |

**OOM-kill investigation:**

| Step | Command |
|---|---|
| Confirm OOM | Exit code 137; `dmesg \| grep -i oom` on the host |
| See which container | `docker ps -a` after the kill |
| Inspect last state | `docker inspect <name> --format '{{.State}}'` |
| Container's memory.stat at time of kill | (cgroup stats — sometimes preserved in journald) |
| Adjust | Either raise `--memory` or fix the leak |

**`depends_on` + health (Compose v3.x+):**

```yaml
services:
  db:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 10

  web:
    image: myapp
    depends_on:
      db:
        condition: service_healthy
```

| `condition` | Meaning |
|---|---|
| `service_started` | Container started (default) |
| `service_healthy` | Health check passed |
| `service_completed_successfully` | Exited 0 (for one-shot init containers) |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| No memory limit in production | One bug → host OOM → cascade |
| `--memory-swap=-1` (unlimited swap) | Container thrashes silently before crash |
| Liveness check hits the DB | Cascading restart on DB blip |
| `start_period` too short | Restart loop during cold start |
| Heavy probe on every interval | Probe becomes part of the load |
| `curl` in the image but you switch to distroless | Health check breaks silently |
| No `pids_limit` | Fork-bomb takes down host |
| `cpus` without monitoring `nr_throttled` | Quietly throttling production traffic |
| Exit 137 not understood | Investigators look for app crash, miss OOM |
| JVM `-Xmx` higher than `--memory` | Inevitable OOM kill |

**Sizing heuristics:**

| Workload | Starting points |
|---|---|
| Simple Node / Python web | 256 MB / 0.5 CPU |
| Java / JVM service | 512 MB – 2 GB / 1 CPU; respect `-Xmx` headroom |
| Database (small) | 1–4 GB / 1–2 CPU |
| Worker / batch | Tune from observed peak; add 30 % headroom |
| Sidecar (logger / mesh proxy) | 32–128 MB / 0.05–0.1 CPU |

**Kubernetes equivalents — for cross-reference:**

| Docker | Kubernetes |
|---|---|
| `--memory` | `resources.limits.memory` |
| `--memory-reservation` | `resources.requests.memory` |
| `--cpus` | `resources.limits.cpu` |
| `--cpu-shares` | `resources.requests.cpu` |
| `HEALTHCHECK` | `livenessProbe` + `readinessProbe` + `startupProbe` (different semantics — see [k8s_probes_*.md](../kubernetes/k8s_probes_liveness_readiness_startup_healthcheck.md)) |
| `--restart=on-failure` | `restartPolicy: OnFailure` |

> Docker's single `HEALTHCHECK` ≠ K8s probes. K8s splits liveness vs readiness vs startup. Docker treats unhealthy as informational only — it doesn't auto-restart the container by default.

**Quick checklist:**

| Check | Pass? |
|---|---|
| Memory limit set | ✅ |
| CPU limit set | ✅ |
| `pids_limit` for untrusted workloads | ✅ |
| Healthcheck defined and lightweight | ✅ |
| `start_period` covers real cold-start time | ✅ |
| Restart policy explicit | ✅ |
| OOM exit (137) playbook documented | ✅ |
| For distroless images, native health endpoint or `gRPC health` | ✅ |
| JVM `-Xmx` ≤ container memory limit | ✅ |
| No `cpus` cap below known workload requirement (causing throttling) | ✅ |

**Rule of thumb:** **always set memory + CPU limits** in production (and `pids_limit` for untrusted code). **Memory exceeded = exit 137; CPU exceeded = throttling, not death** — recognize these signals. **Healthchecks must be cheap and self-only** (no DB calls). **`start_period`** is the difference between "stable rollout" and "restart loop". For multi-container Compose, **`depends_on: condition: service_healthy`** is the right way to order startup.
