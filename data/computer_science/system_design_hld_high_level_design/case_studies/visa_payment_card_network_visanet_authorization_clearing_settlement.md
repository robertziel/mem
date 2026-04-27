### Design a Payment Card Network (Visa/VisaNet Architecture)

**What VisaNet does:** Routes, authorizes, clears, and settles ~65,000 transactions/sec across 200+ countries. Authorization in < 1 second, clearing/settlement in 1-3 days. 99.999% uptime.

**Transaction lifecycle — three phases:**
```
PHASE 1: AUTHORIZATION (real-time, < 1 second)
┌────────┐   ┌──────────┐   ┌─────────┐   ┌─────────────┐   ┌────────┐
│Customer│──>│ Merchant │──>│Acquirer │──>│   VisaNet   │──>│ Issuer │
│ (card) │   │  (POS)   │   │  Bank   │   │ (switching) │   │  Bank  │
└────────┘   └──────────┘   └─────────┘   └─────────────┘   └────────┘
                                                                  │
    Approved◄──────────◄──────────◄──────────◄────────────◄───────┘

PHASE 2: CLEARING (batch, end of day)
Merchant closes batch → Acquirer → VisaNet (BASE II) → Issuer
- Final transaction amounts (tips, adjustments)
- Interchange fees calculated
- Disputes/chargebacks initiated

PHASE 3: SETTLEMENT (T+1 to T+3)
VisaNet computes net positions → instructs banks to transfer funds
- Acquirer receives (merchant payment minus interchange minus fees)
- Issuer pays (cardholder amount minus interchange earned)
- Net settlement: single wire transfer per bank per currency per day
```

**ISO 8583 — the message protocol:**
```
Every card transaction is an ISO 8583 message with:

MTI (Message Type Indicator): 4-digit code
  0100 = Authorization request
  0110 = Authorization response
  0200 = Financial request (single-message)
  0210 = Financial response
  0400 = Reversal request
  0410 = Reversal response
  0420 = Reversal advice (guaranteed delivery)

Key data elements (fields):
  DE 2  = PAN (Primary Account Number)
  DE 3  = Processing code (purchase, refund, etc.)
  DE 4  = Transaction amount
  DE 7  = Transmission date/time
  DE 11 = STAN (System Trace Audit Number) — unique per transaction
  DE 12 = Local time
  DE 37 = Retrieval Reference Number (RRN)
  DE 38 = Authorization code (from issuer)
  DE 39 = Response code (00=approved, 05=declined, 51=insufficient funds)
  DE 41 = Terminal ID
  DE 42 = Merchant ID
  DE 49 = Currency code
```

**Dual-message vs single-message:**
```
Dual-message (credit cards — most common):
  Message 1: Authorization (0100/0110) — real-time, reserves funds
  Message 2: Clearing (BASE II batch) — end of day, triggers settlement
  Gap: hours to days between auth and clearing

Single-message (debit/ATM):
  Message 1: Financial (0200/0210) — auth + clearing in one message
  Settlement follows immediately
  Used for: PIN-based debit, ATM withdrawals
```

**Core design patterns in VisaNet:**

**1. Stand-in processing (STIP) — graceful degradation:**
```
Problem: Issuer bank is unreachable (network outage, timeout)

Solution: VisaNet makes the approve/decline decision on behalf of issuer
- Uses risk models + cardholder spending history
- Pre-configured rules from issuer (max amount, daily limit, MCC restrictions)
- Transaction flagged as "stand-in" for later reconciliation with issuer

Pattern: Circuit breaker + fallback
  IF issuer responds within timeout → use issuer's decision
  IF issuer unreachable → STIP decides using cached rules
  IF STIP can't decide → decline (safe default)
```

**2. Store-and-forward (SAF) — offline resilience:**
```
Problem: Network between merchant and acquirer is down

Solution: Terminal stores transaction locally, forwards when connectivity returns
- POS terminal queues transactions with SAF reference number
- When online: batch-transmits queued transactions
- Each SAF transaction carries timeout indicator
- Acquirer processes as if real-time (may trigger reversal if expired)

Pattern: Write-ahead log + retry queue
  Similar to: Kafka producer buffering, Sidekiq retry
```

**3. Idempotency — prevent double charges:**
```
Problem: Timeout during authorization — was it approved or not?

Solution: Every transaction has a unique identifier (STAN + RRN + terminal + time)
- Retry with same identifiers → VisaNet returns cached response (not re-processed)
- If issuer times out → acquirer sends automatic reversal (0400)
- Reversal is also idempotent — safe to retry

Pattern: Idempotency key = STAN + RRN + date + acquirer ID
  Same as: Stripe's Idempotency-Key header
  Same as: order_id + payment_attempt_id in e-commerce
```

**4. Automatic reversals — timeout safety net:**
```
Problem: Acquirer sent auth request, never received response

Solution: Automatic reversal after timeout
  1. Acquirer sends 0100 (auth request)
  2. No response within 30 seconds
  3. Acquirer sends 0400 (reversal) — "cancel whatever happened"
  4. VisaNet reverses the hold on cardholder's account

If reversal also times out:
  5. Acquirer sends 0420 (reversal advice) — guaranteed delivery
     Advice messages are point-to-point with store-and-forward
     Each link guarantees delivery (not end-to-end, but hop-by-hop)

Pattern: Saga compensation
  Request → Timeout → Compensate (reverse)
  Same as: order saga with payment rollback
```

