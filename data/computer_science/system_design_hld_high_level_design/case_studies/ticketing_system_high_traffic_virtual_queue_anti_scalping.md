### Design a High-Traffic Ticketing System (Ticketmaster / BookMyShow scale)

**Requirements:**
- 10M+ users hitting /buy simultaneously at T=0 (Taylor Swift drop, BTS, World Cup final)
- Prevent double-booking any single seat (strongest correctness requirement)
- Seat-hold with short TTL, then pay, then confirm
- Bot / scalper defense (real humans buying for themselves)
- Fair queueing — no "refresh-and-win"
- Graceful degradation when backend saturates
- Full audit trail (every hold, payment, cancellation)

**The thundering herd problem:**
```
At T=0 (tickets go on sale):
  - 10M users click "Buy" within the same second
  - Venue has 50K seats total
  - 200× oversubscription
  - Naive system: 10M DB writes/sec → DB melts; random users lose
  - Need: hard throttle at edge, fair queueing, backend protected
```

**Architecture:**
```
┌──────────┐    ┌────────────────────┐    ┌──────────────┐
│  Client  │───>│  Edge (CDN + WAF)  │───>│ Virtual Queue│ (Queue-it / in-house)
│ (browser)│    │  bot filter, rate  │    │ (waiting room│
└──────────┘    │  limit, static HTML│    │  — FIFO token│
                └────────────────────┘    └──────┬───────┘
                                                  │ admission token
                                                  ▼
                                          ┌────────────────┐
                                          │ Seat Selection │
                                          │ Service (read) │
                                          └──────┬─────────┘
                                                 │
                    ┌────────────────────────────┼────────────────────┐
                    ▼                            ▼                    ▼
           ┌────────────────┐          ┌──────────────────┐   ┌──────────────┐
           │ Hold Service   │          │ Seat Inventory   │   │ Payment Queue│
           │ (Redis locks   │──────────│ (sharded by show)│   │ (decoupled)  │
           │  + fencing)    │          │ PostgreSQL +     │   │              │
           └────────────────┘          │ Redis bitmap     │   └──────┬───────┘
                                        └──────────────────┘          │
                                                                       ▼
                                                              ┌────────────────┐
                                                              │ Payment Gateway│
                                                              │ (Stripe/Adyen) │
                                                              └────────────────┘
```

**1. Virtual queue / waiting room (admission control):**
```
Why: backend can handle 10K req/sec. You have 10M users. Let them in gradually.

Flow:
  1. User clicks "Buy" before or at T=0
  2. Served a waiting room page (static, from CDN)
  3. WebSocket/SSE to queue service assigns a token: position N
  4. Queue admits users at sustainable rate (e.g., 5K/sec)
  5. When admitted: redirect to seat selection with signed admission token
  6. Seat selection validates token (HMAC signature, not in DB — infinite scale)

Fairness rules:
  - FIFO based on arrival at queue (NOT refresh-to-win)
  - Session persisted — refreshing keeps your position
  - Pre-queue (5 min before T=0) shuffled randomly → no advantage to "click at 11:59:59.000"

Tools: Queue-it (SaaS), BookMyShow in-house, Ticketmaster in-house
```

**2. Seat inventory — the hot-row problem:**
```
Naive approach (BROKEN at scale):
  UPDATE seats SET status='held', held_by=? WHERE show_id=? AND seat_id=?
  → One show = one hot DB partition = all writes hit one node

Solution: two-tier inventory
  Layer 1: Redis bitmap per show (fast reads, atomic operations)
    - Key: "seats:{show_id}:{section}"
    - Value: bitmap where bit N = seat N availability (0=free, 1=held)
    - Redis SETBIT with Lua script for atomic check-and-hold
    - Sharded by show_id across Redis cluster
  
  Layer 2: PostgreSQL (source of truth, async reconciliation)
    - Actual booking rows, idempotency keys, audit
    - Written AFTER Redis confirms hold
    - Reconcile periodically (bitmap vs DB)

Critical: no single seat_id row ever becomes a hot row.
          Show-level sharding distributes load across shards.
```

**3. Seat hold — distributed locking with fencing:**
```
Problem: hold a seat for 10 minutes, then release if unpaid.

Redis Redlock with fencing tokens:
  HOLD seat = SET hold:{show}:{seat} {user_id}:{fencing_token} NX EX 600
  
Why fencing tokens: prevent zombie hold (client thought it got lock, GC paused 15 min,
  another client got lock, original client wakes up and thinks it still has it).
  Include monotonic fencing token in every seat operation; inventory service
  rejects operations with stale tokens.

Hold TTL: 10 min typical
Cleanup: Redis key expiry auto-releases held seats
Audit: every hold/release written to Kafka (not inline, async)
```

