### Service Decomposition, Bounded Contexts & Strangler Fig

**How to decompose a monolith into microservices:**

**1. Domain-Driven Design (DDD) bounded contexts:**
- Identify distinct business domains (orders, payments, inventory, users)
- Each bounded context becomes a candidate microservice
- Same word can mean different things in different contexts ("Account" in billing vs auth)
- Service owns its data, logic, and vocabulary

**2. Strangler Fig Pattern (incremental migration):**
```
Phase 1: Monolith handles everything
  [Client] -> [Monolith]

Phase 2: New service handles one feature, proxy routes
  [Client] -> [API Gateway/Proxy]
                 |            |
          [New Service]  [Monolith (everything else)]

Phase 3: Gradually move more features
  [Client] -> [API Gateway]
                 |        |        |
          [Service A] [Service B] [Monolith (shrinking)]

Phase 4: Monolith fully replaced
  [Client] -> [API Gateway]
                 |        |        |
          [Service A] [Service B] [Service C]
```

**Strangler Fig steps:**
1. Identify a bounded context to extract
2. Build new service alongside monolith
3. Route traffic for that feature to new service (feature flag or proxy)
4. Verify correctness (shadow traffic, dual-write comparison)
5. Cut over fully, remove old code from monolith
6. Repeat for next bounded context

**Decomposition anti-patterns:**
| Anti-pattern | Problem |
|-------------|---------|
| Distributed monolith | Services tightly coupled, must deploy together |
| Too granular | Every function is a service (operational nightmare) |
| Shared database | Services coupled through DB schema |
| Synchronous chain | A calls B calls C calls D (latency, fragility) |
| No clear ownership | Multiple teams modify same service |

**When NOT to use microservices:**
- Small team (< 10 engineers)
- Simple domain (CRUD app)
- Early-stage startup (requirements still changing)
- No DevOps maturity (need CI/CD, monitoring, container orchestration)

**Database per service:**
```
[Order Service] -> [Orders DB]
[Payment Service] -> [Payments DB]
[User Service] -> [Users DB]
```
- Each service owns its data, no direct DB access from other services
- Cross-service data: API calls or event-driven sync
- Challenge: no cross-service JOINs, eventual consistency

**Data consistency patterns:**
- **Saga** for distributed transactions
- **Event-driven** sync (service A publishes event, service B consumes and updates its DB)
- **API composition** for cross-service reads (aggregate in gateway or BFF)

**Rule of thumb:** Decompose by business domain (bounded contexts), not by technical layer. Use Strangler Fig for migration (never big-bang rewrite). Each service owns its database. Start with a monolith, extract services as the team and domain grow. If two services must always deploy together, they should be one service.