**5. Dual-message separation — eventual consistency by design:**
```
Authorization (Phase 1): Synchronous, real-time, < 1 sec
  - Reserves funds (hold on cardholder account)
  - Merchant gets approval code
  - No money moves yet

Clearing (Phase 2): Asynchronous, batch, end of day
  - Final amounts (original ± tips, adjustments)
  - Interchange fees calculated
  - Merchant may clear less or more than authorized

Settlement (Phase 3): Asynchronous, T+1 to T+3
  - Net positions computed across all banks
  - Single wire transfer per bank per day per currency

Pattern: CQRS + eventual consistency
  Write side: authorization (fast, synchronous)
  Read side: clearing/settlement (batch, eventually consistent)
  Same as: accept order instantly, fulfill asynchronously
```

**6. BASE II clearing — batch reconciliation:**
```
BASE II (Visa's clearing system):
  1. Acquirer collects day's transactions → clearing file
  2. Clearing file → VisaNet
  3. VisaNet matches clearing records with authorizations
  4. Calculates interchange fees (issuer ↔ acquirer)
  5. Produces settlement file with net positions
  6. Banks settle via central bank wire transfers

Unmatched transactions:
  - Auth without clearing → hold expires (no charge)
  - Clearing without auth → exception processing
  - Amount mismatch → issuer may dispute (chargeback)

Pattern: Event reconciliation (same as our transaction_ledger design)
  Compare two event streams, flag discrepancies
```

**7. Tokenization — security at every hop:**
```
PAN (4111 1111 1111 1234) → Token (4111 11XX XXXX 7890)

- Merchant stores token, not real PAN
- Token is network-specific (Visa token ≠ Mastercard token)
- VisaNet de-tokenizes for issuer (issuer sees real PAN)
- If merchant is breached → tokens are useless without VisaNet

Pattern: Encryption proxy / token vault
  Same as: Stripe's card tokens, Vault service
```

**8. Real-time fraud scoring (RVAA):**
```
Visa Advanced Authorization: ML model scores every transaction
  - Runs in < 1ms during authorization flow
  - Score sent to issuer alongside auth request
  - Issuer can use score to approve/decline/step-up (3DS)
  - Features: spending patterns, geo, velocity, merchant category, device

Pattern: Same as our fraud_detection_realtime design
  Feature store + ML scoring + rule engine + decision in-path
```

**High availability patterns:**
```
┌─────────────────────────────────────────────────────┐
│ VisaNet High Availability                            │
│                                                      │
│ • Active-active data centers (US East + US West)     │
│ • Automatic failover in < 30 seconds                 │
│ • No single point of failure                         │
│ • 99.999% uptime (< 5 min downtime/year)             │
│ • Capacity: 65,000+ transactions/second              │
│ • Peak: 100M+ transactions/day                       │
│                                                      │
│ Patterns:                                            │
│ • Active-active (not active-passive)                 │
│ • Geographic redundancy                              │
│ • Circuit breaker per issuer (STIP fallback)         │
│ • Store-and-forward at every hop                     │
│ • Idempotent retries at every level                  │
│ • Automatic reversals on timeout                     │
└─────────────────────────────────────────────────────┘
```

**How it maps to software design patterns:**

| Visa concept | Software pattern | Your system equivalent |
|---|---|---|
| STIP (stand-in) | Circuit breaker + fallback | Stoplight gem, default response on failure |
| Store-and-forward | Write-ahead log + retry | Kafka, Sidekiq retry, outbox pattern |
| Dual-message | CQRS, eventual consistency | Accept fast, process async |
| Automatic reversal | Saga compensation | Order saga rollback |
| STAN + RRN | Idempotency key | `Idempotency-Key` header |
| BASE II clearing | Batch reconciliation | Daily ledger reconciliation job |
| Tokenization | Token vault / encryption proxy | Stripe tokens, Vault |
| RVAA fraud scoring | In-path ML scoring | Feature store + model serving |
| Active-active DCs | Geographic redundancy | Multi-region deployment |

**Rule of thumb:** Visa's core insight is separating fast synchronous authorization from slow asynchronous clearing/settlement — this is CQRS at planetary scale. Every hop has idempotency (STAN/RRN), every timeout triggers automatic reversal (saga compensation), and every link has store-and-forward (write-ahead log). If the issuer is down, the network decides on its behalf (circuit breaker + fallback). These aren't academic patterns — they process $14 trillion/year.

Sources:
- [VisaNet Technology Overview (Visa)](https://usa.visa.com/dam/VCOM/download/corporate/media/visanet-technology/visa-net-booklet.pdf)
- [Card Network Settlement — Distributed Systems Analysis](https://medium.com/@umutt.akbulut/card-network-settlement-a-comprehensive-architectural-operational-and-distributed-systems-2de92a158b37)
- [How VISA Works — ByteByteGo](https://bytebytego.com/guides/how-does-visa-work-when-we-swipe-a-credit-card-at-a-merchants-shop/)
- [ISO 8583 — The Language of Credit Cards](https://increase.com/articles/iso-8583-the-language-of-credit-cards)
- [Avoiding Double Payments — Airbnb Engineering](https://medium.com/airbnb-engineering/avoiding-double-payments-in-a-distributed-payments-system-2981f6b070bb)
