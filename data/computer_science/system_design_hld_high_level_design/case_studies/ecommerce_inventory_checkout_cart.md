### System Design: E-Commerce (Inventory, Cart, Checkout)

**Scope:** browse → add to cart → checkout with inventory reservation → payment → fulfillment. Flash sales as the hard case.

**Service breakdown:**

| Service | Owns | Storage |
|---|---|---|
| Product / Catalog | SKUs, pricing, descriptions, search | Primary DB + Elasticsearch (search) |
| Cart | User cart state | Redis (active) + DB (persisted on checkout) |
| Inventory | Stock counts, reservations | Redis (hot) + DB (source of truth) |
| Order | Lifecycle, state machine | Sharded DB (by user_id or order_id) |
| Payment | Charge, refund, idempotency | Per-transaction DB + external PSP |
| Notification | Email, push, SMS | Async via queue |

**The inventory problem (the hardest single piece):**

| Strategy | Mechanism | Concurrency safety | Cost | Best for |
|---|---|---|---|---|
| **Naive read-then-write** | `SELECT stock; UPDATE` | ❌ Oversells | Cheap | Never |
| **Pessimistic lock** | `SELECT ... FOR UPDATE` row lock | ✅ Safe | Locks block — slow under contention | Few hot SKUs, low TPS |
| **Optimistic with guard** | `UPDATE ... WHERE id=? AND stock > 0`, check `rows_affected` | ✅ Safe — retry/fail on 0 rows | Cheap, no locks | **Default for most catalogs** |
| **Atomic DB counter** | Single-statement `UPDATE stock = stock - 1` (relies on DB row lock internally) | ✅ Safe | Same as optimistic | Equivalent of optimistic |
| **Redis `DECR`** | Atomic decrement; rollback with `INCR` if negative | ✅ Safe, very fast | RAM cost; sync to DB async | **Flash sales / hot SKUs** |
| **Reservation queue** | Token bucket per SKU; first N consumers win | ✅ Safe + fair | Latency for "did I win?" | High-stakes drops (sneakers, GPUs) |

**Optimistic update — the canonical idiom:**

```sql
UPDATE products SET stock = stock - 1
 WHERE id = ? AND stock > 0;
-- if affected_rows = 0  →  out of stock (do NOT retry the same call)
```

**Redis flash-sale pattern:**

```
DECR inventory:product:123        -- atomic, returns new value n
if n < 0:  INCR inventory:product:123  → return "sold out"
else:      proceed to reserve+checkout, async-sync to DB
```

> **Why Redis for flash sales:** a single DB row becomes the bottleneck at thousands of concurrent buyers. Redis can do millions of `DECR/INCR` per second; the DB receives reconciled writes in batch.

**Cart storage — pick by use case:**

| Approach | Pros | Cons | Default? |
|---|---|---|---|
| Client-side (localStorage) | No server load | Lost on device switch | Anonymous browse only |
| Session in Redis | Fast, simple, TTL | Lost when session expires | **Active carts (TTL ~7 days)** |
| Persisted to DB | Survives forever, multi-device | Higher write cost, latency | **On checkout** (commit cart → order) |

**Checkout flow — every step has a failure path:**

| # | Step | On failure |
|---|---|---|
| 1 | Validate cart (prices, availability now vs at add-to-cart time) | Show "price changed" / "no longer available" |
| 2 | **Reserve inventory** (soft hold for 10–15 min) | Out-of-stock — release reservation immediately |
| 3 | Compute total (items + tax + shipping − discounts) | Surface tax/shipping calc errors as soft warnings |
| 4 | **Charge payment** with **idempotency key** | Failure → release reservation, mark `PAYMENT_FAILED` |
| 5 | Decrement inventory **permanently** + finalize order | (DB transaction with order create) |
| 6 | Send confirmation async (email / push) | Retry — order is already final |
| Background | Reaper releases expired reservations | Cron / scheduled job |

**Order state machine:**

```
CREATED → PAYMENT_PENDING → PAID → PROCESSING → SHIPPED → DELIVERED
                            │
                            └→ REFUND_REQUESTED → REFUNDED

CREATED → PAYMENT_PENDING → PAYMENT_FAILED → CANCELLED
```

| Transition | Trigger | Side effect |
|---|---|---|
| `CREATED → PAYMENT_PENDING` | Submit order | Reserve inventory (soft) |
| `→ PAID` | PSP webhook / sync response success | Permanent inventory decrement; release soft reservation |
| `→ PAYMENT_FAILED` | PSP decline / timeout | Release reservation, allow retry |
| `→ CANCELLED` | User or fraud system | Release reservation if still held |
| `→ SHIPPED` | Warehouse system event | Notify user |
| `→ REFUNDED` | Manual / policy | Restore inventory, charge reversal at PSP |

**Flash-sale architecture:**

| Layer | Technique |
|---|---|
| Edge | CDN for product page; cache aggressively |
| API gateway | Rate-limit per IP / per user before traffic hits services |
| Inventory hot path | **Redis `DECR`**, reservation token in Redis with TTL |
| Queue overflow | Front the inventory check with a queue — first N tokens win, rest see "sold out" |
| Read/write split | Read path (browse) cached; write path (DECR) goes straight to Redis |
| DB | Async reconciliation from Redis state |

**Scaling each concern:**

| Concern | Pattern |
|---|---|
| Product catalog reads | Read replicas + Elasticsearch / OpenSearch for search |
| Cart | Redis cluster, shard by `user_id` |
| Inventory hot SKUs | Redis cluster, shard by `product_id` |
| Inventory cold SKUs | DB with optimistic UPDATE |
| Orders | DB sharded by `user_id` (read patterns) or `order_id` (write distribution) |
| Notifications, analytics | Async via message queue (Kafka / SQS) |
| Payment | Idempotency key; retries safe; PSP-side dedup |

**Idempotency — non-negotiable for payments:**

| Where | Idempotency key |
|---|---|
| Cart → Order create | `cart_id` + `cart_version` (so resubmits don't double-create) |
| Order → PSP charge | `order_id` (PSP must dedupe on this) |
| Webhook receive | `event_id` from PSP — record-and-skip-on-dup |

**Failure modes you must handle:**

| Failure | Recovery |
|---|---|
| Payment timeout (no response) | Treat as ambiguous → reconcile via webhook + status query before charging again |
| User refreshes during checkout | Idempotent flow — same `cart_id` returns the same `order_id` |
| Soft reservation expires mid-flow | Re-validate inventory at confirm; release if no longer available |
| Race between two carts for last unit | Optimistic update or Redis DECR — exactly one wins |
| Inventory drift (Redis vs DB) | Periodic reconciliation job; DB is source of truth |

**Rule of thumb:** the central problem is **inventory consistency under concurrency**. Use **optimistic UPDATE with `WHERE stock > 0`** for normal catalog, **Redis `DECR` + reservation TTL** for flash sales. Always **reserve at checkout start, release on timeout/failure**, decrement permanently only on payment success. Separate **read paths (cached, eventually consistent)** from **write paths (atomic, consistent)**. Idempotency keys on every mutation that touches money.
