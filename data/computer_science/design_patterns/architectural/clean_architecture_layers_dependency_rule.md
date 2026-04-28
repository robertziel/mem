### Clean Architecture — Layers & the Dependency Rule

**Core idea (Robert C. Martin, 2012):** the codebase is organized into **concentric layers**; **source-code dependencies point only inward**. The innermost layer (entities + domain rules) doesn't know about web frameworks, databases, or UIs.

**Layered diagram (inner ← outer):**

```
   ┌──────────────────────────────────────────────┐
   │       Frameworks & Drivers (outermost)       │
   │  Web framework · DB · External APIs · UI     │
   │  ┌────────────────────────────────────────┐  │
   │  │       Interface Adapters               │  │
   │  │  Controllers · Presenters · Gateways    │  │
   │  │  ┌──────────────────────────────────┐  │  │
   │  │  │         Use Cases                │  │  │
   │  │  │  Application-specific business    │  │  │
   │  │  │  rules (orchestrate entities)     │  │  │
   │  │  │  ┌────────────────────────────┐  │  │  │
   │  │  │  │       Entities             │  │  │  │
   │  │  │  │  Pure domain objects + rules│ │  │  │
   │  │  │  └────────────────────────────┘  │  │  │
   │  │  └──────────────────────────────────┘  │  │
   │  └────────────────────────────────────────┘  │
   └──────────────────────────────────────────────┘
       ▲           ▲             ▲           ▲
       │           │             │           │
   dependencies always point INWARD (toward Entities)
```

**Layers — what each contains:**

| Layer | Contents | Knows about |
|---|---|---|
| **Entities** | Domain objects, business rules independent of any application | **Nothing** (pure language constructs) |
| **Use Cases / Interactors** | Application-specific business logic; orchestrates entities | Entities only |
| **Interface Adapters** | Convert use-case data to/from external formats (controllers, presenters, gateways, repositories) | Use Cases + Entities |
| **Frameworks & Drivers** | Web framework, ORM, DB, UI framework, external services | All inner layers |

**The Dependency Rule (the one rule):**

> **Source code dependencies point only inward.** Inner layers must not import / reference outer layers. The arrow of dependency contradicts the arrow of data flow when needed (control flow can call outward via **dependency inversion**).

**Dependency Inversion — how outer layers are called from inner:**

| Concept | Detail |
|---|---|
| Use case defines a **port** (interface) | "I need something that can save an order" |
| Adapter implements the port | `PostgresOrderRepo implements OrderRepoPort` |
| At runtime, adapter is **injected** into the use case | DI container, factory, manual wiring |
| Use case doesn't know which adapter | Test with an in-memory fake; ship with Postgres impl |

**"Ports and Adapters" (hexagonal architecture) is the same idea, different naming:**

| Clean Architecture | Hexagonal | Onion |
|---|---|---|
| Entities | Domain | Domain Model |
| Use Cases | Application Core | Application Services |
| Interface Adapters | Adapters | Infrastructure |
| Frameworks & Drivers | Adapters (driving + driven) | Infrastructure |
| Ports | Ports | Repository / Service interfaces |

**In Rails — pragmatic placement:**

```
app/
├── domain/                  # Entities (pure Ruby, no Rails)
│   ├── order.rb
│   ├── money.rb
│   └── value_objects/
├── use_cases/               # Application logic (interactors)
│   ├── place_order.rb
│   └── cancel_order.rb
├── ports/                   # Abstract interfaces
│   ├── order_repository.rb
│   └── payment_gateway.rb
├── adapters/                # Concrete infra
│   ├── postgres_order_repo.rb
│   └── stripe_payment_gateway.rb
├── controllers/             # Thin HTTP adapter
│   └── orders_controller.rb
└── models/                  # ActiveRecord wrappers (still Rails-friendly)
    └── order_record.rb
```

> **Don't fight Rails.** ActiveRecord models can wrap a `domain/order.rb`. Or accept that for many CRUD apps, a "fat model" is fine.

**When clean architecture pays off:**

| Situation | Pays off? |
|---|---|
| CRUD app, small team | ❌ Rails defaults are simpler |
| Long-lived, complex domain | ✅ |
| Heavy third-party integrations (payments, identity, comms) | ✅ |
| Multi-team / different cadences per service | ✅ |
| Replacing the framework or DB later is plausible | ✅ |
| You'll never replace the framework | ❌ Don't carry the cost |
| Highly testable required (financial, regulatory) | ✅ |

**Strict vs pragmatic:**

| Style | Detail |
|---|---|
| **Strict** | Pure domain layer; no Rails / Django / Spring; everything DI'd | Slow to write; high test coverage; great for hard domains |
| **Pragmatic** | Service objects + form objects + occasional repository | The mainstream Rails approach |
| **Modular monolith** | Clean boundaries between modules; less ceremony than full clean | Best balance for most teams |

