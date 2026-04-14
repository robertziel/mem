### Dual-Message Processing — CQRS at Planetary Scale

**Visa context:** Credit card transactions use two separate messages: a real-time authorization (< 1 sec) and a batch clearing message (end of day). The authorization reserves funds; clearing triggers actual money movement. This separation is the foundation of card payment economics.

**How it works in VisaNet:**
```
Message 1 — Authorization (real-time):
  0100 request → VisaNet → Issuer → 0110 response
  - Reserves funds (hold on cardholder account)
  - Merchant gets approval code
  - NO money moves yet
  - Takes < 1 second

         ~~~~ hours to days later ~~~~

Message 2 — Clearing (batch, via BASE II):
  Merchant closes day → Acquirer batches transactions → VisaNet
  - Final amounts (original ± tips, adjustments, tax)
  - Interchange fees calculated
  - Settlement positions computed
  - Actual money movement triggered
```

**Why separate? (not a technical limitation — a business design):**
```
1. Tips: restaurant auth is $50, clearing is $58 (tip added after auth)
2. Hotels: auth for $500/night, clearing for $2,847 (5 nights + minibar)
3. Gas stations: auth for $1 (pump pre-auth), clearing for $45.67
4. Returns: auth approved, then merchant voids before clearing
5. Partial shipments: auth for full order, clear only shipped items

The final amount is often DIFFERENT from the authorized amount.
Auth = "can this card pay roughly this much?"
Clearing = "here's the actual charge"
```

**Single-message processing (debit/ATM — comparison):**
```
Message 1 — Financial (0200/0210):
  Contains BOTH authorization AND clearing data
  Settlement follows immediately
  Used for: PIN debit, ATM withdrawals, real-time payments

Why debit is single-message:
  - Amount is exact (no tips, no adjustments)
  - Deducted from bank account immediately
  - No "hold and adjust later" flow needed
```

**General software pattern: CQRS (Command Query Responsibility Segregation)**

```ruby
# VISA's dual-message IS CQRS:
#   Authorization = Command (write side) — fast, synchronous
#   Clearing      = Query/Projection (read side) — batch, eventually consistent

# Same pattern in your application:

# Write side: accept order fast (like authorization)
class OrdersController < ApplicationController
  def create
    order = Order.create!(params)               # "authorized"
    OrderFulfillmentJob.perform_later(order.id)  # clearing happens async
    render json: { order_id: order.id, status: "accepted" }, status: :created
  end
end

# Read side: process asynchronously (like clearing/settlement)
class OrderFulfillmentJob < ApplicationJob
  def perform(order_id)
    order = Order.find(order_id)
    ChargePayment.call(order)        # actual money movement
    ReserveInventory.call(order)     # actual stock deduction
    CreateShipment.call(order)       # actual shipping label
    order.update!(status: "fulfilled")
  end
end
```

**Auth-clearing amount mismatch handling:**
```
Scenarios:
  Auth $100, Clear $100  → normal (exact match)
  Auth $100, Clear $110  → over-clearing (tips, incidentals) — allowed within tolerance
  Auth $100, Clear $80   → under-clearing (partial shipment) — allowed
  Auth $100, Clear $0    → no clearing (void) — hold expires after 7-30 days
  Auth $100, Clear $200  → exceeds tolerance — issuer may reject or chargeback

Tolerance rules (Visa):
  - Restaurants: up to 20% over auth (tips)
  - Hotels/rental: incremental auths allowed
  - General: clearing ≤ authorized amount (strict)
```

**Where you see this pattern:**
- E-commerce: place order (instant) → fulfill (async) → charge (settlement)
- Ride-sharing: estimate fare (auth) → trip ends → actual fare (clearing)
- Subscriptions: pre-auth monthly → usage calculated → charge actual amount
- Cloud billing: provision resources → meter usage → invoice at month end

**Rule of thumb:** Separate the fast "can we do this?" decision (authorization/command) from the slow "let's actually do it" process (clearing/fulfillment). Accept that the final amount may differ from the initial estimate. This decoupling is what allows Visa to process 65K transactions/sec — the hard work (fee calculation, settlement, reconciliation) happens in batch, not in the real-time path.
