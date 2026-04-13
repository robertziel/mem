### Orchestration (Central Coordinator / Saga)

```
Order Orchestrator:
  1. Call Payment Service: "Charge $50" → wait
  2. Call Inventory Service: "Reserve items" → wait
  3. Call Shipping Service: "Create shipment" → wait
  4. Call Notification: "Send email"

If step 2 fails: PaymentService.refund(payment.id)
If step 3 fails: InventoryService.release + PaymentService.refund
```

```ruby
class OrderSaga
  def execute(order)
    payment = PaymentService.charge(order.total)
    inventory = InventoryService.reserve(order.items)
    ShippingService.create_shipment(order)
  rescue InventoryService::Failed
    PaymentService.refund(payment.id)
    raise OrderFailed
  rescue ShippingService::Failed
    InventoryService.release(inventory.id)
    PaymentService.refund(payment.id)
    raise OrderFailed
  end
end
```

**Workflow engines:** AWS Step Functions, Temporal, Camunda.

**When to use:** 5+ services, complex compensation/rollback, need to see workflow state.

**Rule of thumb:** Orchestration for complex workflows where you need centralized compensation logic and workflow visibility. The orchestrator knows the full flow.
