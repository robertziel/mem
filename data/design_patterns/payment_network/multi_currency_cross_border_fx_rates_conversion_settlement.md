### Multi-Currency / Cross-Border — FX Rates, Conversion, and Settlement

**Problem:** A French cardholder buys from a US merchant in USD. The cardholder's account is in EUR, the merchant settles in USD. Someone must convert currencies, absorb FX risk, and decide when to lock the rate. Every cross-border transaction involves currency conversion, and the timing/method of that conversion has financial impact.

**Cross-border transaction flow:**
```
Cardholder (EUR) → Issuer (EUR) → VisaNet → Acquirer (USD) → Merchant (USD)

Currency conversion can happen at different points:
  1. At VisaNet: Visa converts EUR→USD using Visa's FX rate
  2. At issuer: issuer converts EUR→USD using their own rate + markup
  3. At merchant: DCC (Dynamic Currency Conversion) — merchant offers
     cardholder to pay in EUR at merchant's terminal (usually worst rate)
```

**FX rate components:**
```
Base rate:    wholesale interbank rate (e.g., 1 EUR = 1.08 USD)
Network markup: Visa/MC adds 0.2-1% on top of base rate
Issuer markup:  issuer adds 0-3% on top of network rate
Total to cardholder: base + network + issuer = effective rate

Example: a US merchant charges $108.00 on a EUR-denominated card
  Base rate: 1 EUR = 1.0800 USD → without markup: $108.00 / 1.0800 = €100.00
  Visa markup (+1% worse for cardholder): effective rate 1 EUR ≈ 1.0693 USD
    → cardholder billed $108.00 / 1.0693 ≈ €101.00
  Issuer markup (+2% additional): effective rate worse again
    → cardholder sees ≈ €103.00 on statement

  The ≈€3.00 difference is the cross-border cost to the cardholder.
  (Exact math depends on whether markup is applied as a spread on the rate
   or as a flat surcharge on the EUR amount — check the issuer's disclosure.)
```

**Settlement currencies and timing:**
```
Transaction currency:  USD (merchant's pricing currency)
Billing currency:      EUR (cardholder's card currency)
Settlement currency:   USD (acquirer settles with merchant in USD)

FX rate locked at:
  - Authorization: Visa locks rate for 24-48 hours
  - Clearing: final rate applied when clearing record processed
  - Rate can differ between auth and clearing (FX fluctuation risk)

Multi-currency settlement:
  Merchant in US (settles USD) + Merchant in EU (settles EUR)
  Acquirer receives: net USD position + net EUR position
  Two separate settlement wires (one per currency)
```

**Implementation — multi-currency ledger:**
```ruby
class LedgerEntry < ApplicationRecord
  # Store amounts in the transaction's original currency
  # AND in the settlement currency (for reconciliation)

  # Schema:
  # transaction_currency: "EUR"
  # transaction_amount: 10000        (€100.00 in cents)
  # settlement_currency: "USD"
  # settlement_amount: 10800         ($108.00 in cents)
  # fx_rate: 1.0800                  (rate used for conversion)
  # fx_rate_source: "visa"           (who provided the rate)
  # fx_rate_locked_at: timestamp     (when rate was locked)
end

# Money class — ALWAYS carry currency with amount
class Money
  attr_reader :amount_cents, :currency

  def initialize(amount_cents, currency)
    @amount_cents = amount_cents.to_i  # never float
    @currency = currency.upcase
  end

  def to_currency(target_currency, rate:)
    return self if currency == target_currency
    converted = (amount_cents * rate).round  # round after multiplication
    Money.new(converted, target_currency)
  end

  def to_s
    major = amount_cents / subunit_factor
    "#{currency} #{major}.#{(amount_cents % subunit_factor).to_s.rjust(subunit_digits, '0')}"
  end

  private

  def subunit_factor
    # Most currencies: 100 cents. JPY: 1 (no subunits). BHD: 1000 (3 decimals)
    CURRENCY_SUBUNITS.fetch(currency, 100)
  end

  CURRENCY_SUBUNITS = { "JPY" => 1, "KRW" => 1, "BHD" => 1000, "KWD" => 1000 }.freeze
end
```

**FX rate service:**
```ruby
class FxRateService
  # Lock rate for a transaction (valid for N hours)
  def lock_rate(from:, to:, amount_cents:)
    rate = fetch_current_rate(from, to)
    markup = calculate_markup(from, to)  # e.g., 1% for cross-border

    effective_rate = rate * (1 + markup)

    FxRateLock.create!(
      from_currency: from,
      to_currency: to,
      base_rate: rate,
      markup: markup,
      effective_rate: effective_rate,
      locked_at: Time.current,
      expires_at: 24.hours.from_now,
      converted_amount: (amount_cents * effective_rate).round
    )
  end

  # Use locked rate at capture/settlement
  def convert(amount_cents, lock:)
    raise "Rate lock expired" if lock.expires_at < Time.current
    (amount_cents * lock.effective_rate).round
  end
end
```

**Currency-specific gotchas:**
```
Zero-decimal currencies (no subunits):
  JPY (¥): ¥1000 = 1000 (not 100000 cents)
  KRW (₩): ₩50000 = 50000

Three-decimal currencies:
  BHD, KWD, OMR: 1.000 → 1000 (3 decimal places, not 2)

Rounding rules:
  Always round AFTER multiplication, not before
  Round to nearest cent (half-up for most currencies)
  Different networks may have different rounding rules

  ❌ (1.08 * 99.99).round(2)  → floating point errors
  ✅ (10800 * 9999 / 10000).round  → integer math
```

**Reconciliation for multi-currency:**
```
Daily reconciliation must account for:
  1. Original transaction currency amount
  2. Settlement currency amount
  3. FX rate used
  4. FX rate at time of reconciliation (for P&L reporting)
  5. Realized FX gain/loss (rate at auth vs rate at settlement)

Example:
  Auth: €100 at 1.0800 → $108.00 settled
  If rate at settlement was 1.0900 → merchant "lost" $1.00 FX
  This FX gain/loss must be tracked in the ledger
```

**Rule of thumb:** Always store both the original currency amount AND the settlement currency amount — never derive one from the other after the fact. Lock FX rates at authorization time with an expiry window. Use integer arithmetic (cents) with proper subunit handling per currency (JPY has no cents, BHD has 3 decimals). Track FX rate source and lock timestamp for audit. Reconcile daily in both currencies. Never use floating point for money — ever.
