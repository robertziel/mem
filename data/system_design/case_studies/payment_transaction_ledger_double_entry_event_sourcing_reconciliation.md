### Design a Payment System / Transaction Ledger

**Requirements:**
- Process payments (charge, refund, transfer) across multiple methods (card, bank, wallet)
- Record every financial transaction with double-entry bookkeeping
- Exactly-once processing (no double-charges) via idempotency keys
- Immutable — no edits, only corrective entries (reversals)
- Consistent balances even under concurrent writes
- Reconciliation between internal ledger and external payment providers
- Event sourcing as the source of truth
- Support for multi-currency

**Architecture:**
```
┌──────────┐    ┌───────┐    ┌──────────────┐    ┌─────────────┐
│ Payment  │───>│ Kafka │───>│ Ledger       │───>│ Balance     │
│ Service  │    │       │    │ Writer       │    │ Projections │
└──────────┘    └───────┘    │ (consumer)   │    │ (read model)│
                             └──────────────┘    └─────────────┘
                                   │                     │
                              ┌────▼────┐          ┌─────▼──────┐
                              │ Event   │          │ PostgreSQL │
                              │ Store   │          │ (balances) │
                              │ (append)│          └────────────┘
                              └─────────┘
                                   │
                              ┌────▼──────────┐
                              │ Reconciliation│
                              │ Service       │
                              └───────────────┘
```

**Double-entry bookkeeping — every transaction has ≥ 2 entries:**
```
Transaction: User pays $100 for order #789

Entry 1: DEBIT  user_wallet:u_123     $100  (money leaves user)
Entry 2: CREDIT merchant_wallet:m_456  $97  (merchant receives minus fees)
Entry 3: CREDIT platform_fees          $3   (platform takes fee)

Invariant: SUM(debits) = SUM(credits) for every transaction
           Always balanced — if not, something is wrong
```

**Event schema (append-only):**
```json
{
  "event_id": "evt_abc123",
  "event_type": "transaction.created",
  "transaction_id": "tx_789",
  "idempotency_key": "order_789_payment",
  "timestamp": "2025-06-15T14:30:00.000Z",
  "entries": [
    { "account_id": "user_wallet:u_123", "type": "debit",  "amount": 10000, "currency": "USD" },
    { "account_id": "merchant:m_456",    "type": "credit", "amount": 9700,  "currency": "USD" },
    { "account_id": "platform_fees",     "type": "credit", "amount": 300,   "currency": "USD" }
  ],
  "metadata": {
    "order_id": "order_789",
    "payment_method": "card",
    "provider_ref": "stripe_ch_xyz"
  }
}
```

**Amounts in cents (integers, never floats):**
```ruby
# ❌ NEVER use floats for money
amount = 19.99 + 0.01  # => 20.000000000000004 (floating point error)

# ✅ Store in smallest currency unit (cents)
amount_cents = 1999 + 1  # => 2000 (exactly $20.00)

# Multi-currency: store amount + currency code
{ amount: 10000, currency: "USD" }  # $100.00
{ amount: 10000, currency: "JPY" }  # ¥10,000 (JPY has no subunits)
```

**Balance projection (read model):**
```sql
-- Balances table (derived from events, rebuilt on demand)
CREATE TABLE account_balances (
  account_id    TEXT PRIMARY KEY,
  currency      TEXT NOT NULL,
  balance_cents BIGINT NOT NULL DEFAULT 0,
  last_event_id TEXT NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL
);

-- Update balance on new transaction event
-- This is the projection — consuming events and maintaining a view
UPDATE account_balances
SET balance_cents = balance_cents - 10000,  -- debit
    last_event_id = 'evt_abc123',
    updated_at = NOW()
WHERE account_id = 'user_wallet:u_123';
```

