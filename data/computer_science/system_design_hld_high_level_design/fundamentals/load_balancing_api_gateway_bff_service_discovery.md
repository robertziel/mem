### Load Balancing, API Gateway, BFF, Service Discovery

**Definition:** four overlapping concepts at the boundary of a distributed system. **Load balancers** distribute traffic across replicas; **API gateways** add auth/routing/transformation; **BFFs** are gateways tailored per client; **service discovery** finds where services live in a dynamic environment.

**Side-by-side: API Gateway vs Load Balancer:**

| Feature | API Gateway | Load Balancer |
|---|---|---|
| OSI layer | L7 (application) | L4 or L7 |
| Routing | Path / header / method | Round-robin / least-conn |
| Auth | ✅ JWT, API keys, OIDC | ❌ |
| Rate limiting | ✅ Per-key/user | Basic (per-IP) |
| Request transformation | ✅ Rewrite paths, headers | ❌ |
| TLS termination | Often | Often |
| Service mesh integration | Yes | Limited |
| Examples | Kong, AWS API Gateway, Apigee, Envoy, Tyk | ALB, NLB, HAProxy, NGINX |

**Load balancer types:**

| Type | OSI | Behavior |
|---|---|---|
| **L4** (TCP / UDP) | Layer 4 | Routes packets; no awareness of HTTP |
| **L7** (HTTP / HTTPS) | Layer 7 | Path/host/header-aware routing |
| **DNS-based** (Route53, geo) | Layer 7 | Round-robin or geo at DNS level |
| **Anycast** | Network | Same IP from multiple locations |

**L4 vs L7 trade-off:**

| Property | L4 | L7 |
|---|---|---|
| Speed | Faster (no parsing) | Slower (HTTP parse) |
| Routing flexibility | IP / port only | URL, header, body |
| TLS | Pass-through | Termination + re-encrypt |
| Health checks | TCP open / port | HTTP status codes |
| Use case | Raw TCP services | HTTP APIs |

**Load balancing algorithms:**

| Algorithm | Detail |
|---|---|
| **Round-robin** | Fair, simple |
| **Weighted round-robin** | Different capacities per backend |
| **Least connections** | Backend with fewest active conns |
| **Least response time** | Fastest-responding backend |
| **IP hash** | Same client always hits same backend (sticky-ish) |
| **Consistent hash** | Cache-friendly, minimal disruption on resize |
| **Random with two choices (P2C)** | Pick 2 random, choose less loaded — surprisingly good |

**API Gateway responsibilities:**

| Function | Detail |
|---|---|
| **Routing** | URL → service |
| **Auth** | JWT validation, OAuth introspection, API keys |
| **Rate limiting** | Per user / API key / endpoint |
| **TLS termination** | Single cert at edge |
| **Request transformation** | Rewrite headers, paths, bodies |
| **Response transformation** | Aggregate, filter |
| **Logging / metrics** | Centralized |
| **Versioning** | Route /v1 → service A, /v2 → service B |
| **CORS** | Centralized policy |
| **Mock / fault injection** | Testing |

**Three API gateway patterns:**

| Pattern | Use |
|---|---|
| **1. Simple routing** | One entry per path → service |
| **2. API composition / aggregation** | Gateway calls N services, combines results |
| **3. Backend for Frontend (BFF)** | One gateway per client type |

**Pattern 1 — Simple routing:**

```
/api/users/*    → User Service
/api/orders/*   → Order Service
/api/payments/* → Payment Service
```

**Pattern 2 — API composition (reduces client round trips):**

```
GET /user-dashboard
    ├── User Service (profile)
    ├── Order Service (recent orders)
    └── Notification Service (unread count)
   ↓
   Gateway aggregates → single response
```

**Pattern 3 — Backend for Frontend (BFF):**

```
Web App     → Web BFF     → Microservices
Mobile App  → Mobile BFF  → Microservices
Public API  → Public BFF  → Microservices
```

| Property | Detail |
|---|---|
| One BFF per client | Tailored aggregations / transformations |
| Web wants different fields than mobile | Each BFF picks |
| Easier per-client optimization | No "kitchen sink" API |
| Owned by client team | Reduces backend churn |

**Service discovery — finding services dynamically:**

| Pattern | Detail |
|---|---|
| **Client-side discovery** | Client queries registry, picks instance | Eureka, Consul SDK |
| **Server-side discovery** | LB queries registry, routes | AWS ALB + ECS |
| **DNS-based** | Services register DNS names | K8s Services, Consul DNS |
| **K8s native** | Service + Endpoints + ClusterIP | Built-in |
| **Service mesh sidecar** | Sidecar handles discovery | Istio, Linkerd |
| **Static config** | Hardcoded endpoints | Small systems |

