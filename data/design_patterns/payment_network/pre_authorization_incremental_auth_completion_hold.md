### Pre-Authorization, Incremental Auth, and Completion — Hold Patterns

**Visa context:** Some merchants (hotels, rental cars, gas stations, restaurants) don't know the final transaction amount at the time of authorization. Visa supports a family of authorization patterns to handle estimated, incremental, and final amounts without blocking the cardholder's funds unnecessarily.

**Authorization types:**
```
1. Pre-authorization (estimated hold):
   Hotel check-in: auth for $500 (estimated 2-night stay)
   → Issuer places $500 hold on card
   → Money is reserved but not charged

2. Incremental authorization (increase the hold):
   Guest orders room service ($75) + minibar ($30)
   → Hotel sends incremental auth for $105
   → Total hold now $605

3. Completion (final charge):
   Checkout after 3 nights + room service + minibar = $1,623
   → Hotel sends completion for $1,623
   → Issuer charges actual amount, releases remaining hold

4. Partial reversal (decrease the hold):
   Guest cancels one night → hotel reverses $500
   → Hold reduced from $1,500 to $1,000

5. Full reversal (cancel everything):
   Guest cancels reservation → hotel reverses entire hold
   → All held funds released immediately
```

**Real-world examples:**
```
Gas station:
  Pre-auth $1 → pump fuel → completion for $45.67
  (The $1 auth is just to verify the card works)

Restaurant:
  Auth $50 (meal total) → tip added → completion for $58
  (Visa allows up to 20% over-auth for restaurants)

Rental car:
  Pre-auth $500 → extend rental → incremental $250 → return car → completion $623
  (Multiple incremental auths over multi-day rental)

Hotel:
  Pre-auth $300/night × 3 = $900 → minibar $45 → completion $945
  (Incremental auths for incidentals during stay)
```

**Hold expiration (if merchant never sends completion):**
```
MCC-based hold expiration:
  Hotels:       up to 31 days
  Car rental:   up to 31 days
  Gas stations: 1-2 hours (after pre-auth)
  Restaurants:  up to 7 days
  General:      7-10 days (varies by issuer)

If hold expires without completion:
  → Funds released back to cardholder automatically
  → Merchant loses the ability to capture the payment
  → Must initiate a new authorization if they still want to charge
```

**ISO 8583 message flow:**
```
Pre-auth:     0100 (processing code = 00 with pre-auth indicator)
              → Issuer holds estimated amount

Incremental:  0100 (incremental flag + original auth reference)
              → Issuer adds to existing hold

Completion:   0220 (advice financial, final amount)
              → Clearing with final charge amount

Reversal:     0400/0420 (partial or full reversal of hold)
              → Issuer releases partial/all held funds
```

**General software pattern: Reservation / Two-Phase Resource Allocation**

```ruby
# Same pattern: reserve resources, adjust, finalize
class BookingService
  # Phase 1: Reserve (pre-auth)
  def reserve(booking)
    hold = ResourceHold.create!(
      booking_id: booking.id,
      resource_type: "room",
      quantity: booking.nights,
      estimated_amount: booking.nights * booking.rate,
      status: "held",
      expires_at: 31.days.from_now
    )
    PaymentGateway.pre_authorize(booking.card_token, hold.estimated_amount)
    hold
  end

  # Phase 2: Adjust (incremental auth)
  def add_charge(hold, amount, description)
    IncrementalCharge.create!(hold: hold, amount: amount, description: description)
    PaymentGateway.incremental_auth(hold.auth_reference, amount)
    hold.update!(estimated_amount: hold.estimated_amount + amount)
  end

  # Phase 3: Finalize (completion)
  def complete(hold)
    # hold.estimated_amount is already updated by add_charge — DO NOT add
    # incremental_charges again or you'll double-count.
    final_amount = hold.estimated_amount
    PaymentGateway.capture(hold.auth_reference, final_amount)
    hold.update!(status: "completed", final_amount: final_amount)
  end

  # Cancel (full reversal)
  def cancel(hold)
    PaymentGateway.void(hold.auth_reference)
    hold.update!(status: "cancelled")
  end
end

# Background job: expire stale holds
class ExpireStaleHoldsJob < ApplicationJob
  def perform
    ResourceHold.where(status: "held")
                .where("expires_at < ?", Time.current)
                .find_each do |hold|
      hold.update!(status: "expired")
      # Funds auto-released by payment provider on expiry
    end
  end
end
```

**Where you see this pattern:**
- Cloud computing: reserve instance capacity → scale up/down → pay for actual usage
- Ticket booking: hold seats for 15 minutes → confirm or release
- Inventory: reserve stock for cart → adjust quantities → finalize order
- Database: `SELECT ... FOR UPDATE` → modify → commit/rollback
- Uber/Lyft: estimated fare hold → trip completes → actual charge

**Rule of thumb:** Use pre-auth when the final amount isn't known upfront. Support incremental adjustments without re-authorizing from scratch. Always set an expiration on holds — never hold funds indefinitely. Send completion with the final amount to trigger actual charge. Design for the case where completion never comes (auto-expire and release). The hold amount should be a reasonable estimate — too high blocks cardholder funds, too low risks insufficient coverage.
