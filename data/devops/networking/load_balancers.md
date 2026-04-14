### Load Balancers

**L4 vs L7 load balancers:**

| Feature | L4 (Transport) | L7 (Application) |
|---------|----------------|-------------------|
| Operates on | TCP/UDP packets | HTTP requests |
| Routing | IP + port | URL, headers, cookies |
| TLS termination | Pass-through or terminate | Typically terminates |
| Performance | Faster (less inspection) | More overhead |
| Examples | NLB, HAProxy TCP | ALB, Nginx, Traefik |

**Algorithms:**
- **Round Robin** - rotate sequentially
- **Weighted Round Robin** - proportional to weight
- **Least Connections** - send to least busy backend
- **IP Hash** - consistent routing by client IP (sticky)
- **Random** - simple, surprisingly effective at scale

**Health checks:**
- **Active** - LB periodically hits a health endpoint
- **Passive** - LB monitors real traffic for errors
- Unhealthy threshold: N consecutive failures to deregister
- Healthy threshold: N consecutive successes to re-register

**AWS load balancers:**
- **ALB** (Application) - L7, HTTP/HTTPS, path/host routing, WebSocket, gRPC
- **NLB** (Network) - L4, TCP/UDP, ultra-low latency, static IPs, TLS pass-through
- **CLB** (Classic) - legacy, avoid for new workloads

**Key concepts:**
- **TLS termination** - LB decrypts HTTPS, forwards HTTP to backends (offloads CPU)
- **TLS pass-through** - LB forwards encrypted traffic, backend decrypts (end-to-end encryption)
- **Sticky sessions** - route same client to same backend (avoid if possible, breaks scaling)
- **Connection draining** - finish in-flight requests before removing backend
- **Cross-zone** - distribute across AZs evenly

**Rule of thumb:** Use ALB for HTTP workloads, NLB for TCP/non-HTTP or when you need static IPs. Avoid sticky sessions. Always configure health checks with a dedicated `/health` endpoint.