**Service discovery flow:**

```
1. Service starts → registers (name, IP, port) in registry
2. Health checks keep registration fresh
3. Client / LB queries registry to find current instances
4. On instance death, registry expires the entry
5. Traffic stops flowing to dead instances
```

**Health checks — types:**

| Type | Detail |
|---|---|
| **Active (LB pings)** | LB calls `/health` periodically |
| **Passive (LB observes)** | Tracks failed responses; ejects after threshold |
| **Liveness** (am I alive?) | Restart if fails |
| **Readiness** (ready for traffic?) | Don't route until passes |
| **Startup** (still starting?) | Slower initial probe |

**Circuit breaker — stop calling a failing service:**

```
   ┌───── Closed ────────► Open ───────► Half-Open ────► (back to Closed)
   │     normal              reject       try one
   │                         immediately  request
   │
   │ failures > threshold
   └───────────────►
```

| State | Behavior |
|---|---|
| **Closed** (normal) | Calls go through |
| **Open** (tripped) | Reject immediately, no call |
| **Half-Open** (testing) | Try one request; success → Closed, fail → Open |
| Failure threshold | E.g., 50% errors over 1 min |
| Timeout | Open → Half-Open after N seconds |

**Tools:**

| Tool | Detail |
|---|---|
| **Hystrix** (legacy Netflix) | Original CB library |
| **resilience4j** (Java) | Modern replacement |
| **Polly** (.NET) | Same idea |
| **Istio / Linkerd** | Service mesh built-in |

**Rate limiting at gateway:**

| Tier | Use |
|---|---|
| Per user / API key | Prevent abuse |
| Per service | Protect downstream |
| Global | System-wide cap |
| Tiered (free / paid) | Per-plan limits |

**Service mesh — sidecar-based comms layer:**

| Property | Detail |
|---|---|
| Sidecar proxy per pod (Envoy) | Handles all in/out traffic |
| mTLS between services | Strong identity |
| Traffic policies | Routing, retries, timeouts |
| Observability | Metrics, traces, logs free |
| Tools | Istio, Linkerd, Consul Connect, Kuma |

**Edge vs internal:**

| Need | Tool |
|---|---|
| Public API, external clients | API Gateway (Kong, AWS APIGW) |
| Internal service-to-service | Service mesh (Istio, Linkerd) |
| Static asset distribution | CDN |
| L4 traffic distribution | NLB / HAProxy |

**Decision matrix:**

| Need | Tool |
|---|---|
| Distribute HTTP traffic across replicas | L7 LB |
| Auth + rate limit + routing for public API | API Gateway |
| Aggregate per-client responses | BFF |
| Service-to-service mTLS + observability | Service mesh |
| Dynamic service location | Service discovery (Consul, K8s, DNS) |
| Failure isolation between services | Circuit breaker (in mesh or library) |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| API Gateway as single point of failure | Need HA gateway |
| Gateway holds all auth logic monolithically | Becomes a bottleneck |
| BFF turns into another monolith | Gates more than aggregates |
| Service discovery without health checks | Routes to dead instances |
| Sticky sessions blocking autoscale | Lose horizontal scale benefit |
| L4 LB for HTTP API | Lose path-based routing |
| Circuit breaker with too-aggressive thresholds | False trips |
| Tight coupling between gateway and backends | Deploy lockstep |
| Pretending an LB is a gateway (or vice versa) | Lose specific features |

**Cross-references:**

- Rate limiting: [rate_limiter_*.md](rate_limiter_token_bucket_sliding_window.md)
- Circuit breaker / retries: [circuit_breaker_*.md](../../distributed_systems/circuit_breaker_retry_backoff_bulkhead_timeout_resilience_patterns.md)
- Caching strategies: [caching_strategies_*.md](../patterns/caching_strategies_redis_memcached_invalidation.md)
- Microservice decomposition: [service_decomposition_*.md](../../microservices/service_decomposition_bounded_context_strangler_fig.md)

**Rule of thumb:** **API Gateway at the edge for auth/routing/rate limiting; service mesh inside for mTLS/observability/retries.** Use **BFF** when web and mobile need genuinely different aggregations. Pick **L4 LB** for raw TCP, **L7 LB / Gateway** for HTTP. **Service discovery** is non-negotiable in dynamic environments — combine with health checks and circuit breakers for resilience.
