### Idempotency

**What idempotency means:**
- Performing an operation multiple times produces the same result as performing it once
- Critical in distributed systems where retries are common (network failures, timeouts)
- `f(f(x)) = f(x)`

**Naturally idempotent operations:**
- GET, PUT, DELETE (HTTP) - safe to retry
- `SET key value` in Redis
- `INSERT ... ON CONFLICT DO NOTHING`
- Absolute updates: `SET balance = 100` (not `balance = balance + 10`)

**NOT naturally idempotent:**
- POST (creating a new resource)
- `INSERT INTO orders` (creates duplicate rows)
- Relative updates: `UPDATE accounts SET balance = balance - 100`
- Sending an email/notification
- Charging a credit card

**Making operations idempotent:**

**1. Idempotency key (most common):**
- Client generates a unique key per logical operation
- Server checks: "have I already processed this key?"

```python
def process_payment(idempotency_key, amount, user_id):
    # Check if already processed
    existing = db.query(
        "SELECT result FROM processed_requests WHERE key = %s",
        idempotency_key
    )
    if existing:
        return existing.result  # return cached result

    # Process the payment
    result = charge_card(user_id, amount)

    # Store result with idempotency key
    db.execute(
        "INSERT INTO processed_requests (key, result, created_at) VALUES (%s, %s, NOW())",
        idempotency_key, result
    )
    return result
```

**2. Database constraints:**
```sql
-- Unique constraint prevents duplicate insertion
CREATE UNIQUE INDEX idx_order_ref ON orders(reference_id);
INSERT INTO orders (reference_id, amount) VALUES ('ord_abc123', 100)
  ON CONFLICT (reference_id) DO NOTHING;
```

**3. Conditional updates (optimistic locking):**
```sql
UPDATE accounts SET balance = balance - 100, version = version + 1
WHERE id = 1 AND version = 5;
-- Only succeeds if version matches (no concurrent modification)
```

**4. State machine:**
- Order can only transition: pending -> paid -> shipped
- If already "paid", retry of payment is a no-op
- Check current state before applying transition

**Where idempotency is needed:**
- Payment processing (Stripe uses idempotency keys)
- API endpoints that create resources
- Message queue consumers (at-least-once delivery means duplicates)
- Webhook handlers (providers retry on failure)
- Database migrations

**Cleanup:**
- Expire old idempotency records (TTL, e.g., 24-48 hours)
- Same key within TTL returns cached result
- After TTL, key can be reused

**Rule of thumb:** Every API that modifies state should support idempotency keys. Every queue consumer should be idempotent. Use database constraints as a safety net. Make operations absolute (`SET x = 5`) rather than relative (`x += 5`) when possible.
