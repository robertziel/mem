### Choreography — Event-Based Decentralized Coordination

**Definition:** a workflow style where services **emit events** about what they did and **listen for events** they care about. **No central coordinator** — the workflow emerges from the event chain.

**Contrast with orchestration:**

| | **Choreography** | **Orchestration** |
|---|---|---|
| Coordinator | None — services react to events | Single orchestrator drives the flow |
| Workflow visibility | Implicit (emerges) | Explicit (defined in one place) |
| Coupling | Loose (publish + subscribe) | Higher (orchestrator knows all steps) |
| Adding a new step | Add a subscriber — no change to others | Update the orchestrator |
| Debugging | Harder — trace events across services | Easier — orchestrator log shows the flow |
| Failure handling | Each service handles its own | Orchestrator can compensate centrally |
| Best for | Event-driven domains, simple flows, 2–4 services | Complex flows, multi-step workflows, sagas with rollback |

**The classic e-commerce choreography example:**

```
[Order Service]  ── publishes ──► OrderPlaced
                                     │
                                     ▼
                          [Payment Service]  ── publishes ──► PaymentReceived
                                     │
                                     ▼
                          [Inventory Service] ── publishes ──► StockReserved
                                     │
                                     ▼
                          [Shipping Service]  ── publishes ──► OrderShipped
```

| Property | Detail |
|---|---|
| Each service does its job and emits a fact | Past-tense events |
| Next service listens and reacts | Picks up where previous left off |
| No service knows the **full** flow | Each only knows its inputs + outputs |
| Workflow exists only in the **chain of events** | Implicit |

**Core building blocks:**

| Component | Detail |
|---|---|
| **Event bus / broker** | Kafka, RabbitMQ, NATS, AWS SNS+SQS, Google Pub/Sub |
| **Event** | Past-tense fact (`OrderPlaced`, `PaymentReceived`) |
| **Producer** | Service that emits events |
| **Consumer** | Service that subscribes and reacts |
| **Schema registry** | Versioned event schemas (Avro, Protobuf, JSON Schema) |
| **Idempotency** | Consumers must handle duplicate events |
| **Dead-letter queue** | Where unprocessable events go |

**When choreography fits:**

| Signal | Detail |
|---|---|
| 2–4 services involved | Manageable mental model |
| Each service's reaction is simple | No complex branching |
| No need for global rollback | Compensating actions are localized |
| Domain naturally event-driven | Orders, payments, social-graph events |
| Loose coupling is a priority | Independent deployments |
| Domain experts already think in events | EventStorming surfaced the structure |

**When choreography breaks down — switch to orchestration:**

| Signal | Detail |
|---|---|
| 5+ services in the flow | Mental model collapses |
| Need to see the full workflow in one place | Audit, compliance, debugging |
| Complex compensation chains | "If shipping fails, refund payment, restore inventory, notify customer" |
| Conditional branching | Workflow varies by inputs |
| Long-running, multi-day processes | Need persistent state machine |
| Strict ordering across services | Event reordering becomes a hazard |
| Customer support needs to query "where is this order?" | Single source of truth easier with orchestration |

**Saga pattern — choreographed:**

```
OrderPlaced
  → PaymentService.charge → PaymentReceived (or PaymentFailed → compensate by cancelling order)
    → InventoryService.reserve → StockReserved (or StockUnavailable → refund payment, cancel order)
      → ShippingService.ship → OrderShipped
```

| Concept | Detail |
|---|---|
| Each step has a "compensating action" | Undo on failure |
| Compensations run as new events | `PaymentRefunded`, `OrderCancelled` |
| No global rollback | Each service rolls back its own work |

**Saga pattern — orchestrated (the alternative):**

```
[Saga Orchestrator]
   ├── PaymentService.charge() — wait response
   ├── InventoryService.reserve() — wait response
   ├── ShippingService.ship() — wait response
   └── on failure → invoke compensations in reverse
```

| Tool | Detail |
|---|---|
| **Temporal** | Modern saga orchestration; durable execution |
| **AWS Step Functions** | Cloud-native state machine |
| **Camunda / Zeebe** | BPMN engines |
| **Apache Airflow** | DAG-based; workflow heavy |

**Event-driven properties to design around:**

| Property | Detail |
|---|---|
| **At-least-once delivery** | Consumers may receive duplicates → idempotent handlers |
| **Out-of-order delivery** | Cross-aggregate ordering rarely guaranteed |
| **No global ordering** | Per-key ordering only (Kafka partitions) |
| **Fan-out** | Multiple subscribers per event |
| **Schema evolution** | Add fields, never break existing consumers |
| **Backpressure** | Slow consumer doesn't block producer |

**Event design guidelines:**

| Rule | Detail |
|---|---|
| Past tense, business language | `OrderPlaced`, not `CreateOrder` |
| Self-contained payload | Don't make consumer query producer for context |
| Immutable | Once published, never edited |
| Versioned | Add `version` field; tolerant readers |
| Idempotency key | Consumer dedupes |
| Causation + correlation IDs | Trace event chains |
| One aggregate per event | Don't span aggregates |

**Event payload shape:**

