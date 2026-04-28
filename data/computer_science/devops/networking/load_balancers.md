### Load Balancers — L4 vs L7, Algorithms, AWS LBs

**Definition:** a **load balancer** distributes traffic across backend servers. **L4 (TCP/UDP)** routes packets based on IP/port; **L7 (HTTP)** routes based on URL, headers, cookies. AWS offers **ALB** (L7), **NLB** (L4), and **CLB** (legacy). Pick L4 for raw TCP, L7 for HTTP.

**Side-by-side: L4 vs L7:**

| Feature | **L4 (Transport)** | **L7 (Application)** |
|---|---|---|
| Operates on | TCP/UDP packets | HTTP requests |
| Routing | IP + port | URL, headers, cookies, method |
| TLS | Pass-through OR terminate | Typically terminates |
| Performance | **Faster** (less inspection) | More overhead |
| Path-based routing | ❌ | ✅ |
| Host-based routing | ❌ | ✅ |
| WebSocket / gRPC awareness | Partial | Full |
| Examples | NLB, HAProxy TCP, IPVS | ALB, NGINX, Traefik, Envoy |

**Load balancing algorithms:**

| Algorithm | Detail | Use |
|---|---|---|
| **Round Robin** | Rotate sequentially | Equal-capacity backends |
| **Weighted Round Robin** | Proportional to weight | Different-capacity backends |
| **Least Connections** | Send to least-busy backend | Long-lived connections (DBs, WebSocket) |
| **Least Response Time** | Fastest-responding backend | Latency-sensitive |
| **IP Hash** | Same client → same backend | Sticky-ish (no app changes) |
| **Random** | Pick random | Simple, surprisingly OK at scale |
| **P2C (Power of 2 Choices)** | Pick 2 random, send to less-loaded | Low overhead, near-optimal |
| **Consistent hashing** | Hash → ring | Caching layers, shard awareness |

**Health checks:**

| Type | Detail |
|---|---|
| **Active** | LB pings `/health` periodically |
| **Passive** | LB observes traffic; eject on failures |
| Healthy threshold | N consecutive successes to register |
| Unhealthy threshold | N consecutive failures to deregister |
| Connection draining | Finish in-flight requests before removing backend |
| Cross-zone | Distribute evenly across AZs |

**AWS load balancers:**

| LB | Layer | Best for |
|---|---|---|
| **ALB (Application)** | L7 | HTTP/HTTPS, path/host routing, WebSocket, gRPC |
| **NLB (Network)** | L4 | TCP/UDP, ultra-low latency, static IPs, TLS pass-through |
| **GWLB (Gateway)** | L3/L4 | Network appliances (firewalls, IDS) |
| **CLB (Classic)** | L4 + L7 | **Legacy** — avoid for new workloads |

**ALB — feature highlights:**

| Feature | Detail |
|---|---|
| Path-based routing | `/api/*` → service A, `/web/*` → service B |
| Host-based routing | `api.example.com` → ALB target group A |
| WebSocket | Native support |
| gRPC | Native support |
| HTTP/2 to clients | Improved performance |
| Listener rules | Route by header / method / source IP |
| Authentication (OIDC, Cognito) | Built-in auth at LB |
| Sticky sessions | Cookie-based |
| Lambda targets | Invoke Lambda directly |
| Containers (ECS / EKS) | Dynamic port mapping |

**NLB — feature highlights:**

| Feature | Detail |
|---|---|
| Ultra-low latency | Single-digit ms |
| Millions of requests/sec | Massive scale |
| **Static IPs / Elastic IPs per AZ** | Predictable for whitelisting |
| TLS termination OR pass-through | Either way |
| TCP, UDP, TLS protocols | L4 |
| Preserves source IP | True client IP visible |
| Cross-zone load balancing | Optional (extra cost) |
| Use case | Gaming, streaming, IoT, non-HTTP |

**TLS termination — three modes:**

| Mode | Where TLS ends | Pros | Cons |
|---|---|---|---|
| **TLS termination at LB** | LB | Backend gets plain HTTP; lower CPU on backend | Backend doesn't see client cert |
| **TLS pass-through** | Backend | End-to-end encryption | Backend handles certs |
| **Re-encrypt** (terminate + re-encrypt) | Both | Inspect + still encrypted to backend | Two TLS handshakes |

