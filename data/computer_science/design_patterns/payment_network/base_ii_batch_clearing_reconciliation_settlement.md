### BASE II Batch Clearing — Reconciliation and Net Settlement

**Visa context:** BASE II is Visa's international batch clearing system. Every day at 11 AM EST, acquirers submit clearing files for all transactions from the previous period. VisaNet matches these against authorizations, calculates interchange fees, and produces net settlement positions for every bank.

**How it works:**
```
Daily cycle:
  1. Merchant closes batch → sends to Acquirer
  2. Acquirer compiles clearing file → sends to VisaNet (BASE II)
  3. VisaNet processes clearing file:
     a. Match clearing record to original authorization
     b. Calculate interchange fee (issuer earns this from acquirer)
     c. Calculate assessment fee (Visa earns this)
     d. Route clearing to issuer
  4. VisaNet computes net settlement position per bank per currency
  5. Settlement via central bank wire transfers (T+1 to T+3)

Clearing window: opens daily, closes 11 AM EST, operates 7 days/week
```

**Clearing file structure (TC — Transaction Component records):**
```
TC05 — Financial detail (amount, currency, MCC, card number)
TC15 — Fee collection (interchange fees, assessment fees)
TC33 — Settlement reconciliation (settlement amount, currency conversion)

Each clearing record carries:
  - Original authorization code (links to auth)
  - Final transaction amount (may differ from auth amount)
  - Merchant Category Code (MCC) — determines interchange rate
  - Interchange rate applied
  - Currency conversion details (if cross-border)
```

**Net settlement calculation:**
```
Bank A (acquirer) processed:
  + $10,000 in merchant sales
  - $150 interchange fees paid to issuers
  - $20 assessment fees paid to Visa
  = $9,830 net receivable

Bank B (issuer) owes:
  - $10,000 cardholder purchases
  + $150 interchange fees earned
  = $9,850 net payable

Visa's cut:
  + $20 assessment fees from Bank A
  + $20 assessment fees from Bank B
  = $40 revenue

Net settlement: single wire transfer per bank per currency per day
  (not per transaction — netting reduces wire transfer count enormously)
```

**Exception handling (unmatched records):**
```
Auth without clearing:
  - Merchant never charged (void, customer walked out)
  - Hold expires automatically (7-30 days depending on MCC)
  - No action needed — system self-heals

Clearing without auth:
  - Force-post transaction (merchant manually keyed)
  - Exception processing — may be flagged for review
  - Higher risk of chargeback

Amount mismatch:
  - Within tolerance → accepted (tips, final billing)
  - Over tolerance → issuer may dispute (chargeback right)

Duplicate clearing:
  - VisaNet detects via transaction identifiers (STAN, RRN, date)
  - Second submission rejected as duplicate
```

**General software pattern: Batch Reconciliation + Net Settlement**

```ruby
# Same pattern: daily reconciliation between your system and payment provider
class DailyReconciliation
  def run(date)
    # 1. Gather our records
    internal = Payment.where(created_at: date.all_day)
                      .group(:provider_ref).sum(:amount_cents)

    # 2. Gather provider records
    external = StripeAPI.list_charges(date)
                        .map { |c| [c.id, c.amount] }.to_h

    # 3. Match and find discrepancies
    matched, unmatched_ours, unmatched_theirs = reconcile(internal, external)

    # 4. Compute net position
    net = matched.values.sum  # total confirmed revenue

    # 5. Report
    ReconciliationReport.create!(
      date: date,
      matched_count: matched.size,
      unmatched_internal: unmatched_ours,
      unmatched_external: unmatched_theirs,
      net_amount: net
    )

    alert_if_discrepancies(unmatched_ours, unmatched_theirs)
  end
end
```

**Netting optimization:**
```
Without netting: 1,000,000 transactions = 1,000,000 wire transfers/day
With netting:    1,000,000 transactions = ~500 wire transfers/day (one per bank per currency)

Visa's netting: all transactions between Bank A and Bank B collapse into
a single net amount. If Bank A owes Bank B $50,000 and Bank B owes Bank A
$30,000, only one wire for $20,000 (A → B).

Same principle in your system:
  - Batch payouts to merchants instead of per-order transfers
  - Daily settlement instead of real-time transfers
  - Reduces payment processor fees (fewer transactions)
```

**Where you see this pattern:**
- ACH batch processing (payroll, bill pay)
- Stock exchange settlement (T+2)
- Marketplace payouts (Shopify/Amazon daily merchant settlements)
- Internal transfer systems (company subsidiaries daily netting)
- Kafka consumer: batch-process messages instead of one-at-a-time

**Rule of thumb:** Real-time authorization, batch clearing and settlement. Net positions across participants to minimize actual money movements. Always reconcile — match every clearing record against its authorization. Handle exceptions (unmatched, duplicates, amount mismatches) as first-class flows, not afterthoughts. The clearing window creates a natural deadline for batch processing.
