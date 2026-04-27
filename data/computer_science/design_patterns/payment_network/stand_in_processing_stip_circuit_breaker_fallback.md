### Stand-In Processing (STIP) — Circuit Breaker with AI Fallback

**Visa context:** When an issuer bank is unreachable (outage, timeout, invalid response), VisaNet makes the approve/decline decision on the issuer's behalf. Ensures cardholders can still pay even if their bank is down.

**How it works in VisaNet:**
```
Normal flow:
  Acquirer → VisaNet → Issuer → response → VisaNet → Acquirer
                          ✓ (issuer responds)

STIP flow:
  Acquirer → VisaNet → Issuer → ✗ (timeout/unreachable)
                  │
                  ▼
             STIP Engine ──> approve/decline based on:
                  │           1. Issuer-configured rules (limits, MCC)
                  │           2. Cardholder spending history
                  │           3. AI model (Smarter STIP)
                  ▼
             VisaNet → Acquirer (response flagged as stand-in)
```

**Smarter STIP (AI-powered, launched 2020):**
- Deep learning model with recurrent neural networks (RNNs)
- Trained on billions of historical transactions
- Analyzes cardholder-level purchasing behavior (not just portfolio-wide rules)
- 95% accuracy in emulating the issuer's likely decision (Visa's tests)
- Decides per-cardholder, not per-portfolio — personalized stand-in

**STIP parameters configured by issuer:**
```
- Maximum single transaction amount
- Daily cumulative spending limit
- Number of transactions per day
- Allowed/blocked merchant category codes (MCC)
- Geographic restrictions
- Card status (active, suspended, lost)
- Seasonal adjustments (holiday spending spikes)
```

**General software pattern: Circuit Breaker + Intelligent Fallback**

```ruby
# Same pattern in your application:
class PaymentAuthorizer
  CIRCUIT = Stoplight("issuer-bank") {
    IssuerBankAPI.authorize(transaction)
  }
    .with_threshold(5)        # open after 5 failures
    .with_cool_off_time(30)   # try again after 30 seconds
    .with_fallback { |error|
      # Stand-in: decide locally using cached rules + ML
      StandInEngine.decide(transaction)
    }

  def authorize(transaction)
    CIRCUIT.run
  end
end

class StandInEngine
  def self.decide(transaction)
    rules = CachedIssuerRules.for(transaction.issuer_id)

    return Decision.decline("over_limit") if transaction.amount > rules.max_amount
    return Decision.decline("daily_limit") if daily_total(transaction.card) + transaction.amount > rules.daily_limit
    return Decision.decline("blocked_mcc") if rules.blocked_mccs.include?(transaction.mcc)

    # ML fallback for edge cases
    risk_score = FraudModel.score(transaction)
    return Decision.decline("high_risk") if risk_score > 0.7

    Decision.approve(stand_in: true)  # flag for later reconciliation
  end
end
```

**Key difference from simple circuit breaker:**
- Simple circuit breaker: open → fail fast (return error)
- STIP pattern: open → **decide intelligently** using cached rules + AI
- The fallback is not a static response — it's a degraded but functional decision engine

**Where you see this pattern:**
- DNS resolution: if primary DNS fails, use cached responses
- CDN origin shield: if origin is down, serve stale cached content
- Feature flags: if config service is down, use last-known flags
- ML model serving: if primary model times out, use simpler fallback model

**Rule of thumb:** When a downstream dependency fails, don't just error out — decide intelligently using cached data and simpler rules. Pre-cache the rules needed for stand-in decisions. Flag stand-in responses for later reconciliation when the dependency recovers. Use AI to make stand-in decisions personalized, not just rule-based.
