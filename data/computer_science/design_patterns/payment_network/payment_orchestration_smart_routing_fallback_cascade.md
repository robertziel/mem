### Payment Orchestration — Smart Routing and Fallback Cascades

**Problem:** Relying on a single payment provider means their downtime = your downtime, their decline = your lost sale, their pricing = your cost. Payment orchestration routes transactions across multiple providers (acquirers, PSPs) to maximize approval rates, minimize costs, and ensure availability.

**Architecture:**
```
┌──────────┐    ┌────────────────────────────┐    ┌───────────┐
│ Checkout │───>│   Payment Orchestrator     │───>│ Provider A│ (Stripe)
│          │    │                            │──X─│ Provider B│ (Adyen) ← declined
│          │    │  1. Route based on rules   │───>│ Provider C│ (Checkout.com) ← fallback
│          │    │  2. Fallback on decline    │    └───────────┘
│          │    │  3. Retry on timeout       │
│          │    │  4. Record all attempts    │
└──────────┘    └────────────────────────────┘
```

**Smart routing decision factors:**
```
Static rules (configured):
  - Currency → route EUR to European acquirer (lower interchange)
  - Card brand → route Amex to provider with best Amex rates
  - Country → route domestic cards to local acquirer
  - Amount → route high-value to provider with best fraud protection
  - MCC → route specific merchant categories to specialized providers

Dynamic factors (real-time):
  - Provider health score (approval rate in last 5 min)
  - Provider latency (p99 response time)
  - Provider error rate (5xx, timeouts)
  - Cost optimization (which provider is cheapest for this tx)
  - Capacity (provider nearing rate limit)
```

**Fallback cascade (retry on decline/failure):**
```ruby
class PaymentOrchestrator
  # Ordered by preference — first match wins
  ROUTING_RULES = [
    { currency: "EUR", providers: [:adyen_eu, :stripe, :checkout] },
    { currency: "GBP", providers: [:stripe_uk, :adyen_eu, :checkout] },
    { currency: "USD", providers: [:stripe, :adyen, :checkout] },
    { default: true,   providers: [:stripe, :adyen] }
  ]

  def process(payment)
    providers = select_providers(payment)
    last_error = nil

    providers.each do |provider_key|
      provider = ProviderRegistry.get(provider_key)
      next if provider.circuit_open?  # skip unhealthy providers

      begin
        result = provider.authorize(
          amount: payment.amount,
          currency: payment.currency,
          card_token: payment.token,
          idempotency_key: "#{payment.id}:#{provider_key}"
        )

        if result.approved?
          payment.update!(provider: provider_key, provider_ref: result.id)
          record_attempt(payment, provider_key, :approved)
          return result
        end

        # Soft decline — try next provider
        if retryable_decline?(result.decline_code)
          record_attempt(payment, provider_key, :declined, result.decline_code)
          last_error = result
          next
        end

        # Hard decline — don't retry (insufficient funds, stolen card)
        record_attempt(payment, provider_key, :declined, result.decline_code)
        return result  # stop cascading

      rescue Faraday::TimeoutError, Faraday::ConnectionFailed => e
        record_attempt(payment, provider_key, :error, e.message)
        provider.record_failure  # feeds circuit breaker
        last_error = e
        next  # try next provider
      end
    end

    # All providers failed
    PaymentResult.new(status: :failed, error: last_error)
  end

  private

  def retryable_decline?(code)
    # Only retry on soft declines — provider-specific issues
    %w[do_not_honor try_again generic_decline processing_error].include?(code)
  end

  # Hard declines — cardholder problem, retrying won't help
  # insufficient_funds, stolen_card, expired_card, invalid_card
end
```

**Provider health scoring:**
```ruby
class ProviderHealthMonitor
  # Track per-provider metrics in sliding 5-minute window
  def health_score(provider_key)
    stats = Redis.current.hgetall("provider:#{provider_key}:5min")

    approval_rate = stats["approved"].to_f / [stats["total"].to_i, 1].max
    avg_latency   = stats["total_latency_ms"].to_f / [stats["total"].to_i, 1].max
    error_rate    = stats["errors"].to_f / [stats["total"].to_i, 1].max

    score = 0.0
    score += approval_rate * 50     # 50% weight on approval rate
    score += (1 - error_rate) * 30  # 30% weight on reliability
    score += latency_score(avg_latency) * 20  # 20% weight on speed

    score  # 0-100
  end

  def latency_score(ms)
    case ms
    when 0..500   then 1.0
    when 500..1000 then 0.7
    when 1000..3000 then 0.3
    else 0.0
    end
  end
end
```

**Cost optimization routing:**
```
Example: $100 USD purchase with US Visa card

Provider A (Stripe):  2.9% + $0.30 = $3.20
Provider B (Adyen):   2.2% + $0.10 = $2.30  ← cheapest
Provider C (local):   1.8% + $0.25 = $2.05  ← cheapest for domestic

Route to Provider C (domestic acquirer) → saves $1.15 per transaction
At 100K transactions/month: $115,000/month savings

Cross-border example: €100 EUR with French card
  US acquirer: 3.5% + FX markup = €4.20
  EU acquirer: 1.5% (no FX needed) = €1.50  ← route here
```

**Observability:**
```
Dashboard metrics per provider:
  - Approval rate (rolling 5min, 1hr, 24hr)
  - Decline rate by reason code
  - Average/p99 latency
  - Error rate (timeouts, 5xx)
  - Cost per successful transaction

Cross-provider metrics:
  - Overall approval rate (after fallback)
  - Fallback utilization rate (how often provider B/C used)
  - Revenue saved by smart routing (cost diff vs single provider)
  - Cascade depth distribution (1st try success vs 2nd vs 3rd)
```

**Rule of thumb:** Never depend on a single payment provider — use at least 2-3 with automatic fallback. Route based on cost (domestic acquirer for domestic cards), reliability (skip unhealthy providers), and capability (right provider for card type/currency). Only cascade on soft declines and errors — hard declines (insufficient funds) should stop immediately. Track provider health in real-time and adjust routing dynamically. The 2-4% approval rate lift from orchestration often pays for the entire system.