**Idempotency — prevent duplicate transactions:**
```ruby
class LedgerWriter
  def process(event)
    # Idempotency: skip if already processed
    return if LedgerEntry.exists?(idempotency_key: event.idempotency_key)

    ActiveRecord::Base.transaction do
      # Validate: debits == credits
      total_debits  = event.entries.select { |e| e.type == "debit" }.sum(&:amount)
      total_credits = event.entries.select { |e| e.type == "credit" }.sum(&:amount)
      raise "Unbalanced transaction!" unless total_debits == total_credits

      # Write entries (append-only)
      event.entries.each do |entry|
        LedgerEntry.create!(
          transaction_id: event.transaction_id,
          idempotency_key: event.idempotency_key,
          account_id: entry.account_id,
          entry_type: entry.type,
          amount_cents: entry.amount,
          currency: entry.currency,
          event_id: event.event_id
        )
      end

      # Update balance projections
      update_balances(event.entries)
    end
  end
end
```

**Reversals (no deletes, only corrective entries):**
```
Original:  tx_789  DEBIT  user_wallet:u_123  $100
                   CREDIT merchant:m_456      $97
                   CREDIT platform_fees        $3

Reversal:  tx_790  CREDIT user_wallet:u_123  $100  (money back to user)
                   DEBIT  merchant:m_456      $97  (take back from merchant)
                   DEBIT  platform_fees        $3  (return fee)
           references: tx_789 (links reversal to original)

Net effect: $0 on all accounts. Full audit trail preserved.
```

**Reconciliation — compare internal ledger with external providers:**
```ruby
class ReconciliationService
  # Run daily: compare our ledger with Stripe's records
  def reconcile(date)
    # Our side: all transactions for the date
    internal = LedgerEntry
      .where(created_at: date.all_day)
      .where(account_type: "payment_provider")
      .group(:provider_ref)
      .sum(:amount_cents)

    # Their side: fetch from Stripe API
    external = Stripe::BalanceTransaction.list(
      created: { gte: date.beginning_of_day.to_i, lt: date.end_of_day.to_i }
    ).map { |t| [t.id, t.amount] }.to_h

    # Compare
    discrepancies = []
    internal.each do |ref, amount|
      if external[ref] != amount
        discrepancies << { ref: ref, ours: amount, theirs: external[ref] }
      end
    end

    # Alert on discrepancies
    AlertService.notify("#{discrepancies.size} discrepancies on #{date}") if discrepancies.any?
    ReconciliationReport.create!(date: date, discrepancies: discrepancies)
  end
end
```

**Snapshots for fast balance reads:**
```
Problem: rebuilding balance from all events is slow (millions of entries)

Solution: periodic snapshots
1. Every hour: snapshot current balances for all accounts
2. To get current balance: load latest snapshot + replay events after snapshot
3. Snapshot stored as: { account_id, balance_cents, snapshot_event_id, timestamp }

Without snapshots: replay 10M events → minutes
With snapshots: load snapshot + replay ~100 events → milliseconds
```

**Payment state machine:**
```
CREATED -> PROCESSING -> SUCCEEDED -> REFUND_INITIATED -> REFUNDED
                      -> FAILED
                      -> REQUIRES_ACTION (3D Secure)
```

**Handling failures:**

| Scenario | Solution |
|----------|----------|
| Provider timeout | Retry with same idempotency key, or query status |
| Network error after charge | Query provider by idempotency key to check if charged |
| Double submission | Idempotency key prevents duplicate charges |
| Partial failure (charged but not recorded) | Reconciliation catches it, auto/manual fix |

**Scaling:**
- Kafka: partition by account_id (all entries for same account in order)
- Ledger writer: one consumer per partition (ordered processing)
- Balance DB: shard by account_id prefix
- Read replicas for balance queries (eventual consistency OK for dashboards)
- Strong consistency for writes (single leader per account partition)

**Rule of thumb:** Always use double-entry bookkeeping — debits must equal credits for every transaction. Store amounts in cents (integers), never floats. Append-only events are the source of truth; balances are derived projections. Never delete or modify entries — use reversals. Reconcile daily with external providers. Snapshot balances periodically to avoid replaying entire history.
