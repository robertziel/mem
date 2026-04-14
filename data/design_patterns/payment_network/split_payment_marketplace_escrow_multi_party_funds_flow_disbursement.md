### Split Payment / Marketplace Escrow — Multi-Party Funds Flow

**Problem:** In a marketplace (Airbnb, Uber, Etsy), a single customer payment must be split among multiple parties: the seller, the platform (commission), tax authorities, service providers, and possibly held in escrow until conditions are met (delivery confirmed, stay completed). Each party's share must be tracked, reconciled, and disbursed correctly.

**Funds flow for a marketplace order:**
```
Customer pays $100
  │
  ├── Platform fee (15%):      $15.00 → Platform account
  ├── Payment processing (2.9%): $2.90 → Stripe/processor
  ├── Sales tax (8%):           $8.00 → Tax account (remitted quarterly)
  └── Seller payout:           $74.10 → Seller account (held in escrow)
                                         ↓
                               Released after delivery confirmed
```

**Escrow lifecycle:**
```
┌─────────┐   payment    ┌──────────┐  conditions met  ┌──────────┐
│ Customer│────────────>│  Escrow  │─────────────────>│  Seller  │
│  pays   │              │  (hold)  │                  │ (payout) │
└─────────┘              └──────────┘                  └──────────┘
                              │
                    dispute/refund
                              │
                         ┌────▼─────┐
                         │ Customer │ (full or partial refund)
                         │ (refund) │
                         └──────────┘

Release conditions (configurable per marketplace):
  - Delivery confirmed (e-commerce)
  - Stay completed (hospitality)
  - Ride completed (ride-sharing)
  - Service accepted (freelance)
  - N days after delivery without dispute (time-based)
  - Manual release by platform admin
```

**Ledger entries for split payment:**
```
Order #789: Customer pays $100.00

Double-entry bookkeeping — every flow has debit + credit:

Entry 1: Customer payment received
  DEBIT   customer_payment_receivable    $100.00
  CREDIT  customer_payment_collected     $100.00

Entry 2: Platform commission earned
  DEBIT   escrow_account                 $15.00
  CREDIT  platform_revenue               $15.00

Entry 3: Processing fee
  DEBIT   payment_processing_expense      $2.90
  CREDIT  processor_payable               $2.90

Entry 4: Tax collected
  DEBIT   escrow_account                  $8.00
  CREDIT  sales_tax_payable               $8.00

Entry 5: Seller funds held in escrow
  DEBIT   escrow_account                 $74.10
  CREDIT  seller_payable:seller_123      $74.10

Entry 6: (after delivery) Seller payout released
  DEBIT   seller_payable:seller_123      $74.10
  CREDIT  bank_disbursement              $74.10

Invariant: SUM(debits) = SUM(credits) = $100.00 at every point
```

**Implementation — split payment with escrow:**
```ruby
class SplitPaymentService
  def process(order)
    ActiveRecord::Base.transaction do
      # Calculate splits
      splits = calculate_splits(order)

      # Charge customer (single charge for total)
      charge = PaymentGateway.charge(
        amount: order.total_cents,
        currency: order.currency,
        customer_token: order.customer.payment_token,
        idempotency_key: "order:#{order.id}"
      )

      # Record splits in ledger
      splits.each do |split|
        LedgerEntry.create!(
          order_id: order.id,
          account_id: split[:account],
          entry_type: split[:type],
          amount_cents: split[:amount],
          status: split[:escrow] ? "held" : "settled"
        )
      end

      # Create escrow hold for seller funds
      EscrowHold.create!(
        order_id: order.id,
        seller_id: order.seller_id,
        amount_cents: splits.find { |s| s[:account].start_with?("seller") }[:amount],
        release_condition: order.escrow_condition,  # "delivery_confirmed"
        expires_at: 30.days.from_now
      )
    end
  end

  private

  def calculate_splits(order)
    platform_fee = (order.total_cents * 0.15).round
    processing_fee = (order.total_cents * 0.029 + 30).round  # 2.9% + $0.30
    tax = (order.subtotal_cents * order.tax_rate).round
    seller_amount = order.total_cents - platform_fee - processing_fee - tax

    [
      { account: "platform_revenue",       type: :credit, amount: platform_fee, escrow: false },
      { account: "processing_expense",     type: :debit,  amount: processing_fee, escrow: false },
      { account: "sales_tax_payable",      type: :credit, amount: tax, escrow: false },
      { account: "seller:#{order.seller_id}", type: :credit, amount: seller_amount, escrow: true }
    ]
  end
end
```

