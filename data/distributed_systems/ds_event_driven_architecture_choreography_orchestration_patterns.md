### Event-Driven Architecture: Choreography vs Orchestration

**Two coordination models for distributed workflows:**

**Choreography (decentralized, event-based):**
```
Order Service publishes: OrderPlaced
  → Payment Service listens → charges card → publishes PaymentReceived
    → Inventory Service listens → reserves stock → publishes StockReserved
      → Shipping Service listens → creates shipment → publishes OrderShipped
        → Notification Service listens → sends email
```
- No central coordinator — each service reacts to events independently
- Services don't know about each other (loose coupling)
- Workflow is implicit (emerges from event chains)

**Orchestration (centralized, command-based):**
```
Order Orchestrator:
  1. Call Payment Service: "Charge $50"     → wait for response
  2. Call Inventory Service: "Reserve items" → wait for response
  3. Call Shipping Service: "Create shipment" → wait for response
  4. Call Notification Service: "Send email"  → fire and forget

Orchestrator knows the full workflow and controls the sequence.
```

**Comparison:**
| Feature | Choreography | Orchestration |
|---------|-------------|---------------|
| Coupling | Loose (services independent) | Tighter (orchestrator knows all services) |
| Visibility | Hard to see full workflow | Easy (workflow in one place) |
| Failure handling | Each service handles its own | Centralized compensation |
| Adding steps | Add new subscriber (no code change in others) | Modify orchestrator |
| Debugging | Hard (trace events across services) | Easier (follow orchestrator logic) |
| Complexity | Simple services, complex interactions | Complex orchestrator, simple services |
| Best for | Simple workflows, few steps | Complex workflows, many steps, compensation |

**When to use choreography:**
- 2-4 services in the workflow
- Services are truly independent
- No complex compensation needed
- Event-driven domain (naturally reactive)
- Example: user signup → send welcome email → create analytics profile

**When to use orchestration:**
- 5+ services in the workflow
- Complex compensation/rollback logic (saga)
- Business needs to see the workflow state
- Strict ordering required
- Example: order fulfillment (validate → charge → reserve → ship → notify)

**Saga with choreography:**
```
Happy path:
  OrderPlaced → PaymentCharged → StockReserved → OrderShipped

Compensation (payment fails):
  OrderPlaced → PaymentFailed → OrderCancelled

Compensation (stock unavailable):
  OrderPlaced → PaymentCharged → StockFailed → PaymentRefunded → OrderCancelled
```
- Each service knows how to compensate its own action
- Risk: compensation chain is implicit and hard to debug

**Saga with orchestration (recommended for complex workflows):**
```ruby
class OrderSaga
  def execute(order)
    begin
      payment = PaymentService.charge(order.total)
      inventory = InventoryService.reserve(order.items)
      shipping = ShippingService.create_shipment(order)
      NotificationService.send_confirmation(order)
    rescue PaymentService::Failed
      # No compensation needed (nothing to undo)
      raise OrderFailed
    rescue InventoryService::Failed
      PaymentService.refund(payment.id)  # compensate payment
      raise OrderFailed
    rescue ShippingService::Failed
      InventoryService.release(inventory.id)  # compensate inventory
      PaymentService.refund(payment.id)        # compensate payment
      raise OrderFailed
    end
  end
end
```

**Workflow engines (for complex orchestration):**
| Tool | Type | Best for |
|------|------|----------|
| AWS Step Functions | Managed, serverless | AWS-native workflows |
| Temporal | Open-source, code-first | Complex, long-running workflows |
| Camunda | Open-source, BPMN | Business process automation |
| Conductor (Netflix) | Open-source | Microservice orchestration |

**Temporal example (durable execution):**
```ruby
# Workflow survives crashes — Temporal replays from last checkpoint
class OrderWorkflow
  def execute(order_id)
    payment = activity.charge_payment(order_id)
    inventory = activity.reserve_inventory(order_id)

    begin
      shipping = activity.create_shipment(order_id)
    rescue ShippingError
      activity.release_inventory(inventory.id)
      activity.refund_payment(payment.id)
      raise
    end

    activity.send_confirmation(order_id)
  end
end
```

**Event notification vs event-carried state transfer vs event sourcing:**
| Pattern | Event contains | Consumer action |
|---------|---------------|----------------|
| Event Notification | Just the fact + ID | Call back for details |
| Event-Carried State | Fact + all relevant data | Self-sufficient, no callback |
| Event Sourcing | Complete state change | Rebuild state by replaying |

**Rule of thumb:** Choreography for simple flows (2-4 steps, no compensation). Orchestration for complex flows (5+ steps, compensation needed). Saga pattern for distributed transactions (compensating actions). Use Temporal/Step Functions for durable orchestration. Start with choreography; refactor to orchestration when workflow becomes hard to trace.
