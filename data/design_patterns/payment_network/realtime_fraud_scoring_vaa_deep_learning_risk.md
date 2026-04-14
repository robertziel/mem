### Real-Time Fraud Scoring (VAA/VDA) — In-Path ML in ~1ms

**Visa context:** Visa Advanced Authorization (VAA) scores every transaction with an ML model in approximately 1 millisecond during the authorization flow. The risk score (0-99) is sent to the issuer alongside the auth request, helping the issuer approve, decline, or step-up (3DS). Visa prevents ~$25 billion in fraud annually using this system.

**How it works in the authorization flow:**
```
Acquirer ──0100──> VisaNet ──┬──> VAA Scoring Engine (~1ms)
                             │     - Analyze 500+ risk attributes
                             │     - Score 0 (low risk) to 99 (high risk)
                             │     - Append score to auth request
                             │
                             └──> Issuer (receives auth request + risk score)
                                   - Use score in own decisioning
                                   - Low score → approve
                                   - Medium score → 3DS challenge
                                   - High score → decline
```

**Two scoring models:**

```
VAA (Visa Advanced Authorization):
  - Covers ALL transaction types (card-present + card-not-present)
  - 500+ risk attributes per transaction
  - Gradient boosting + ensemble models
  - Scoring: ~1ms per transaction
  - Updated: retrained regularly on new fraud patterns

VDA (Visa Deep Authorization):
  - Purpose-built for card-not-present (e-commerce)
  - Recurrent Neural Networks (RNNs) — deep learning
  - Models long-term cardholder + merchant behavior sequences
  - Captures temporal patterns (spending velocity, time-of-day)
  - More accurate for online fraud than VAA alone
```

**Risk attributes analyzed (500+):**
```
Cardholder behavior:
  - Spending patterns (amount, frequency, time of day)
  - Geographic patterns (usual locations vs current)
  - Merchant category patterns (usual MCCs vs current)
  - Device fingerprint (if available)
  - Transaction velocity (how many in last N minutes)

Merchant signals:
  - Merchant fraud rate history
  - MCC risk level
  - Terminal type (POS, e-commerce, MOTO)
  - Country risk score

Network-wide intelligence:
  - Card tested at high-fraud merchants recently?
  - Compromised card BIN ranges
  - Known fraud patterns across the network
  - Account number used in failed attempts elsewhere
```

**1ms latency budget — how?**
```
Pre-computation:
  - Cardholder features computed incrementally (not recalculated per request)
  - Merchant risk profiles pre-built in batch (updated hourly)
  - Model weights in GPU/CPU memory (no disk I/O during inference)

Inference optimization:
  - Model quantized for speed (INT8 instead of FP32)
  - Feature extraction pipeline heavily optimized (no Python, C/C++)
  - Batch inference where possible (multiple transactions per GPU call)
  - Co-located with VisaNet routing (no network hop for scoring)

Feature store:
  - In-memory (Redis-like) for real-time features
  - Pre-computed in Flink/Spark for batch features
  - Updated incrementally on each transaction
```

**General software pattern: In-Path ML Scoring**

```ruby
# Same pattern: score requests in the hot path
class TransactionAuthorizer
  def authorize(transaction)
    # 1. Compute features (pre-aggregated in Redis)
    features = FeatureStore.get(transaction.card_id)

    # 2. Score with ML model (< 10ms target)
    risk_score = FraudModel.predict(
      amount: transaction.amount,
      merchant_mcc: transaction.mcc,
      country: transaction.country,
      velocity_1h: features[:tx_count_1h],
      velocity_24h: features[:tx_count_24h],
      avg_amount: features[:avg_amount],
      distance_from_last: features[:distance_km]
    )

    # 3. Decision based on score
    decision = case risk_score
               when 0..29  then :approve
               when 30..69 then :challenge  # 3DS step-up
               when 70..99 then :decline
               end

    # 4. Update features for next transaction
    FeatureStore.increment(transaction.card_id, transaction)

    { decision: decision, risk_score: risk_score }
  end
end

# Feature store: incremental updates, not full recomputation
class FeatureStore
  def self.increment(card_id, transaction)
    redis.multi do |r|
      r.incr("card:#{card_id}:tx_count_1h")
      r.expire("card:#{card_id}:tx_count_1h", 3600)
      r.incrbyfloat("card:#{card_id}:total_1h", transaction.amount)
      r.set("card:#{card_id}:last_country", transaction.country)
      r.set("card:#{card_id}:last_ts", Time.current.to_i)
    end
  end
end
```

**Where you see this pattern:**
- Google Ads: bid scoring in < 10ms during ad auction
- Netflix: recommendation scoring during page load
- Stripe Radar: fraud scoring on every payment
- Email spam filters: score every inbound email in-path
- WAF (Web Application Firewall): score every HTTP request

**Rule of thumb:** For in-path scoring, pre-compute features incrementally (don't recalculate from raw data on each request). Keep models in memory. Target < 10ms for the scoring step. Use simpler models for speed (gradient boosting > deep learning for latency). Feed scores to the decision-maker (issuer) — don't make the final decision in the scoring service. Update the feature store on every transaction so the next scoring is based on fresh data.
