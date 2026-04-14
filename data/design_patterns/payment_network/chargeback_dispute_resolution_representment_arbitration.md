### Chargeback / Dispute Resolution — Lifecycle and Representment

**Problem:** A cardholder disputes a charge with their bank. The issuer reverses the funds from the merchant's account (chargeback). The merchant can fight back with evidence (representment). If unresolved, the card network arbitrates. This lifecycle involves strict deadlines, evidence requirements, and financial consequences at each stage.

**Visa dispute lifecycle (VCR — Visa Claims Resolution):**
```
Stage 1: DISPUTE (Day 0-120)
  Cardholder → Issuer: "I didn't make this purchase"
  Issuer evaluates → initiates chargeback
  Acquirer debited → Merchant notified

  ┌────────────┐   dispute    ┌───────────┐   chargeback   ┌──────────┐
  │ Cardholder │────────────>│  Issuer   │──────────────>│ Acquirer │
  │            │              │           │               │ /Merchant│
  └────────────┘              └───────────┘               └──────────┘

Stage 2: REPRESENTMENT (30 days for Visa, 45 for Mastercard)
  Merchant gathers evidence → submits to acquirer → acquirer represents to issuer
  If evidence is compelling → issuer accepts, chargeback reversed

Stage 3: PRE-ARBITRATION (Visa) / Second Chargeback (Mastercard)
  Issuer disagrees with representment → escalates
  Additional evidence may be submitted
  30 more days to resolve

Stage 4: ARBITRATION (final)
  Card network (Visa/Mastercard) makes binding decision
  Losing party pays arbitration fee ($500-$1000+)
  Decision is final — no further appeal
```

**Chargeback reason codes (Visa):**
```
Fraud:
  10.1 — EMV liability shift counterfeit fraud
  10.2 — EMV liability shift non-counterfeit fraud
  10.4 — Other fraud — card-absent environment
  10.5 — Visa fraud monitoring program

Consumer disputes:
  13.1 — Merchandise/services not received
  13.2 — Cancelled recurring transaction
  13.3 — Not as described or defective
  13.6 — Credit not processed (refund not issued)
  13.7 — Cancelled merchandise/services

Authorization:
  11.1 — Card recovery bulletin (card was on block list)
  11.2 — Declined authorization
  11.3 — No authorization obtained

Processing errors:
  12.1 — Late presentment (clearing too late)
  12.2 — Incorrect transaction code
  12.3 — Incorrect currency
  12.5 — Incorrect amount
  12.6 — Duplicate processing / paid by other means
```

**Representment — compelling evidence by reason code:**
```
10.4 (Card-not-present fraud):
  - AVS match confirmation
  - 3D Secure authentication proof
  - Delivery confirmation with signature
  - Device fingerprint / IP matching
  - Prior undisputed transactions from same device

13.1 (Not received):
  - Shipping carrier tracking showing delivery
  - Signed delivery confirmation
  - Proof of digital delivery (download logs, access logs)

13.2 (Cancelled recurring):
  - Signed terms showing cancellation policy
  - Proof customer continued using service after alleged cancellation
  - Cancellation confirmation NOT sent within required timeframe

13.3 (Not as described):
  - Product listing / description at time of purchase
  - Customer correspondence acknowledging receipt
  - Return policy and RMA process offered but not used
```

**Implementation — dispute state machine:**
```ruby
class Dispute < ApplicationRecord
  include AASM

  aasm column: :status do
    state :received, initial: true
    state :evidence_needed, :representment_submitted
    state :pre_arbitration, :arbitration
    state :won, :lost, :accepted

    event :request_evidence do
      transitions from: :received, to: :evidence_needed
      after { notify_merchant("Evidence required by #{evidence_deadline}") }
    end

    event :submit_representment do
      transitions from: :evidence_needed, to: :representment_submitted
      guard { evidence_documents.any? && within_deadline? }
    end

    event :accept_liability do
      transitions from: [:received, :evidence_needed], to: :accepted
      after { record_loss(amount) }
    end

    event :escalate_pre_arbitration do
      transitions from: :representment_submitted, to: :pre_arbitration
    end

    event :escalate_arbitration do
      transitions from: :pre_arbitration, to: :arbitration
    end

    event :win do
      transitions from: [:representment_submitted, :pre_arbitration, :arbitration], to: :won
      after { reverse_chargeback_debit }
    end

    event :lose do
      transitions from: [:representment_submitted, :pre_arbitration, :arbitration], to: :lost
      after { finalize_loss(amount + arbitration_fee_if_applicable) }
    end
  end

  def within_deadline?
    Time.current < evidence_deadline  # 30 days for Visa
  end

  def evidence_deadline
    received_at + 30.days
  end
end
```

**Financial impact tracking:**
```ruby
# Every dispute has financial movements at each stage
class DisputeFinancialEntry < ApplicationRecord
  # stage, type (debit/credit), amount, account

  # Stage 1: Chargeback received
  # DEBIT  merchant_account  $100 (funds taken from merchant)
  # CREDIT cardholder_account $100 (provisional credit to cardholder)

  # Stage 2: Representment won
  # CREDIT merchant_account  $100 (funds returned to merchant)
  # DEBIT  cardholder_account $100 (provisional credit reversed)

  # Stage 4: Arbitration lost
  # DEBIT  merchant_account  $100 + $500 (chargeback + arbitration fee)
end
```

**Monitoring and prevention:**
```
Key metrics:
  - Chargeback rate: chargebacks / total transactions (must stay < 1%)
  - Win rate: representments won / total representments
  - Response rate: representments submitted / chargebacks received
  - Average days to respond
  - Loss by reason code

Visa thresholds (VDMP — Visa Dispute Monitoring Program):
  Standard:  0.9% chargeback ratio → warning
  Excessive: 1.8% chargeback ratio → fines ($25K-$75K/month)
  > 1.8% for extended period → risk of losing Visa acceptance

Prevention strategies:
  - Use 3D Secure (shifts liability to issuer for authenticated transactions)
  - Clear billing descriptors (customer recognizes the charge)
  - Proactive refunds before dispute escalates
  - Visa's Order Insight / Ethoca alerts (resolve before chargeback)
```

**Rule of thumb:** Treat disputes as a first-class process with its own state machine, deadlines, and financial tracking. Automate evidence collection by reason code — don't require manual lookup for every case. Track chargeback rate religiously (< 0.9% for Visa). Invest in prevention (3DS, clear descriptors, alerts) over representment — winning a dispute costs time and money even if you win. Every dispute stage creates financial journal entries in your ledger.
