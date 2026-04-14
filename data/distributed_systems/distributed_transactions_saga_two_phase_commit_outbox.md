### Distributed Transactions

**The problem:**
- An operation spans multiple services/databases
- Example: transfer money = debit account A + credit account B
- If one succeeds and the other fails, data is inconsistent

**Two-Phase Commit (2PC):**
```
Phase 1 (Prepare):
  Coordinator -> all participants: "Can you commit?"
  Participants: lock resources, respond Yes/No

Phase 2 (Commit/Abort):
  All said Yes -> Coordinator: "Commit"
  Any said No  -> Coordinator: "Abort"
```
- Guarantees atomicity across participants
- Downsides: blocking (participants locked while waiting), coordinator is SPOF
- Used in: traditional databases, XA transactions

**Three-Phase Commit (3PC):**
- Adds a "pre-commit" phase to reduce blocking
- Rarely used in practice (complex, doesn't fully solve the problem)

**Saga pattern (preferred for microservices):**
- Break distributed transaction into sequence of local transactions
- Each step has a compensating transaction (undo)
- If step N fails, execute compensations for steps N-1, N-2, ..., 1

**Saga example (order processing):**
```
1. Create Order          | Compensate: Cancel Order
2. Reserve Inventory     | Compensate: Release Inventory
3. Charge Payment        | Compensate: Refund Payment
4. Ship Order            | Compensate: Cancel Shipment

If step 3 fails: refund (if partial), release inventory, cancel order
```

**Saga orchestration vs choreography:**

| Aspect | Orchestration | Choreography |
|--------|--------------|--------------|
| Control | Central orchestrator coordinates | Services react to events |
| Coupling | Orchestrator knows all steps | Services independent |
| Complexity | Easier to understand flow | Complex event chains |
| Failure handling | Centralized compensation | Each service handles own |
| Best for | Complex workflows | Simple, few steps |

**Idempotency (critical for all approaches):**
- Retrying an operation produces the same result
- Use idempotency keys: unique request ID for each operation
- Check: "have I already processed this request?"
```
CREATE TABLE processed_requests (
    idempotency_key UUID PRIMARY KEY,
    result JSONB,
    created_at TIMESTAMP
);
-- Before processing: check if key exists
-- After processing: insert key + result
```

**Outbox pattern:**
- Write event to local database "outbox" table in the same transaction as the business data
- Separate process reads outbox and publishes to message queue
- Guarantees: if data saved, event will be published (eventually)

```
BEGIN TRANSACTION;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  INSERT INTO outbox (event_type, payload) VALUES ('money_transferred', '...');
COMMIT;
-- Background: poll outbox -> publish to Kafka -> mark as published
```

**Rule of thumb:** Avoid distributed transactions when possible (redesign boundaries). Use saga pattern for microservices. Orchestration for complex workflows, choreography for simple ones. Always make operations idempotent. Use the outbox pattern for reliable event publishing.
