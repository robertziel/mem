### System Design: Payment System

**Requirements:**
- Process payments (charge, refund, transfer)
- Exactly-once processing (no double-charges)
- Audit trail for every transaction
- Multiple payment methods (card, bank, wallet)
- Reconciliation with external payment providers

**High-level design:**
```
Client -> [API Gateway] -> [Payment Service] -> [Payment Provider (Stripe/Adyen)]
                                |
                          [Ledger Service]
                                |
                          [Reconciliation (async)]
```

**Idempotency (most critical aspect):**
```
POST /payments
{
  "idempotency_key": "order_123_payment_v1",  // client-generated
  "amount": 5000,
  "currency": "USD",
  "method": "card",
  "token": "tok_xxx"
}
```
```ruby
def process_payment(request)
  # Check if already processed
  existing = PaymentRecord.find_by(idempotency_key: request.idempotency_key)
  return existing.result if existing

  # Process with provider
  result = PaymentProvider.charge(request.amount, request.token)

  # Record atomically
  PaymentRecord.create!(
    idempotency_key: request.idempotency_key,
    amount: request.amount,
    status: result.status,
    provider_id: result.id
  )

  result
end
```

**Double-entry ledger:**
Every transaction creates two entries (debit + credit) that must balance.
```
Transaction: User pays $50 for order
  Debit:  user_wallet    -$50
  Credit: merchant_wallet +$50

Transaction: Refund $50
  Debit:  merchant_wallet -$50
  Credit: user_wallet     +$50

Rule: SUM(debits) = SUM(credits) always
```

```sql
CREATE TABLE ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    transaction_id UUID NOT NULL,
    account_id BIGINT NOT NULL,
    entry_type VARCHAR(6) NOT NULL,  -- 'debit' or 'credit'
    amount BIGINT NOT NULL,          -- cents (never float!)
    currency VARCHAR(3) NOT NULL,
    created_at TIMESTAMP NOT NULL
);
-- Amount in cents (integer) to avoid floating point errors
-- $10.50 = 1050 cents
```

**Payment state machine:**
```
INITIATED -> PROCESSING -> SUCCEEDED
                        -> FAILED
                        -> REQUIRES_ACTION (3D Secure)
SUCCEEDED -> REFUND_INITIATED -> REFUNDED
```

**Reconciliation:**
- Compare internal records with provider's transaction report (daily)
- Flag discrepancies: amount mismatch, missing transactions, status mismatch
- Async job: download provider report → match by provider_id → flag mismatches → alert

**Handling failures:**
| Scenario | Solution |
|----------|----------|
| Provider timeout | Retry with same idempotency key, or query status |
| Network error after charge | Query provider by idempotency key to check if charged |
| Double submission | Idempotency key prevents duplicate charges |
| Partial failure (charged but not recorded) | Reconciliation catches it, manual/auto-fix |

**Money handling rules:**
- ALWAYS use integers (cents), never floating point
- ALWAYS store currency with amount
- ALWAYS use idempotency keys for mutations
- ALWAYS double-entry (every debit has a matching credit)
- NEVER delete financial records (soft-delete, audit trail)

**Rule of thumb:** Idempotency keys prevent double-charges. Double-entry ledger ensures money balances. Use integers for money (cents, not dollars). Reconcile daily with payment provider. The payment system must be correct above all else — eventual consistency is acceptable for reads, not for charges.
