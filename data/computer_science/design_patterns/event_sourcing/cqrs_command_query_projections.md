### CQRS, Event Sourcing & Projections

**Three concepts that get conflated — they're independent:**

| Concept | Definition | You can have it without the others |
|---|---|---|
| **CQRS** | Separate model + store for **reads** vs **writes** | Yes — common pairing: PG (write) + Elasticsearch / Redis (read) |
| **Event Sourcing** | State stored as an append-only stream of events; current state = fold over events | Yes — without CQRS too, but they almost always go together |
| **Projection** | Read model derived from events / write side; rebuildable from source | Implies CQRS (the projection IS the read side) |

> CQRS without event sourcing is common and sensible. Event sourcing without CQRS is rare. The combination is the heavyweight pattern.

**CQRS architecture:**

```
                ┌─► Write Model ──► Write Store (normalized, transactional)
Command  ──────►│                      │
                │                      ▼ (events / CDC)
                │                 Event Bus / WAL
                │                      │
                │                      ▼
Query   ◄──────►├─◄ Read Model ◄── Projection(s) (denormalized, query-shaped)
                │
                └─◄ another Read Model (a different read shape)
```

**CQRS — what each side optimizes:**

| Side | Optimized for | Storage shape | Examples |
|---|---|---|---|
| **Write** | Validation, business rules, transactional consistency | Normalized OLTP DB | Postgres, MySQL |
| **Read** | Query patterns, denormalization, low latency | Materialized views, search indexes, KV caches | Elasticsearch, Redis, Mongo, ClickHouse |

**How read models stay current:**

| Sync mechanism | How | Latency | Complexity |
|---|---|---|---|
| Sync writes (write to both inside one txn) | Two-phase / dual-write | Sync | High failure risk; usually wrong |
| **Outbox pattern** | App writes event row + business row in same txn; relay publishes events | Seconds | Reliable; standard approach |
| **Change Data Capture (CDC)** | Tail the WAL/binlog (Debezium, etc.) | Seconds | DB-coupled but app-transparent |
| Application-level events | App publishes after commit (`after_commit`) | Seconds | Risk of dual-write inconsistency without outbox |
| Periodic batch sync | Scheduled job rebuilds read model | Minutes–hours | Simple; high staleness |

**Event Sourcing — model:**

| Element | Definition |
|---|---|
| **Event** | Immutable fact in past tense (`OrderPlaced`, `PaymentReceived`) |
| **Aggregate** | Consistency boundary; one stream per aggregate instance |
| **Stream** | Per-aggregate ordered list of events |
| **Event store** | Append-only log; query by `aggregate_id` to load state |
| **Snapshot** | Periodic checkpoint state, optional optimization |
| **Replay** | Rebuild state by folding events |
| **Projection** | Read model built by subscribing to events |

**Event design rules:**

| Rule | Why |
|---|---|
| **Past tense, business language** (`OrderShipped`, not `UpdateOrder`) | Events are facts that happened |
| **Immutable** — never edit, never delete | Audit and replay depend on this |
| **Versioned** (`v1`, `v2` schemas) | Business evolves; old events must remain readable |
| **Self-describing** | Carry enough data to reconstruct state without re-querying |
| **Stable IDs** | Aggregate ID + sequence number identifies any event uniquely |
| **One aggregate per event** | Don't span aggregates in a single event |

**Event store responsibilities:**

| Capability | Why needed |
|---|---|
| Append by `(aggregate_id, expected_version)` | Optimistic concurrency — detect concurrent writes |
| Read all events for an aggregate | Rebuild aggregate state |
| Read all events globally (or by category) | Drive projections |
| Subscribe (push) for projections | Sub-second freshness |
| Snapshots (optional) | Avoid replaying millions of events for old aggregates |

**Tools / stores:**

| Tool | Role |
|---|---|
| **EventStoreDB** (Kurrent) | Purpose-built event store + projections |
| **PostgreSQL** | DIY event store (table with `(aggregate_id, version, type, data, ts)`) |
| **Kafka** | Event log + replay; weaker per-aggregate concurrency |
| **DynamoDB** + Streams | Event store with built-in CDC |
| **Axon, Marten, EventFlow** | Framework helpers (Java, .NET) |