**Service-object pattern (the common Rails compromise):**

```ruby
class PlaceOrder
  def initialize(repo: OrderRepo.new, payment: StripeGateway.new)
    @repo, @payment = repo, payment
  end

  def call(user:, items:)
    order = Order.new(user_id: user.id, items: items)
    order.validate!
    @payment.charge(order.total, customer_id: user.stripe_id)
    @repo.save(order)
    OrderConfirmedEvent.publish(order)
    order
  end
end
```

| Property | Detail |
|---|---|
| Single public method (`call`) | Easy to test |
| Dependencies injected via constructor | Mockable in tests |
| Result: order or domain error | Predictable |
| Lives in `app/use_cases/` or `app/services/` | Convention |

**Repository pattern — when to extract:**

| Sign | Extract a repo? |
|---|---|
| One model accessed many ways | Probably |
| Complex queries on the same table | Yes — keeps queries off models |
| Need to swap implementation (Postgres → Mongo) | Yes |
| Trivial CRUD | No — `User.find` is fine |
| You want pure domain objects (no AR) | Yes — repo returns domain, hides AR |

**Testing benefits — what clean architecture buys you:**

| Test type | Without clean | With clean |
|---|---|---|
| Unit (domain logic) | Hits Rails / DB / fixtures | Pure Ruby; fast |
| Use case | Touches HTTP / DB | Inject fakes; isolated |
| Adapter integration | Same | Verify the adapter alone |
| End-to-end | Same | Same |

**Testing pyramid in clean architecture:**

| Tier | Speed |
|---|---|
| Pure domain unit tests | Sub-millisecond |
| Use case tests with fakes | Few ms |
| Adapter tests with real infra | Hundreds of ms |
| End-to-end (Capybara / Playwright) | Seconds |

**Dependency injection mechanics:**

| Approach | Detail |
|---|---|
| **Constructor injection** | Default — explicit, simple |
| **Setter injection** | Less common; mutable dependencies |
| **Service locator / DI container** | Centralized; can hide deps — use sparingly |
| **Default arguments** (Ruby idiom) | `initialize(repo: OrderRepo.new)` — not pure DI but pragmatic |
| **Dry-rb / Sorbet types** | Stronger contracts in Ruby ecosystem |

**Common smells / anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| Domain layer imports Rails | Dependency rule violated; can't run domain tests fast |
| Use case calls ActiveRecord directly | Bypasses port; harder to test |
| Controller contains business logic | "Fat controller"; move to use case |
| Adapter contains business rules | Pollutes infrastructure |
| Use cases forming chains where controllers compose them | Move composition into a higher use case |
| Skipping the layer for "simple" cases that grow over time | Refactor cost compounds |
| Manual DI sprawl | Use a DI library when wiring grows |
| Domain objects with persistence concerns (`save`) | Move to repo |

**Hexagonal terms ("driving" vs "driven"):**

| Term | Detail |
|---|---|
| **Driving adapter** | Initiates a request (HTTP, CLI, message consumer) |
| **Driven adapter** | Called by the use case (DB, external API, queue producer) |
| **Port** | Interface defined by the use case for one adapter type |

**Common patterns in clean / hexagonal:**

| Pattern | Use |
|---|---|
| **Result objects / `Either`** | Return success or domain error |
| **Domain events** | Published from use cases; subscribed by adapters (e.g., outbox pattern) |
| **Value objects** | Immutable domain types (`Money`, `Address`) |
| **Specifications** | Composable business rules |
| **Aggregates (DDD)** | Consistency boundaries |
| **Saga / process manager** | Long-running, multi-step orchestration |

**When to introduce clean architecture incrementally:**

| Step | Detail |
|---|---|
| 1 | Extract service objects (use cases) for any non-trivial flow |
| 2 | Pull pure domain logic out of AR models into POROs |
| 3 | Add repository interface when querying gets complex |
| 4 | Define ports for external services (payment, email) |
| 5 | Replace direct framework calls in domain with port calls |
| 6 | Pure domain tests run without Rails loaded |

**Cross-references:**

- DTOs (the data carriers between layers): [dto_*.md](../dto_data_transfer_object_serialization.md)
- DDD bounded context (where domain boundaries live): [bounded_context_*.md](../ddd/bounded_context_linguistic_boundary.md)
- Repository pattern, aggregate root: search `design_patterns/ddd/`
- TDD discipline: [tdd_*.md](../tdd_definition_test_driven_development.md)
- Service objects in Rails: search `design_patterns/service_object_*`

**Rule of thumb:** **architecture should serve productivity, not the other way around.** Full clean architecture pays off in **complex, long-lived domains with multiple teams**; for typical Rails CRUD apps, **service objects + a thin repository when needed** is the right midpoint. The two enduring lessons regardless of style: **dependencies point inward** and **the domain layer should be testable without booting the framework**.
