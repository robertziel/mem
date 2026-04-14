### Choreography (Decentralized Event-Based Coordination)

```
Order Service publishes: OrderPlaced
  → Payment Service listens → charges → publishes PaymentReceived
    → Inventory Service listens → reserves → publishes StockReserved
      → Shipping Service listens → ships → publishes OrderShipped
```

- No central coordinator — each service reacts independently
- Services don't know about each other (loose coupling)
- Workflow is implicit (emerges from event chains)

**When to use:** 2-4 services, simple flows, no complex compensation, event-driven domain.

**Downsides:** hard to see the full workflow, hard to debug, complex compensation chains.

**Rule of thumb:** Choreography for simple flows where each service reacts independently. If you need to see the workflow in one place or need complex rollbacks, switch to orchestration.