**Aggregate / projection rebuild flow:**

| Step | What happens |
|---|---|
| 1 | Load events for aggregate `A` (or from latest snapshot) |
| 2 | `state = events.reduce(seed) { |s, e| s.apply(e) }` |
| 3 | Apply command — produce zero or more new events |
| 4 | Append new events with `expected_version` to detect conflicts |
| 5 | Projections subscribe to the global event stream and update read models |

**Snapshots — when to add them:**

| Stream length per aggregate | Snapshot? |
|---|---|
| < 100 events | No — replay is cheap |
| 100–10 000 | Maybe — measure load latency |
| > 10 000 | Yes — replay every time would dominate |

> Store snapshots beside events: `(aggregate_id, version, state)`. Loading: latest snapshot + events after that version.

**Schema evolution — events are immutable, business isn't:**

| Strategy | When |
|---|---|
| **New event version** (`OrderShipped.v2`) | Adding required fields |
| **Upcasting** at read time | Translate old → new shape on the fly |
| **Tolerant reader** | Ignore unknown fields; provide defaults for missing ones |
| **Stream migration** | Re-emit events in new format into a new stream (heavyweight) |
| **Never** | Mutate the original event in storage |

**Projection lifecycle:**

| Phase | What happens |
|---|---|
| Initial build | Replay all events to build the read model from scratch |
| Live updates | Subscribe to event stream; update incrementally |
| Rebuild on bug | Drop the read model, replay from event 0 |
| Multiple projections | Different read models from the same events (per audience: dashboard, admin, ML feature store) |

**When to use which combination:**

| Need | Use |
|---|---|
| Simple CRUD | **Neither** — vanilla DB is fine |
| Read-heavy with multiple query shapes | **CQRS only** (multiple read models, one write DB) |
| Audit, replay, "what was the state on date X" | **Event sourcing + CQRS** |
| Reactive workflows ("on `OrderPlaced` do …") | Event sourcing or events-from-DB (CDC/outbox) |
| Complex domain with rich business events | Event sourcing + DDD aggregates |

**Benefits of event sourcing:**

| Benefit | Concrete |
|---|---|
| Complete audit trail | Every change is a stored fact |
| Time travel | "Show me the order's state on 2024-06-01" — fold events to that timestamp |
| Debug prod | Replay the exact event sequence in dev |
| Retroactive read models | Add a new projection later, replay history |
| Decouples write side from read side | Multiple consumers, independently scaled |

**Challenges (the cost side):**

| Challenge | Why it bites |
|---|---|
| **Eventual consistency** | Read model lags writes — must be designed for, not bolted on |
| **Schema evolution complexity** | Versions, upcasters, migrations on history |
| **Operational complexity** | Event store, projection rebuild jobs, monitoring lag |
| **Domain modeling discipline** | Aggregates, invariants, command handlers — needs DDD literacy |
| **Bad fit for CRUD** | If business doesn't speak in events, you're forcing structure |
| **Storage growth** | Event log grows forever — snapshot + archival policies |
| **GDPR / "right to be forgotten"** | Append-only conflicts with hard-delete; need crypto-shredding pattern |

**Pitfalls:**

| Pitfall | Effect |
|---|---|
| Treating events as DB updates | Loses business meaning; replay becomes meaningless |
| Including derived state in events | Events become brittle to changes elsewhere |
| Sharing events across aggregates | Breaks consistency boundary; invites cross-aggregate transactions |
| No outbox / CDC, app dual-writes | Inconsistency between DB and event bus on partial failure |
| Projections without idempotent handlers | Replay produces duplicates / wrong counters |
| Event sourcing for everything | Heavy ceremony for simple domains |

**Rule of thumb:** **CQRS is useful even without event sourcing** — separating read and write models pays for itself in any read-heavy app. **Event sourcing is heavy ceremony**; reach for it only when **audit, replay, or temporal queries are core business requirements** (finance, healthcare, regulated domains). When you do adopt it: design events in **business language, past tense, immutable**, version them from day one, and use the **outbox pattern** to keep write store and event log atomic.