```json
{
  "event_id": "evt_01HV2X8K6Z...",
  "event_type": "OrderPlaced",
  "version": 1,
  "occurred_at": "2024-04-15T10:00:00Z",
  "aggregate_id": "ord_456",
  "correlation_id": "req_123",
  "causation_id": "evt_01HV2X8K6X...",
  "data": {
    "customer_id": "cus_42",
    "items": [...],
    "total_cents": 9999
  }
}
```

**Idempotent consumer pattern:**

```ruby
class OrderEventHandler
  def handle(event)
    return if ProcessedEvent.exists?(event_id: event.event_id)

    ApplicationRecord.transaction do
      ProcessedEvent.create!(event_id: event.event_id)
      apply_event(event)
    end
  end
end
```

**Failure modes & how choreography handles them:**

| Failure | Choreography response |
|---|---|
| Consumer crashes mid-event | Event re-delivered (at-least-once); idempotent handler is safe |
| Consumer can't process | Move to dead-letter queue; alert on growth |
| Out-of-order events | Per-aggregate ordering preserved (Kafka key); cross-aggregate must be tolerant |
| Slow downstream | Backpressure builds in queue depth; alert |
| Event bus partition / outage | Retry; producer-side outbox protects from data loss |
| Schema breaking change | Older consumers fail; rollout discipline + tolerant readers |

**Compensation — choreographed:**

```
PaymentFailed (event)
  → OrderService listens → cancels order → publishes OrderCancelled
    → InventoryService listens → releases reservation → publishes StockReleased
```

| Property | Detail |
|---|---|
| Each service knows its own undo | No central plan |
| Compensation flows are themselves choreographed | More events |
| Risk: compensation chain breaks | Same delivery / ordering concerns |
| Test extensively | Sad paths often less tested |

**Tooling map:**

| Need | Tool |
|---|---|
| Event broker | Kafka, NATS, RabbitMQ, AWS SNS+SQS, Pub/Sub |
| Schema registry | Confluent Schema Registry, Apicurio |
| Event sourcing store | EventStoreDB, Kafka with compacted topics, custom on Postgres |
| CDC for outbox | Debezium |
| Choreography orchestration tools | (rare — choreography is decentralized by definition) |
| Orchestration tools | Temporal, AWS Step Functions, Camunda, Airflow, Argo Workflows |
| Distributed tracing | OpenTelemetry — link spans across services via correlation IDs |

**Observability essentials:**

| Concern | Detail |
|---|---|
| **Correlation ID** in every event | Trace one logical workflow across services |
| **Causation ID** | Which event caused this one |
| **End-to-end traces** | OTel link spans by correlation ID |
| Per-service event throughput | Detect stuck consumers |
| DLQ depth | Alert on growth |
| Per-event-type latency | "Order placed → shipped takes how long?" |
| Saga completion rate | What fraction of started flows complete? |
| Compensation rate | Are we rolling back too often? |

**Anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| One service publishing events on behalf of another | Coupling re-emerges |
| Tightly-coupled event consumers (stop one, all stop) | Lost the loose coupling |
| Events that contain only IDs (no data) | Consumer must call producer back — chatty |
| Synchronous event handling that blocks producer | Coupling at runtime |
| No idempotency in consumers | Duplicates corrupt state |
| Global ordering assumed | Cross-aggregate ordering is hard |
| Compensations missing test coverage | Production discovers them broken |
| Long event chains (5+ services) | Choreography no longer fits — switch to orchestration |
| Mixing choreography + orchestration confusingly | Pick one per workflow |

**Hybrid approach (common in practice):**

| Pattern | Detail |
|---|---|
| Choreography between **bounded contexts** | Loose coupling at the seams |
| Orchestration **within** a bounded context | Clear control where it matters |
| Read-side projections via choreography | Materialize views from events |
| Critical write paths orchestrated | Stronger guarantees where needed |

**Decision matrix:**

| Need | Pick |
|---|---|
| 2–4 services, simple chain, loose coupling priority | **Choreography** |
| 5+ services, complex flow, need visibility | **Orchestration** (Temporal / Step Functions) |
| Need to query "where in the workflow is this?" | **Orchestration** |
| Need centralized compensation | **Orchestration** with saga |
| Event-driven domain (orders, posts, social-graph) | **Choreography** fits naturally |
| Long-running, multi-day, branchy | **Orchestration** with persistent state |
| Cross-bounded-context | **Choreography** at the seams |

**Cross-references:**

- Outbox pattern (atomic event publish): [cdc_debezium_*.md](../data_engineering/cdc_debezium_change_data_capture_wal_outbox.md)
- Idempotency: [idempotency_*.md](idempotency_key_exactly_once_deduplication.md)
- Bounded context: [bounded_context_*.md](../design_patterns/ddd/bounded_context_linguistic_boundary.md)
- CQRS / event sourcing: [cqrs_*.md](../design_patterns/event_sourcing/cqrs_command_query_projections.md)
- Resilience patterns: [circuit_breaker_*.md](circuit_breaker_retry_backoff_bulkhead_timeout_resilience_patterns.md)

**Rule of thumb:** **choreography for simple flows where each service reacts independently** (2–4 services, loose coupling priority). **Switch to orchestration when you need workflow visibility, complex compensations, or long-running state.** Always design for **at-least-once delivery + idempotent consumers + tolerant readers**. **Outbox pattern + CDC** is the standard way to publish events atomically from a service. **Hybrid** is fine: choreography between bounded contexts, orchestration within.