**Sticky sessions — usually avoid:**

| Property | Detail |
|---|---|
| Routes same client to same backend | Cookie or IP hash |
| Use case | Legacy apps with in-memory session |
| **Drawback** | Defeats horizontal scaling, replica failure = sessions lost |
| Better | Stateless app + Redis sessions |

**Connection draining (graceful removal):**

| Phase | Action |
|---|---|
| 1. Mark backend "draining" | Stop new connections |
| 2. Wait for in-flight | Up to drain timeout (~30–300s) |
| 3. Force close | Past timeout |
| Mode | "Deregistration delay" in ALB/NLB |

**Cross-zone load balancing:**

| Setting | Effect |
|---|---|
| **Enabled** | Distributes evenly across AZs (good for capacity) |
| **Disabled** | Each AZ's LB only routes within AZ (cheaper, less even) |
| ALB | Always cross-zone (no choice) |
| NLB | Optional; cross-AZ data fees apply |

**Common LB patterns:**

| Pattern | Detail |
|---|---|
| **Public ALB → app pods** | Standard web app |
| **Public ALB + WAF** | Layered security |
| **Internal ALB → backend services** | Inside-VPC service routing |
| **NLB → custom protocol** | Game servers, MQTT brokers |
| **NLB → ECS Fargate w/ static IPs** | Compliance / firewalling |
| **Global Accelerator → NLB(s)** | Anycast for low-latency global |
| **CloudFront → ALB** | CDN + LB combo |

**Decision matrix:**

| Need | Pick |
|---|---|
| HTTP / HTTPS workload | **ALB** |
| Need static IP for client whitelisting | **NLB** (or ALB w/ NLB sandwich) |
| TCP / UDP traffic (non-HTTP) | **NLB** |
| Ultra-low latency | **NLB** |
| Path / host routing | **ALB** |
| WebSocket | **ALB** (or NLB pass-through) |
| Lambda backend | **ALB** |
| Inspection / firewall integration | **GWLB** |
| Legacy stuff | **CLB** (migrate when possible) |

**LB anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| Sticky sessions for stateless apps | Defeats scaling |
| No health checks | Routes to dead servers |
| Health check too lax | Bad pods serve traffic |
| Health check too aggressive | Flapping |
| TLS pass-through when you want WAF | Can't inspect |
| Cross-zone disabled with imbalanced AZs | Hot AZ |
| Using CLB for new workloads | Missing modern features |
| `0.0.0.0/0` SG on backend | LB SG bypass |
| Backend health check that's "process running" | Doesn't catch real issues |
| One huge target group instead of multiple | No granular routing |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Forgetting `/health` endpoint | LB removes all backends |
| Sticky sessions hiding real issues | Sessions glue up |
| TLS termination at LB without HSTS | Browsers downgrade later |
| Running stateful backend behind LB | Sessions lost on failover |
| Ignoring `X-Forwarded-For` | Client IP wrong |
| Misconfigured SGs | LB can't reach backend |
| `Connection: close` from backend | Defeats keep-alive |

**Cross-references:**

- Load balancer + API gateway + BFF: [load_balancing_*.md](../../system_design_hld_high_level_design/fundamentals/load_balancing_api_gateway_bff_service_discovery.md)
- Route 53 + DNS: [aws_route53_*.md](../cloud_aws/aws_route53_dns_routing_policies_health_checks_alias.md)
- VPC + subnets: [vpc_subnets_*.md](vpc_subnets_security_groups.md)
- TLS / HTTPS: [tls_*.md](../../web_security/tls_https_cipher_suites_certificate_validation.md)

**Rule of thumb:** **ALB for HTTP, NLB for TCP/UDP/ultra-low-latency, GWLB for inspection.** Avoid **sticky sessions** — make apps stateless and store sessions in Redis. Always configure **active health checks** with a dedicated `/health` endpoint. **TLS termination at LB** is the common case (offload CPU); use **pass-through** only when end-to-end encryption is required.
