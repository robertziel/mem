### Service Decomposition — Bounded Contexts, Strangler Fig

**Definition:** breaking a monolith into microservices. Decompose by **business domain (bounded contexts)**, migrate **incrementally** with the **Strangler Fig pattern**, and give each service its **own database**. Reaching for microservices too early — or decomposing along technical layers — creates a **distributed monolith** that's worse than the original.

**Two foundational principles:**

| Principle | Detail |
|---|---|
| **Decompose by business domain** | Orders, payments, inventory — not "controllers, models, views" |
| **Migrate incrementally** | Strangler Fig, never big-bang rewrite |

**Bounded contexts — DDD's contribution:**

| Property | Detail |
|---|---|
| Each context owns its **vocabulary** | Same word can mean different things |
| Each context owns its **data** | No direct DB access from outside |
| Each context owns its **logic** | Business rules live here |
| Boundaries discovered via **EventStorming** | Workshop with domain experts |
| Translations at boundaries | Anti-corruption layer |

**Same word, different contexts:**

| Term | In Sales context | In Billing context | In Auth context |
|---|---|---|---|
| Customer | Prospect / lead | Account being charged | User to authenticate |
| Order | Cart in progress | Invoice generation source | Audit log entry |
| Account | Sales account | Billing account | Login account |

> Same identifier, different meaning, different lifecycle. Different services.

**Strangler Fig pattern — incremental migration:**

```
Phase 1: All in monolith
  [Client] ─► [Monolith]

Phase 2: New service alongside; proxy routes
  [Client] ─► [Proxy / Gateway]
                    ├──► [New Service A]
                    └──► [Monolith]

Phase 3: More services extracted
  [Client] ─► [Gateway]
                    ├──► [Service A]
                    ├──► [Service B]
                    └──► [Monolith (shrinking)]

Phase 4: Monolith retired
  [Client] ─► [Gateway]
                    ├──► [Service A]
                    ├──► [Service B]
                    └──► [Service C]
```

**Six steps to extract one service:**

| Step | Detail |
|---|---|
| 1 | Identify the bounded context (workshop with domain experts) |
| 2 | Build new service alongside monolith |
| 3 | Route relevant traffic via gateway / proxy / feature flag |
| 4 | Verify correctness (shadow traffic, dual-write comparison) |
| 5 | Cut over fully; remove old code from monolith |
| 6 | Repeat for next bounded context |

**Verification techniques:**

| Technique | Detail |
|---|---|
| **Shadow traffic** | Send copy of real traffic to new service; compare without affecting users |
| **Dual write + compare** | Write to both, alert on divergence |
| **Feature flag** | Route N% of users; gradually increase |
| **Canary** | Subset of traffic; metric-gated |
| **Snapshot tests** | Before-after equivalence |

**Data ownership — service per database:**

```
   ┌────────────────┐    ┌────────────────┐    ┌────────────────┐
   │ Order Service  │    │ Payment Service │    │ User Service   │
   └───────┬────────┘    └────────┬────────┘    └────────┬───────┘
           │                      │                       │
   ┌───────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐
   │   Orders DB    │    │   Payments DB   │    │    Users DB     │
   └────────────────┘    └─────────────────┘    └─────────────────┘
```

| Property | Detail |
|---|---|
| Each service owns its DB | No direct cross-service access |
| Other services use the API | Maintain encapsulation |
| Cross-service data | Sync via API or events |
| **No cross-service JOINs** | Data lives in different DBs |
| **Eventual consistency** | Across service boundaries |

**Cross-service data patterns:**

| Pattern | Detail |
|---|---|
| **API composition** | Gateway / BFF aggregates from N services for read |
| **Event-driven sync** | Service A publishes event; service B updates its replica |
| **CQRS / read model** | Maintain dedicated read model fed by events |
| **Saga** | Distributed transactions via compensating actions |
| **2PC (avoid)** | Two-phase commit — blocking, brittle |

**Saga — distributed transactions:**

| Choreography | Orchestration |
|---|---|
| Each service emits events; others react | Central orchestrator drives flow |
| Loose coupling | Tighter coupling, clearer flow |
| Compensation: each service rolls back its own | Orchestrator coordinates rollback |
| Tools: Kafka events | Tools: Temporal, Step Functions, Camunda |

**Anti-patterns — common decomposition mistakes:**

