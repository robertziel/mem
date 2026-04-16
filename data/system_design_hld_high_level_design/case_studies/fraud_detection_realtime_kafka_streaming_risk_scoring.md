### Design a Real-Time Fraud Detection System

**Requirements:**
- Process millions of transactions/sec with < 100ms latency
- Detect fraudulent transactions before they complete
- Support rules (velocity checks, geo anomalies) and ML scoring
- Zero false negatives tolerance is low; minimize false positives
- Full audit trail for compliance

**High-level architecture:**
```
┌──────────┐    ┌───────────┐    ┌──────────────────┐    ┌──────────┐
│ Payment  │───>│  Kafka    │───>│ Stream Processor  │───>│ Decision │
│ Gateway  │    │  Topics   │    │ (Flink/ksqlDB)    │    │ Engine   │
└──────────┘    └───────────┘    └──────────────────┘    └──────────┘
                     │                    │                     │
                     │           ┌────────▼────────┐    ┌──────▼──────┐
                     │           │ Feature Store   │    │ Approve /   │
                     │           │ (Redis)         │    │ Challenge / │
                     │           └─────────────────┘    │ Block       │
                     │                                  └──────┬──────┘
                     ▼                                         │
              ┌─────────────┐                          ┌───────▼──────┐
              │ Audit Log   │                          │ Notification │
              │ (S3/Iceberg)│                          │ Service      │
              └─────────────┘                          └──────────────┘
```

**Kafka topics design:**
```
transactions.raw          — every transaction event from payment gateway
transactions.enriched     — after feature enrichment (user history, device info)
transactions.scored       — after ML risk scoring
transactions.decisions    — approve/challenge/block outcomes
transactions.alerts       — flagged for human review
```

**Stream processing — velocity checks (Flink/ksqlDB):**
```sql
-- Transactions per user in last 5 minutes (tumbling window)
SELECT user_id,
       COUNT(*) AS tx_count_5m,
       SUM(amount) AS total_5m
FROM transactions_raw
WINDOW TUMBLING (SIZE 5 MINUTES)
GROUP BY user_id
HAVING tx_count_5m > 10 OR total_5m > 5000;

-- Geo-anomaly: impossible travel (two countries in < 1 hour)
-- Compare current transaction location with last known location
-- Flag if distance / time implies speed > 900 km/h
```

**Feature store (Redis) — real-time features per user:**
```
user:{id}:tx_count_1h      — transactions in last hour
user:{id}:tx_count_24h     — transactions in last 24 hours
user:{id}:total_amount_1h  — sum amount last hour
user:{id}:last_country     — last transaction country
user:{id}:last_device      — last device fingerprint
user:{id}:avg_tx_amount    — rolling average transaction amount
```

**Risk scoring pipeline:**
```
1. Transaction arrives → Kafka (transactions.raw)
2. Flink enriches with features from Redis → Kafka (transactions.enriched)
3. Rule engine evaluates:
   - Velocity: > 10 tx/5min → flag
   - Amount: > 3× user average → flag
   - Geo: impossible travel → flag
   - Device: new device + high amount → flag
4. ML model scores (0.0–1.0 risk probability)
5. Decision engine combines rules + ML score:
   - score < 0.3 → APPROVE
   - 0.3 ≤ score < 0.7 → CHALLENGE (3D Secure, OTP)
   - score ≥ 0.7 → BLOCK
6. Decision → Kafka (transactions.decisions) → Payment Gateway
```

**ML model serving:**
```
- Online inference: model served via gRPC (< 10ms per prediction)
- Features: real-time (Redis) + batch (user history from data warehouse)
- Model types: gradient boosting (XGBoost) for tabular features,
  neural network for sequence patterns (transaction sequences)
- Retrain: daily on new labeled fraud data
- Shadow mode: new models run alongside production, compare before swap
```

**Key design decisions:**

| Decision | Choice | Why |
|----------|--------|-----|
| Streaming platform | Kafka | Durable, ordered, replayable, handles millions/sec |
| Stream processor | Flink | Exactly-once, windowed aggregations, low latency |
| Feature store | Redis | Sub-ms reads for real-time features |
| ML serving | gRPC microservice | Low latency, language-agnostic |
| Audit storage | S3 + Iceberg | Immutable, queryable, cheap at scale |
| Decision latency | < 100ms end-to-end | Must decide before payment completes |

**Handling false positives:**
- Feedback loop: user confirms "this was me" → label as not-fraud → retrain
- Challenge (3DS/OTP) as middle ground — don't block, verify
- Whitelist trusted devices/merchants
- Gradual ramp: new rules in shadow mode before enforcement

**Scalability:**
- Kafka partitioned by user_id (all tx for same user go to same partition → ordered)
- Flink parallelism matches Kafka partition count
- Redis cluster for feature store (shard by user_id)
- Horizontally scale ML serving replicas behind load balancer

**Rule of thumb:** Ingest everything into Kafka first — it's your durable event log. Enrich in-stream with Flink, not at rest. Keep feature store in Redis for sub-ms reads. Combine rules (interpretable, fast to update) with ML (catches novel patterns). Always have a challenge tier between approve and block — it reduces both false positives and fraud losses.
