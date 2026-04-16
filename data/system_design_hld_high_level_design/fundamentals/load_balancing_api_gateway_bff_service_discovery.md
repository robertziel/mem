### Load Balancing and API Gateway Patterns

**API Gateway:**
- Single entry point for all client requests
- Responsibilities: routing, auth, rate limiting, request transformation, monitoring
- Clients talk to one endpoint; gateway routes to correct microservice

**API Gateway vs Load Balancer:**
| Feature | API Gateway | Load Balancer |
|---------|-------------|---------------|
| Layer | L7 (application) | L4 or L7 |
| Routing | Path/header/method-based | Round-robin/least-conn |
| Auth | Yes (JWT, API keys) | No |
| Rate limiting | Yes | Basic |
| Transformation | Request/response rewriting | No |
| Examples | Kong, AWS API Gateway, Envoy | ALB, NLB, HAProxy |

**API Gateway patterns:**

**1. Backend for Frontend (BFF):**
- Separate gateway per client type (web, mobile, third-party)
- Each BFF tailored to its client's needs (aggregate, transform)
```
Web App    -> Web BFF    -> Microservices
Mobile App -> Mobile BFF -> Microservices
```

**2. API Composition / Aggregation:**
- Gateway calls multiple services, combines results
- Reduces client round trips
```
GET /user-dashboard
  -> User Service (profile)
  -> Order Service (recent orders)
  -> Notification Service (unread count)
  -> Combine and return single response
```

**3. Request routing:**
```
/api/users/*   -> User Service
/api/orders/*  -> Order Service
/api/payments/* -> Payment Service
```

**Service discovery:**
- How does the gateway find backend services?
- **Client-side discovery**: client queries service registry, picks instance (Eureka)
- **Server-side discovery**: LB queries registry, routes request (AWS ALB + ECS)
- **DNS-based**: services register DNS names (K8s Services, Consul DNS)
- **K8s native**: Services + Endpoints provide built-in discovery

**Health checks and circuit breaking:**
- Gateway monitors backend health
- Remove unhealthy backends from rotation
- Circuit breaker: stop calling a failing service temporarily
```
Closed (normal) -> failures exceed threshold -> Open (reject immediately)
                                                  |
                                          timer expires
                                                  |
                                            Half-Open (try one request)
                                              success -> Closed
                                              failure -> Open
```

**Rate limiting at gateway:**
- Per user/API key: prevent abuse
- Per service: protect backends from overload
- Global: overall system protection
- Tiered: different limits for free/paid users

**Rule of thumb:** Use an API gateway for external-facing APIs (auth, rate limiting, routing). BFF pattern when web and mobile need different aggregations. Combine with service mesh for internal service-to-service communication.
