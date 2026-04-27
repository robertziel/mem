### Kubernetes Probes (Liveness, Readiness, Startup)

**Three probe types:**

| Probe | Purpose | Failure action |
|-------|---------|----------------|
| **Liveness** | Is the container alive? | Restart container |
| **Readiness** | Can it serve traffic? | Remove from Service endpoints |
| **Startup** | Has it finished starting? | Block liveness/readiness until success |

**Liveness probe:**
- Detects deadlocks, hung processes
- Failure -> kubelet restarts the container
```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 15
  periodSeconds: 20
  failureThreshold: 3
```

**Readiness probe:**
- Detects temporary inability to serve (loading cache, DB connection lost)
- Failure -> pod removed from Service (no traffic), but NOT restarted
```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 5
  failureThreshold: 3
```

**Startup probe:**
- For slow-starting containers
- Until startup probe succeeds, liveness/readiness probes are disabled
```yaml
startupProbe:
  httpGet:
    path: /healthz
    port: 8080
  failureThreshold: 30
  periodSeconds: 10
  # Gives container up to 30 * 10 = 300 seconds to start
```

**Probe methods:**
```yaml
# HTTP GET (most common)
httpGet:
  path: /health
  port: 8080

# TCP socket (good for databases)
tcpSocket:
  port: 5432

# Exec command
exec:
  command: ["pg_isready", "-U", "postgres"]

# gRPC (K8s 1.24+)
grpc:
  port: 50051
```

**Common mistakes:**
- Liveness probe checks dependency (DB down -> all pods restart -> cascade failure)
- Missing readiness probe (pod receives traffic before ready)
- `initialDelaySeconds` too short (pod restart loop during startup)
- Not using startup probe for JVM/heavy apps (use startup probe instead of long initialDelay)

**Best practices:**
- Liveness: check only the process itself (not dependencies)
- Readiness: check if the pod can serve requests (including dependencies)
- Keep probe endpoints lightweight (no heavy DB queries)
- Use startup probe for apps that take >30s to start

**Rule of thumb:** Every production pod should have readiness + liveness probes. Liveness checks self-health only. Readiness checks ability to serve. Use startup probes for slow starters to avoid premature liveness kills.