**4. Anti-bot / anti-scalping defenses:**
```
Layer 1: Edge (Cloudflare / CloudFront + WAF)
  - Rate limit per IP: 60 req/min to /buy endpoint
  - JA3/JA4 TLS fingerprint blacklists (known bot fingerprints)
  - Challenge (CAPTCHA / proof-of-work) suspicious traffic

Layer 2: Account checks (pre-queue)
  - Account age > 30 days
  - Verified phone / email
  - Purchase history
  - Payment method age / verified

Layer 3: Behavioral during purchase
  - Mouse movement / typing cadence (humans vs headless)
  - Time-to-complete form (bots are too fast or too consistent)
  - Purchase limit: 4 tickets per account per show

Layer 4: Post-purchase
  - Name-on-ticket (transferring = re-verification)
  - Delayed reveal (seat assigned at venue entry, not at purchase)
  - Secondary market tie-in (official resale only at face value)

No single layer is bulletproof — layered defense required.
```

**5. Payment decoupling (don't hold DB connections through Stripe):**
```
Flow:
  1. User pays: POST /pay with hold_token
  2. Payment service:
     a. Verify hold is still valid (Redis check)
     b. Enqueue to payment queue (Kafka topic payments.pending)
     c. Return "processing, check status at /status/{tx_id}"
  3. Payment worker (dedicated consumer):
     a. Charge Stripe with idempotency_key=hold_token
     b. On success: commit seat to PostgreSQL, extend hold, notify user
     c. On failure: release hold, notify user
  4. Frontend polls or uses WebSocket for status

Why decouple: Stripe p99 can be 5-10s. Holding a DB connection for that
              blocks other users. Async = DB connections stay brief.
```

**6. Cache invalidation for seat maps (read side):**
```
Problem: 1M users watching the same seat map. Someone holds seat A5.
         How do all 1M see it as "taken" within seconds?

Architecture:
  - WebSocket / SSE fan-out per show
  - Seat-level updates pushed (delta, not full map)
  - Redis pub/sub → WebSocket servers → clients
  - Fallback: HTTP polling every 3-5s for non-WebSocket clients

Scaling:
  - WebSocket connections: use purpose-built gateway (ACloud WebSocket API,
    self-hosted SocketIO cluster, or streaming service like Phoenix/Ably)
  - Shard by show_id — all watchers of show X connect to same cluster
```

**7. Graceful degradation:**
```
When backend saturates:
  - Shed load at edge (return 503 with waiting-room link)
  - Queue admission rate drops automatically (monitor backend p99)
  - Read-only mode: show event info, no new holds accepted
  - Degrade features: disable seat map animations, send static images

Circuit breakers:
  - Payment service down → don't accept new holds (user in queue gets told "try back")
  - DB lag > 5s → pause new holds until it catches up
  - Redis cluster losing quorum → fail closed (no new holds, existing holds honored)
```

**8. Data model:**
```sql
-- Shows: sharded by show_id hash
CREATE TABLE shows (
  id              BIGINT PRIMARY KEY,
  event_id        BIGINT NOT NULL,
  venue_id        BIGINT NOT NULL,
  starts_at       TIMESTAMPTZ NOT NULL,
  sale_starts_at  TIMESTAMPTZ NOT NULL,
  total_seats     INT NOT NULL,
  held_count      INT NOT NULL DEFAULT 0,   -- denormalized for dashboards
  sold_count      INT NOT NULL DEFAULT 0
);

-- Seats: generated per-show (or templated per-venue)
CREATE TABLE seat_inventory (
  show_id         BIGINT NOT NULL,
  seat_id         INT NOT NULL,
  status          TEXT NOT NULL,  -- available/held/sold
  held_by         BIGINT,          -- user_id
  hold_token      TEXT,            -- fencing token
  held_until      TIMESTAMPTZ,
  booking_id      BIGINT,          -- NULL until paid
  PRIMARY KEY (show_id, seat_id)
) PARTITION BY HASH (show_id);

-- Bookings (immutable once confirmed)
CREATE TABLE bookings (
  id                  BIGINT PRIMARY KEY,
  show_id             BIGINT NOT NULL,
  user_id             BIGINT NOT NULL,
  seat_ids            INT[] NOT NULL,
  total_cents         BIGINT NOT NULL,
  payment_idem_key    TEXT NOT NULL UNIQUE,
  payment_ref         TEXT,
  status              TEXT NOT NULL,  -- confirmed/refunded/voided
  created_at          TIMESTAMPTZ NOT NULL
);
```

**Capacity estimates:**
```
Peak: 10M concurrent users, 50K seats sold over 5 min

Virtual queue throughput: 5K admissions/sec sustained
Edge: 500K req/sec peak (most served waiting-room static)
Redis cluster: 200K ops/sec per shard, show sharded
PostgreSQL: 5K writes/sec (only confirmed bookings, after Redis hold)
WebSocket fan-out: 1M concurrent connections per show cluster

Storage:
  50K seats × 200 bytes each = 10 MB per show in DB
  Bitmap in Redis: 50K bits = 6.25 KB per show
  Thousands of shows active: negligible
```

**Rule of thumb:** The bottleneck isn't the database — it's fairness and abuse resistance. Use a virtual queue (FIFO admission) to protect backends from 100× oversubscription. Store seat inventory in a Redis bitmap for atomic holds; PostgreSQL is truth-of-record, written only after confirm. Shard everything by show_id to avoid hot partitions. Decouple payment from DB — async via queue, not inline. Layer bot defenses (edge, account, behavioral, post-purchase). Fail gracefully — return waiting-room page before melting the backend.