| Anti-pattern | Why it fails |
|---|---|
| **Distributed monolith** | Services tightly coupled; must deploy together |
| **Too granular** | Every function is a service → operational nightmare |
| **Shared database** | Coupled through schema; changes ripple |
| **Synchronous chain** (A → B → C → D) | Latency stacks; one failure cascades |
| **No clear ownership** | Multiple teams modify same service |
| **Decomposed by technical layer** | "DB service, logic service, UI service" — not business-aligned |
| **Big-bang rewrite** | "Let's rewrite everything in microservices" → fails |
| **Premature decomposition** | Splitting before domain understood — wrong boundaries |

**When NOT to use microservices:**

| Signal | Why monolith fits better |
|---|---|
| Small team (< 10 engineers) | Operational overhead too high |
| Simple CRUD domain | No bounded contexts to extract |
| Early-stage startup | Requirements still changing — boundaries shift |
| No DevOps maturity | Need CI/CD, observability, container orchestration |
| Single-team product | Coordination overhead beats benefits |

**Modular monolith — the in-between:**

| Property | Detail |
|---|---|
| Single deployable | One CI/CD pipeline |
| Strict module boundaries | Like services but in-process |
| Each module owns its data (logical schema) | Hygiene without distribution |
| Path to extract later | Modules become services if needed |
| Champions | Shopify, GitHub, Stack Overflow |

**Service-extraction signals (when monolith is hurting):**

| Signal | Detail |
|---|---|
| Different scaling profiles | One module needs 10× the others |
| Different deploy cadences | Slow releases blocked by fast ones |
| Different teams own different modules | Coordination tax growing |
| Different runtimes / languages needed | Hard with one binary |
| Different security or compliance | E.g., PCI scope reduction |
| Bounded context clearly identified | Domain experts agree on boundary |

**Service granularity — how big?**

| Heuristic | Detail |
|---|---|
| **One service per bounded context** | DDD principle |
| **Owned by one team** | Conway's law inverted |
| **Independent deploy** | Can release alone |
| **2-pizza team rule** (~5–8 engineers) | Amazon's rule |
| **Codebase: small enough to rewrite in 2 weeks** | Some teams' rule |
| Don't over-split | Anemic services pay distribution cost without benefit |

**Communication patterns:**

| Pattern | Detail | Use |
|---|---|---|
| **Synchronous HTTP / gRPC** | Request-response | Read paths, low latency |
| **Async messaging** (Kafka, SQS, RabbitMQ) | Event-driven | Decoupling, fan-out |
| **Saga** | Distributed transaction | Multi-service writes |
| **gRPC streaming** | Bidirectional | Real-time |
| **GraphQL federation** | Schema stitching | Unified API surface |

**Decision matrix:**

| Need | Pick |
|---|---|
| Just starting out | Monolith |
| Want module boundaries, single deploy | Modular monolith |
| Different scaling / deploy / team / compliance per module | Microservices |
| Migrating from monolith | Strangler Fig (never big-bang) |
| Cross-service consistency | Saga + event-driven |
| Cross-service read | API composition or read model |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Splitting a 10-engineer team into 5 services | Each engineer owns 1+ services — burnout, broken oncall |
| Sharing DB across services | Coupling; defeats the purpose |
| Synchronous fan-out across many services | Latency stacks; cascade failures |
| No service mesh / observability | Black-box debugging |
| Manual integration tests across services | Slow, brittle |
| Inconsistent service standards | Each service reinvents auth, logging, errors |
| Treating microservices as "lots of small monoliths" | Missing the autonomy point |
| Decomposing by data table instead of domain | Wrong boundaries |

**Cross-references:**

- Bounded context (DDD): [bounded_context_*.md](../design_patterns/ddd/bounded_context_linguistic_boundary.md)
- Ubiquitous language: [ubiquitous_language_*.md](../design_patterns/ddd/ubiquitous_language_shared_vocabulary.md)
- Choreography vs orchestration: [choreography_*.md](../distributed_systems/choreography_event_based_decentralized_coordination.md)
- Service mesh / API gateway: [load_balancing_*.md](../system_design_hld_high_level_design/fundamentals/load_balancing_api_gateway_bff_service_discovery.md)
- Event-driven CDC + outbox: [cdc_*.md](../data_engineering/cdc_debezium_change_data_capture_wal_outbox.md)

**Rule of thumb:** **Decompose by bounded context, not by technical layer. Use Strangler Fig — never big-bang rewrite. Each service owns its database.** Start with a **monolith** (or **modular monolith**); extract services only when scaling, deploy, or team boundaries demand it. **If two services must always deploy together, they should be one service.** Sagas + events for cross-service writes; API composition for cross-service reads.
