### Automatic Reversals — Timeout-Triggered Compensation

**Visa context:** If an acquirer sends an authorization request (0100) and doesn't receive a response within the timeout window, it automatically sends a reversal (0400/0420) to cancel whatever may have happened. Prevents "ghost holds" on cardholder accounts.

**How it works in VisaNet:**
```
Happy path:
  Acquirer ──0100──> VisaNet ──> Issuer ──0110──> VisaNet ──> Acquirer
            (auth request)              (auth response: approved)

Timeout path:
  Acquirer ──0100──> VisaNet ──> Issuer ──✗ (no response within 30s)
  Acquirer ──0400──> VisaNet ──> Issuer
            (reversal: "undo whatever happened")

Reversal also times out:
  Acquirer ──0400──> VisaNet ──> ✗ (no response)
  Acquirer ──0420──> VisaNet ──> Issuer
            (reversal advice: guaranteed delivery, store-and-forward)
```

**Request vs advice messages (critical distinction):**
```
Request (0100, 0400):
  - End-to-end: acquirer ↔ issuer
  - Has timeout → triggers auto-reversal if no response
  - Response expected within timeout window

Advice (0420):
  - Point-to-point: each link guarantees delivery
  - Store-and-forward: queued at each hop until delivered
  - No timeout — guaranteed to eventually reach destination
  - Used when the outcome MUST be communicated (reversals, completions)
```

**Reversal reason codes (ISO 8583 Field 39 in 04xx):**
```
06 = Error (general)
68 = Response received too late (timeout at network)
82 = Timeout at issuer (negative issuer response)
96 = System malfunction
```

**General software pattern: Saga Compensation with Timeout**

```ruby
# Same pattern: API call with automatic rollback on timeout
class PaymentProcessor
  TIMEOUT = 30.seconds

  def charge(order)
    # Step 1: Attempt the charge
    charge_id = nil
    begin
      Timeout.timeout(TIMEOUT) do
        charge_id = PaymentGateway.authorize(
          amount: order.total,
          idempotency_key: "auth:#{order.id}"
        )
      end
    rescue Timeout::Error
      # Step 2: Auto-reverse on timeout (0400 equivalent)
      reverse_if_needed(order)
      raise PaymentTimeoutError, "Authorization timed out, reversal sent"
    end

    charge_id
  end

  private

  def reverse_if_needed(order)
    # Send reversal (like 0400) — best effort
    begin
      Timeout.timeout(10) do
        PaymentGateway.reverse(idempotency_key: "auth:#{order.id}")
      end
    rescue Timeout::Error
      # Reversal also timed out → queue guaranteed delivery (like 0420 advice)
      ReversalAdviceJob.perform_later(order.id)
    end
  end
end

# Guaranteed delivery job (like 0420 advice message)
class ReversalAdviceJob < ApplicationJob
  sidekiq_options retry: 25  # retry for days if needed — MUST eventually deliver

  def perform(order_id)
    PaymentGateway.reverse(idempotency_key: "auth:#{order_id}")
  end
end
```

**The three-tier timeout escalation:**
```
Tier 1: Request with timeout (0100 → timeout → 0400)
  "Try the thing, reverse if it times out"

Tier 2: Reversal with timeout (0400 → timeout → 0420)
  "Try to reverse, escalate to guaranteed delivery if that also times out"

Tier 3: Advice with guaranteed delivery (0420, store-and-forward)
  "This WILL be delivered, no matter how many retries it takes"
```

**Where you see this pattern:**
- Database transactions: `BEGIN` → timeout → `ROLLBACK`
- Distributed sagas: order placed → payment fails → release inventory
- Two-phase commit: prepare → timeout → abort
- HTTP requests: POST → timeout → check status → compensate if needed

**Rule of thumb:** Every mutation that might timeout needs a planned reversal path. Escalate from "try to reverse" (request with timeout) to "guaranteed delivery" (advice with store-and-forward retry). The reversal itself must be idempotent — safe to retry indefinitely. Never assume a timed-out request failed — it might have succeeded; always send the reversal to be safe.
