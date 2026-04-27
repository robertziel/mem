### Payment State Machine — Lifecycle and Transitions

**Problem:** A payment goes through multiple states (created, authorized, captured, refunded, voided, failed). Each state has rules about what transitions are legal. Without a strict state machine, you get impossible states (refunding an uncaptured payment) and lost money.

**Payment lifecycle states:**
```
                    ┌──────────┐
                    │ CREATED  │ (payment intent exists, no action yet)
                    └────┬─────┘
                         │ authorize
                    ┌────▼─────┐
              ┌─────│AUTHORIZED│─────┐
              │     └────┬─────┘     │
         void │          │ capture   │ auth expires
              │     ┌────▼─────┐     │ (7-30 days)
              │     │ CAPTURED │     │
              │     └────┬─────┘     │
              │          │           │
              │    ┌─────▼─────┐     │
              │    │  SETTLED  │     │
              │    └─────┬─────┘     │
              │          │ refund    │
              │    ┌─────▼──────┐    │
              │    │  REFUNDED  │    │
              │    │(full/partial)   │
              │    └────────────┘    │
              │                      │
         ┌────▼─────┐         ┌─────▼────┐
         │  VOIDED  │         │ EXPIRED  │
         └──────────┘         └──────────┘

         ┌──────────┐
         │  FAILED  │  (can occur at any transition)
         └──────────┘
```

**Legal state transitions (enforced, not optional):**

| From | To | Trigger | Reversible? |
|------|-----|---------|-------------|
| created | authorized | Auth approved by issuer | Yes (void) |
| created | failed | Auth declined / error | No |
| authorized | captured | Merchant captures | No (can refund) |
| authorized | voided | Merchant cancels before capture | No |
| authorized | expired | Hold expires (MCC-dependent) | No |
| captured | settled | Batch settlement completes | No (can refund) |
| settled | refunded | Merchant initiates refund | No |
| settled | partially_refunded | Partial refund | Yes (refund more) |

**Implementation — strict state machine:**
```ruby
class Payment < ApplicationRecord
  include AASM  # acts_as_state_machine gem

  aasm column: :status do
    state :created, initial: true
    state :authorized, :captured, :settled
    state :voided, :expired, :refunded, :partially_refunded, :failed

    event :authorize do
      transitions from: :created, to: :authorized
      after { record_event("authorized", auth_code: auth_code) }
    end

    event :capture do
      transitions from: :authorized, to: :captured
      guard { amount_to_capture <= authorized_amount }
      after { record_event("captured", amount: amount_to_capture) }
    end

    event :void do
      transitions from: :authorized, to: :voided
      after do
        release_hold
        record_event("voided")
      end
    end

    event :settle do
      transitions from: :captured, to: :settled
      after { record_event("settled", settlement_batch: batch_id) }
    end

    event :refund do
      transitions from: :settled, to: :refunded,
                  guard: -> { refund_amount == captured_amount }
      transitions from: :settled, to: :partially_refunded,
                  guard: -> { refund_amount < captured_amount }
      transitions from: :partially_refunded, to: :refunded,
                  guard: -> { total_refunded == captured_amount }
      transitions from: :partially_refunded, to: :partially_refunded
      after { record_event("refunded", amount: refund_amount) }
    end

    event :expire do
      transitions from: :authorized, to: :expired
      after { record_event("expired") }
    end

    event :fail do
      transitions from: [:created, :authorized], to: :failed
      after { record_event("failed", reason: failure_reason) }
    end
  end

  # Illegal transitions raise AASM::InvalidTransition
  # payment.refund! when status is :authorized → raises error
end
```

**Payment vs transaction status (critical distinction):**
```
Payment status:   the overall state of the payment (authorized, captured, etc.)
Transaction status: the result of a specific API call (succeed, pending, failed)

A payment can have multiple transactions:
  Payment #789 (status: captured)
    ├── Transaction: authorize  → succeeded (auth_code: A123)
    ├── Transaction: capture    → succeeded
    └── Transaction: refund     → pending

The payment status reflects the latest successful transaction.
If a capture transaction fails, the payment stays "authorized" (not "captured").
```

**Parallel states (real-world complexity):**
```
Some payments have parallel state dimensions:

Payment status:    authorized → captured → settled
Dispute status:    none → chargeback_received → representment_sent → won/lost
Refund status:     none → partial_refund → full_refund

These are independent state machines on the same payment:
  Payment #789: captured + chargeback_received + partial_refund
  All three can progress independently.
```

**Event sourcing the state machine:**
```ruby
# Every state transition is an immutable event
class PaymentEvent < ApplicationRecord
  # id, payment_id, event_type, data (jsonb), created_at
  # Events: authorized, captured, voided, settled, refunded, failed, expired
end

# Current state = replay all events
class Payment
  def self.from_events(events)
    payment = new
    events.each { |e| payment.apply(e) }
    payment
  end

  def apply(event)
    case event.event_type
    when "authorized" then @status = :authorized; @auth_code = event.data["auth_code"]
    when "captured"   then @status = :captured; @captured_amount = event.data["amount"]
    when "refunded"   then @total_refunded += event.data["amount"]
                           @status = @total_refunded >= @captured_amount ? :refunded : :partially_refunded
    end
  end
end
```

**Rule of thumb:** Model payment states as an explicit state machine with guarded transitions — never set status with a raw string update. Every transition produces an immutable event. Separate payment status from transaction status (a failed capture attempt doesn't change the payment to "failed" — it stays "authorized"). Design for parallel state dimensions (payment + dispute + refund). Invalid transitions should raise errors loudly, not silently succeed.