**Escrow release service:**
```ruby
class EscrowReleaseService
  # Called when release condition is met (webhook, event, cron)
  def release(escrow_hold)
    return if escrow_hold.released?

    ActiveRecord::Base.transaction do
      escrow_hold.update!(status: "released", released_at: Time.current)

      # Record ledger entry for release
      LedgerEntry.create!(
        order_id: escrow_hold.order_id,
        account_id: "seller:#{escrow_hold.seller_id}",
        entry_type: :debit,
        amount_cents: escrow_hold.amount_cents,
        status: "disbursement_pending"
      )

      # Queue payout to seller's bank account
      SellerPayoutJob.perform_later(escrow_hold.seller_id, escrow_hold.amount_cents)
    end
  end

  # Refund: release escrow back to customer
  def refund(escrow_hold, reason:)
    ActiveRecord::Base.transaction do
      escrow_hold.update!(status: "refunded", released_at: Time.current)

      PaymentGateway.refund(
        charge_id: escrow_hold.order.charge_id,
        amount: escrow_hold.amount_cents,
        idempotency_key: "refund:#{escrow_hold.id}"
      )
    end
  end
end

# Cron: auto-release escrow after N days without dispute
class AutoReleaseEscrowJob < ApplicationJob
  def perform
    EscrowHold.where(status: "held")
              .where(release_condition: "time_based")
              .where("created_at < ?", 14.days.ago)  # 14-day hold period
              .find_each { |hold| EscrowReleaseService.new.release(hold) }
  end
end
```

**Disbursement batching (like Visa's net settlement):**
```ruby
class SellerDisbursementService
  # Run daily: batch all pending payouts per seller into one transfer
  def run_daily_disbursement
    LedgerEntry.where(status: "disbursement_pending")
               .group(:account_id)
               .sum(:amount_cents)
               .each do |seller_account, total|
      seller_id = seller_account.split(":").last
      seller = Seller.find(seller_id)

      # One bank transfer per seller per day (not per order)
      BankTransfer.create!(
        seller: seller,
        amount_cents: total,
        bank_account: seller.bank_account,
        reference: "payout:#{Date.current}"
      )

      LedgerEntry.where(account_id: seller_account, status: "disbursement_pending")
                 .update_all(status: "disbursed", disbursed_at: Time.current)
    end
  end
end
```

**Stripe Connect / Adyen for Platforms comparison:**
```
Stripe Connect:
  - Handles splits, escrow, and KYC for sub-merchants
  - Destination charges: platform charges, Stripe splits to connected accounts
  - Separate charges and transfers: platform controls timing
  - Account types: Standard, Express, Custom (increasing control)

Adyen for Platforms:
  - Split payments at authorization time
  - Built-in escrow with release API
  - KYC/KYB for sub-merchants

Build your own:
  - Full control over splits, timing, and escrow rules
  - Must handle: KYC, tax reporting (1099s), bank transfers, reconciliation
  - Significantly more work but maximum flexibility
```

**Rule of thumb:** Model every funds flow as double-entry ledger entries — debits must equal credits for every transaction. Hold seller funds in escrow with explicit release conditions (delivery confirmed, time-based, manual). Batch disbursements daily (one transfer per seller, not per order) to reduce costs. Track every split in the ledger for reconciliation and tax reporting. Use Stripe Connect or Adyen for Platforms unless you need custom escrow logic — they handle KYC, tax forms, and bank transfers.
