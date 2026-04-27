### Idempotency (STAN/RRN) — Exactly-Once Payment Processing

**Visa context:** Every transaction in VisaNet has a unique identifier composed of STAN (System Trace Audit Number), RRN (Retrieval Reference Number), acquirer ID, and date. If a request is retried (due to timeout), VisaNet recognizes the duplicate and returns the original response instead of processing it again. This prevents double charges — the most critical correctness requirement in payments.

**How it works in VisaNet:**
```
First attempt:
  Acquirer → 0100 { STAN=123456, RRN=987654321012, date=20250615 }
  VisaNet → Issuer → approved → 0110 { auth_code=A12345 }
  VisaNet caches: key(STAN+RRN+date+acquirer) → response(approved, A12345)

Retry (timeout, didn't receive response):
  Acquirer → 0100 { STAN=123456, RRN=987654321012, date=20250615 }  ← same key
  VisaNet recognizes duplicate → returns cached response
  → 0110 { auth_code=A12345 }  ← same response, NOT a new authorization

The issuer is NOT contacted again. The cardholder is NOT charged twice.
```

**Idempotency key composition:**
```
Key = STAN + RRN + Transaction Date + Acquirer ID

STAN (DE 11): 6-digit number, unique per terminal per day
  - Assigned by the terminal/acquirer
  - Cycles: 000001-999999, resets daily

RRN (DE 37): 12-character reference, unique per acquirer
  - Assigned by the acquirer
  - Used to match auth with clearing (cross-message reference)

Together: globally unique per transaction
  - Even if two acquirers use the same STAN, different acquirer IDs distinguish them
  - Date prevents collision with yesterday's STAN
```

**Reversal idempotency (equally critical):**
```
First reversal:
  Acquirer → 0400 { STAN=123456, original_STAN=123456 }
  VisaNet → Issuer → reversed
  VisaNet caches: key(reversal+original_STAN) → reversed

Retry reversal:
  Acquirer → 0400 { STAN=123456, original_STAN=123456 }  ← same
  VisaNet → returns cached reversal response
  → cardholder's hold is released exactly once
```

**General software pattern: Idempotency Key**

```ruby
# Pattern 1: Database unique constraint (simplest)
class PaymentProcessor
  def charge(order_id:, amount:, idempotency_key:)
    # Check if already processed
    existing = Payment.find_by(idempotency_key: idempotency_key)
    return existing.result if existing

    # Process and store result atomically
    ActiveRecord::Base.transaction do
      payment = Payment.create!(
        idempotency_key: idempotency_key,  # UNIQUE constraint
        order_id: order_id,
        amount: amount,
        status: "processing"
      )

      result = PaymentGateway.charge(amount, idempotency_key: idempotency_key)
      payment.update!(status: "completed", result: result)
      result
    end
  rescue ActiveRecord::RecordNotUnique
    # Race condition: another thread inserted first
    Payment.find_by!(idempotency_key: idempotency_key).result
  end
end

# Pattern 2: Redis-based idempotency (for high throughput)
class IdempotencyGuard
  TTL = 24.hours

  def self.execute(key, &block)
    # Try to set key atomically (NX = only if not exists)
    locked = Redis.current.set("idempotency:#{key}", "processing", nx: true, ex: TTL)

    unless locked
      # Already processed — fetch cached result
      cached = Redis.current.get("idempotency:result:#{key}")
      return JSON.parse(cached) if cached
      raise "Processing in progress"  # another thread is working on it
    end

    # Execute the operation
    result = block.call

    # Cache the result
    Redis.current.set("idempotency:result:#{key}", result.to_json, ex: TTL)
    result
  rescue => e
    # DANGER: do NOT blindly delete the key on exception — the side effect
    # (charge, email, external API call) may have already completed before
    # the raise. Deleting the key enables retries that cause duplicate
    # side effects. Instead, record state (failed/unknown) and only retry
    # after verifying the outcome with the external system.
    Redis.current.set("idempotency:result:#{key}",
                      { status: "failed", error: e.message }.to_json, ex: TTL)
    raise
  end
end

# Usage:
IdempotencyGuard.execute("charge:order_789:attempt_1") do
  PaymentGateway.charge(amount: 1000)
end
```

**Idempotency key design considerations:**
```
What makes a good key:
  ✅ order_id + payment_attempt (covers retries for same order)
  ✅ user_id + action + timestamp_bucket (covers rate-limited actions)
  ✅ request_id from client (Stripe's Idempotency-Key header)

What makes a bad key:
  ❌ Random UUID per request (defeats purpose — every retry is "new")
  ❌ Just the order_id (can't retry with different amount after failure)
  ❌ User ID alone (blocks all future payments for that user)

Key lifecycle:
  - TTL: 24-48 hours (long enough for retries, short enough to not fill storage)
  - On failure: delete key (allow retry with same key)
  - On success: cache result for TTL (return cached on retry)
```

**The three guarantees:**
```
At-most-once:  fire and forget (may lose requests)
At-least-once: retry until acknowledged (may duplicate)
Exactly-once:  at-least-once delivery + idempotent processing

Visa achieves exactly-once:
  - At-least-once delivery: acquirer retries on timeout
  - Idempotent processing: STAN/RRN deduplication at VisaNet

Your system achieves exactly-once:
  - At-least-once: Sidekiq/Kafka retries
  - Idempotent: unique constraint on idempotency_key
```

**Where you see this pattern:**
- Stripe: `Idempotency-Key` header on every POST
- AWS: `ClientToken` on EC2 RunInstances (prevents duplicate VMs)
- Kafka: producer idempotency (PID + sequence number)
- gRPC: client retry with same request ID
- HTTP: `If-None-Match` / `ETag` for conditional requests

**Rule of thumb:** Every mutation endpoint needs an idempotency key. Compose the key from business identifiers (order_id + attempt), not random values. Store the key + result together atomically. Return the cached result on duplicate requests. Set a TTL on idempotency records (24h is typical). On failure, record state (processing/succeeded/failed/unknown) rather than deleting the key — blindly deleting can cause duplicate side effects if the mutation already completed before the error. This is how you achieve exactly-once semantics in a distributed system.
