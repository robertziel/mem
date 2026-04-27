### Design an Event-Driven Order Processing Pipeline (Saga Pattern)

**Requirements:**
- Process e-commerce orders: validate → reserve inventory → charge payment → ship
- Each step is a separate microservice
- If any step fails, compensate (undo) previous steps
- At-least-once delivery, idempotent handlers
- Full order lifecycle tracking

**Architecture — choreography (event-driven):**
```
┌─────────┐  OrderPlaced  ┌───────────┐  InventoryReserved  ┌─────────┐
│  Order  │──────────────>│ Inventory │───────────────────>│ Payment │
│ Service │               │  Service  │                    │ Service │
└─────────┘               └───────────┘                    └─────────┘
     ▲                         ▲                                │
     │                         │                       PaymentCharged
     │    OrderFailed          │  InventoryReleased             │
     │◄────────────────────────│◄───────────────────────────────┘
     │                         │                                │
     │                         │                         ┌──────▼──────┐
     │                         │                         │  Shipping   │
     │                         │                         │  Service    │
     │                         │                         └─────────────┘
```

**Kafka topics:**
```
orders.placed              — new order created
orders.validated           — order validated (items exist, user verified)
inventory.reserved         — stock reserved for order
inventory.released         — stock released (compensation)
payments.charged           — payment captured
payments.refunded          — payment refunded (compensation)
shipments.created          — shipping label created
orders.completed           — end-to-end success
orders.failed              — saga failed, all compensations done
```

**Happy path event flow:**
```
1. Order Service    → publishes OrderPlaced { order_id, items[], user_id, total }
2. Inventory Service → consumes OrderPlaced
                     → reserves stock for each item
                     → publishes InventoryReserved { order_id, reserved_items[] }
3. Payment Service   → consumes InventoryReserved
                     → charges payment method
                     → publishes PaymentCharged { order_id, charge_id }
4. Shipping Service  → consumes PaymentCharged
                     → creates shipping label
                     → publishes ShipmentCreated { order_id, tracking_id }
5. Order Service     → consumes ShipmentCreated
                     → updates order status to "completed"
                     → publishes OrderCompleted
```

**Compensation (payment fails):**
```
1. Payment Service fails to charge → publishes PaymentFailed { order_id, reason }
2. Inventory Service → consumes PaymentFailed
                     → releases reserved stock
                     → publishes InventoryReleased { order_id }
3. Order Service     → consumes PaymentFailed
                     → updates order status to "failed"
                     → publishes OrderFailed { order_id, reason }
                     → notifies user
```

**Choreography vs orchestration:**

| Aspect | Choreography (events) | Orchestration (central coordinator) |
|--------|----------------------|-------------------------------------|
| Coupling | Services don't know each other | Orchestrator knows all steps |
| Complexity | Distributed, harder to trace | Centralized, easier to follow |
| Single point of failure | None | Orchestrator is SPOF |
| Adding steps | Just subscribe to events | Modify orchestrator |
| Debugging | Need distributed tracing | Check orchestrator logs |
| Best for | Simple sagas (3-5 steps) | Complex sagas (many branches) |

**Orchestrator alternative (Temporal/Cadence):**
```ruby
# Saga orchestrator (pseudocode)
class OrderSaga
  def execute(order)
    inventory = InventoryService.reserve(order.items)
    payment = PaymentService.charge(order.total, order.payment_method)
    shipment = ShippingService.create_label(order.address)

    order.complete!(tracking: shipment.tracking_id)
  rescue PaymentService::Failed => e
    InventoryService.release(inventory.reservation_id)  # compensate
    order.fail!(reason: e.message)
  rescue ShippingService::Failed => e
    PaymentService.refund(payment.charge_id)             # compensate
    InventoryService.release(inventory.reservation_id)   # compensate
    order.fail!(reason: e.message)
  end
end
```

**Idempotency — critical for at-least-once delivery:**
```ruby
class PaymentConsumer
  def handle(event)
    idempotency_key = "payment:#{event.order_id}"

    # Skip if already processed
    return if Payment.exists?(idempotency_key: idempotency_key)

    Payment.create!(
      order_id: event.order_id,
      idempotency_key: idempotency_key,
      amount: event.total,
      status: "charged"
    )
    PaymentGateway.charge(event.total, idempotency_key: idempotency_key)
  end
end
```

**Order state machine:**
```
placed → validated → inventory_reserved → payment_charged → shipped → completed
   │         │              │                    │
   ▼         ▼              ▼                    ▼
 failed    failed     payment_failed        shipping_failed
                    (→ inventory released)  (→ payment refunded
                                             → inventory released)
```

**Monitoring:**
- Track saga duration (p50, p99) — alert if stuck
- Dead letter queue for events that fail after max retries
- Dashboard: orders by status, failure rate per step, avg completion time
- Distributed tracing (OpenTelemetry): correlation_id across all events

**Rule of thumb:** Use choreography for simple linear sagas (≤ 5 steps) and orchestration (Temporal, Cadence) for complex flows with branching. Every handler must be idempotent — Kafka guarantees at-least-once, not exactly-once across services. Include a correlation_id in every event. Design compensations as first-class operations, not afterthoughts.
