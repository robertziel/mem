### 19 Microservices Patterns: Communication, Resilience & Data

**Communication patterns:**

| # | Pattern | Purpose |
|---|---------|---------|
| 1 | **API Gateway** | Single entry point, routing, auth, rate limiting |
| 2 | **BFF (Backend for Frontend)** | Separate gateway per client type (web, mobile) |
| 3 | **Service Discovery** | Dynamic service location (Consul, K8s DNS) |
| 4 | **Smart Endpoints, Dumb Pipes** | Logic in services, not in middleware |
| 5 | **Async Messaging** | Decouple via message queue (Kafka, SQS, RabbitMQ) |
| 6 | **Consumer-Driven Contracts** | Consumers define API expectations, tested in CI |

**Resilience patterns:**

| # | Pattern | Purpose |
|---|---------|---------|
| 7 | **Circuit Breaker** | Stop calling failing service, fail fast |
| 8 | **Bulkhead** | Isolate resources per dependency (thread pools) |
| 9 | **Retry with Backoff** | Retry transient failures with exponential delay + jitter |
| 10 | **Sidecar** | Attach helper proxy for cross-cutting concerns |
| 11 | **Stateless Services** | No server-side state, easy scaling and replacement |

**Data management patterns:**

| # | Pattern | Purpose |
|---|---------|---------|
| 12 | **Database per Service** | Each service owns its data store |
| 13 | **Saga** | Distributed transactions via local txns + compensations |
| 14 | **Event Sourcing** | Store state changes as immutable events |
| 15 | **CQRS** | Separate read and write models |
| 16 | **Data Sharding** | Partition data across multiple databases |
| 17 | **Polyglot Persistence** | Different DB technologies per service |

**Evolution patterns:**

| # | Pattern | Purpose |
|---|---------|---------|
| 18 | **Strangler Fig** | Incrementally replace monolith with microservices |
| 19 | **Shadow Deployment** | Mirror production traffic to new version for testing |

**When to apply each pattern:**

**Starting out (2-5 services):**
- API Gateway (or simple reverse proxy)
- Database per service
- Retry with backoff
- Stateless services
- Async messaging for decoupling

**Growing (5-15 services):**
- Service discovery (K8s Services or Consul)
- Circuit breaker
- Saga for cross-service transactions
- Consumer-driven contracts
- BFF (if mobile + web clients diverge)

**At scale (15+ services):**
- Sidecar / Service mesh
- Event sourcing + CQRS (where needed)
- Bulkhead isolation
- Shadow deployment for risky changes
- Polyglot persistence

**Anti-patterns to avoid:**
- Distributed monolith (services can't deploy independently)
- Shared database (coupling through schema)
- Synchronous chains (A→B→C→D, latency compounds)
- No circuit breakers (one failure cascades everywhere)
- Too many services too early (operational overhead exceeds benefit)

**Rule of thumb:** Start with a monolith, extract services as needed. Apply patterns incrementally based on actual pain points, not theoretical concerns. Communication and resilience patterns are table stakes. Data patterns (Saga, CQRS, Event Sourcing) only when cross-service consistency is a real requirement.
