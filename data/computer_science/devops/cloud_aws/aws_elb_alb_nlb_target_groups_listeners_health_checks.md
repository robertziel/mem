### AWS ELB: ALB vs NLB Deep Dive

**Three load balancer types:**
| Feature | ALB (Application) | NLB (Network) | CLB (Classic) |
|---------|-------------------|---------------|---------------|
| Layer | L7 (HTTP/HTTPS) | L4 (TCP/UDP/TLS) | L4 + L7 |
| Routing | Path, host, header, method, query | Port-based only | Basic |
| Performance | Good | Ultra-low latency | Legacy |
| Static IP | No (use Global Accelerator) | Yes (one per AZ) | No |
| WebSocket | Yes | Yes (pass-through) | No |
| gRPC | Yes | Pass-through | No |
| TLS termination | Yes | Yes or pass-through | Yes |
| Use | Web apps, APIs, microservices | TCP, gaming, IoT, extreme perf | Don't use (legacy) |

**ALB components:**
```
Internet → [ALB]
             ├── Listener (HTTPS :443)
             │     ├── Rule: Host = api.example.com → Target Group: api-tg
             │     ├── Rule: Path = /admin/*        → Target Group: admin-tg
             │     └── Default                      → Target Group: web-tg
             └── Listener (HTTP :80)
                   └── Redirect to HTTPS :443
```

**Target Groups:**
```
Target Group: api-tg
  Type: instance | ip | lambda
  Protocol: HTTP
  Port: 8080
  Health check: GET /health (interval 30s, threshold 3)
  Targets:
    - i-abc123 (healthy)
    - i-def456 (healthy)
    - i-ghi789 (draining)
```

**Target types:**
| Type | Routes to | Use case |
|------|-----------|----------|
| instance | EC2 instance ID + port | EC2, ASG |
| ip | IP address + port | ECS Fargate, private IPs, on-prem |
| lambda | Lambda function | Serverless |

**ALB routing rules (powerful):**
```
# Host-based
IF Host = api.example.com → Forward to api-tg
IF Host = admin.example.com → Forward to admin-tg

# Path-based
IF Path = /api/* → Forward to api-tg
IF Path = /static/* → Return fixed 200 response

# Header/query string
IF Header X-Custom = "beta" → Forward to beta-tg
IF Query string version=2 → Forward to v2-tg

# Weighted (canary deploy)
Forward: 90% to stable-tg, 10% to canary-tg
```

**Health checks:**
```
Protocol: HTTP
Path: /health
Port: traffic-port (same as target)
Healthy threshold: 3 consecutive successes
Unhealthy threshold: 3 consecutive failures
Interval: 30 seconds
Timeout: 5 seconds
Success codes: 200-299
```

**Connection draining (deregistration delay):**
- When target is removed, finish in-flight requests before stopping
- Default: 300 seconds
- Set lower (30-60s) for fast deployments

**NLB specifics:**
- Handles millions of requests/sec with ultra-low latency
- Preserves client source IP (ALB uses X-Forwarded-For header)
- Static IP per AZ (or Elastic IP) — good for allowlisting
- TLS pass-through: client ↔ backend encrypted, NLB doesn't decrypt

**Cross-zone load balancing:**
- ALB: enabled by default (free)
- NLB: disabled by default (costs extra when enabled)
- Distributes traffic evenly across all targets in all AZs

**Sticky sessions (session affinity):**
```
ALB: cookie-based (application or duration-based)
NLB: source IP affinity

Avoid sticky sessions when possible (breaks even distribution, hurts scaling).
Use external session store (Redis) instead.
```

**Rule of thumb:** ALB for HTTP workloads (path/host routing, WebSocket, gRPC). NLB for TCP/UDP, static IPs, or extreme performance. Always configure health checks with a dedicated `/health` endpoint. Set deregistration delay to 30-60s for fast deploys. Avoid sticky sessions — use Redis for sessions.
