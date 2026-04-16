### System Design: E-Commerce (Inventory, Cart, Checkout)

**Requirements:**
- Browse products with search and filtering
- Add to cart, manage cart
- Checkout with inventory reservation
- Handle flash sales (high concurrency on limited inventory)
- Payment processing and order management

**High-level design:**
```
[Client] -> [API Gateway] -> [Product Service] (catalog, search)
                           -> [Cart Service] (user cart state)
                           -> [Inventory Service] (stock management)
                           -> [Order Service] (checkout, order lifecycle)
                           -> [Payment Service] (charge, refund)
                           -> [Notification Service] (email, push)
```

**The inventory problem (hardest part):**

**Naive approach (breaks under concurrency):**
```sql
-- Thread A and Thread B both read stock = 1
SELECT stock FROM products WHERE id = 1;  -- returns 1
-- Both decrement
UPDATE products SET stock = stock - 1 WHERE id = 1;
-- Stock goes to -1 (oversold!)
```

**Solution: Pessimistic locking:**
```sql
BEGIN;
SELECT stock FROM products WHERE id = 1 FOR UPDATE;  -- lock row
-- Check stock > 0
UPDATE products SET stock = stock - 1 WHERE id = 1;
COMMIT;
```

**Solution: Optimistic locking (better for reads):**
```sql
UPDATE products SET stock = stock - 1
WHERE id = 1 AND stock > 0;
-- Returns rows_affected = 0 if out of stock (retry or fail)
```

**Solution: Redis for flash sales:**
```
DECR inventory:product:123
-- Atomic decrement, returns new value
-- If result < 0: INCR to restore, return "sold out"
```

**Cart design:**
| Approach | Pros | Cons |
|----------|------|------|
| Client-side (localStorage) | No server load | Lost on device switch |
| Session-based (Redis) | Fast, temporary | Lost on session expire |
| Database-persisted | Survives sessions, multi-device | Higher latency, storage cost |

Best practice: Redis for active carts (TTL 7 days), persist to DB on checkout.

**Checkout flow:**
```
1. Validate cart items (prices, availability)
2. Reserve inventory (soft lock for 10 min)
3. Calculate total (items + tax + shipping - discounts)
4. Process payment (idempotency key)
5. Confirm order (decrement inventory permanently)
6. Send confirmation (email/push)

If payment fails: release inventory reservation
If timeout: background job releases expired reservations
```

**Order state machine:**
```
CREATED -> PAYMENT_PENDING -> PAID -> PROCESSING -> SHIPPED -> DELIVERED
                           -> PAYMENT_FAILED -> CANCELLED
PAID -> REFUND_REQUESTED -> REFUNDED
```

**Flash sale handling:**
- Pre-warm inventory count in Redis
- Rate limit requests at API gateway
- Queue overflow requests (async processing)
- Use Redis atomic DECR for inventory
- Separate read path (cached product pages) from write path (inventory)

**Scaling:**
- Product catalog: read replicas + Elasticsearch for search
- Cart: Redis cluster (sharded by user_id)
- Inventory: Redis for hot products, DB for source of truth
- Orders: sharded by user_id or order_id
- Async: order confirmation email, analytics via message queue

**Rule of thumb:** The core challenge is inventory consistency under concurrency. Use optimistic locking for normal traffic, Redis atomic operations for flash sales. Reserve inventory at checkout start, release on timeout/failure. Separate read (cached) from write (consistent) paths.
