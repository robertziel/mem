### Feature Store (Feast, Tecton — offline / online, consistency, train-serve skew)

**When:** ML systems with **multiple models or use cases sharing features** — recommendation, fraud, ranking, churn. A feature store provides **one canonical definition** for each feature, served identically at training and inference time. The standard cure for **train-serve skew**.

**Schema (the dual-store model):**

| Layer | Purpose | Latency | Backed by |
|---|---|---|---|
| **Offline store** | Training; large historical data | minutes–hours | Data warehouse (BigQuery, Snowflake), object store (S3 + Parquet) |
| **Online store** | Real-time inference; key-value lookups | < 10 ms | Redis, DynamoDB, Bigtable, Cassandra |
| **Feature registry** | Source of truth for definitions, ownership, lineage | — | Postgres / Git |
| **Materialization** | Sync offline → online for serving | Periodic | Airflow / streaming |
| **Feature server** | Online API: "give me the latest features for these IDs" | < 10 ms | gRPC / REST |

> **Same feature definition** produces both offline (for training) and online (for serving) values — guaranteeing consistency.

#### Why a feature store?

| Pain without it | Solution |
|---|---|
| Train-serve skew | Single feature definition, dual materialization |
| Re-implementing the same features per model | Reuse across teams |
| Backfilling historical features for new model | Point-in-time correctness |
| Inconsistent feature freshness | SLAs on staleness |
| No discoverability ("does feature X already exist?") | Catalog / search |
| No lineage | Track features → models → predictions |
| Stateful features (rolling windows) lost | Streaming aggregations |

#### Key concept: point-in-time correctness

Training data needs features **as they were at the prediction time** — not features known only after the event.

**Bad (leakage):**

```
user_id, signup_date, total_lifetime_purchases  ← computed from FULL history
```

**Good (point-in-time):**

```
user_id, prediction_ts, total_purchases_AS_OF(prediction_ts)
```

Feature stores join training labels with **time-aware features**:

```python
training_df = feature_store.get_historical_features(
    entity_df=labels_df,                          # has user_id + event_ts + label
    features=[
        "user_features:lifetime_value",
        "user_features:active_devices",
        "user_features:days_since_signup",
    ],
).to_df()
```

> The store ensures each row's features are computed with **only data available at `event_ts`**.

#### Feast (open-source, the canonical example)

```python
# 1. Define entity
from feast import Entity
user = Entity(name="user_id", description="User ID")

# 2. Define source
from feast import FileSource
user_stats_source = FileSource(
    path="s3://bucket/user_stats.parquet",
    timestamp_field="event_ts",
)

# 3. Define feature view
from feast import FeatureView, Field
from feast.types import Int64, Float32

user_features = FeatureView(
    name="user_features",
    entities=[user],
    ttl=timedelta(days=30),
    schema=[
        Field(name="lifetime_value", dtype=Float32),
        Field(name="active_devices", dtype=Int64),
        Field(name="days_since_signup", dtype=Int64),
    ],
    source=user_stats_source,
)

# 4. Apply to registry
fs = FeatureStore(repo_path=".")
fs.apply([user, user_features])

# 5. Materialize to online store
fs.materialize(start_date=..., end_date=...)

# 6. Get features for training
training_df = fs.get_historical_features(entity_df, ["user_features:lifetime_value"]).to_df()

# 7. Get features for online inference
features = fs.get_online_features(
    features=["user_features:lifetime_value"],
    entity_rows=[{"user_id": 123}, {"user_id": 456}],
).to_dict()
```

#### Vendors

| Tool | Use case |
|---|---|
| **Feast** | Open-source; cloud-agnostic |
| **Tecton** | Managed Feast-compatible; streaming + batch |
| **Hopsworks** | All-in-one MLOps + feature store |
| **Vertex AI Feature Store** | GCP-native |
| **SageMaker Feature Store** | AWS-native |
| **Databricks Feature Store** | Databricks-native |
| **Roll-your-own** | Redis + warehouse + service |

#### Feature types

| Type | Examples | Materialization |
|---|---|---|
| **Batch** | `lifetime_value`, `30_day_active_days` | Daily / hourly |
| **Streaming / real-time** | `clicks_in_last_5_min`, `last_event_ts` | Continuous (Flink / Kafka Streams) |
| **On-demand / request-time** | `time_since_last_click`, computed from request | Computed at serve time |
| **Embedding** | User / item vectors | Batch refresh |

#### Train-serve skew prevention

Train-serve skew is **the #1 production ML bug**. Feature store eliminates it via:

| Mechanism | Detail |
|---|---|
| Single feature definition | Both offline and online compute identically |
| Same code path | Same SQL / Python expression for both |
| Shared transformations | Encoders, scalers persisted with the feature |
| Schema validation | Feature types match between offline and online |
| Integration tests | "Compute online → compare to offline at same `event_ts`" |

#### Materialization patterns

| Pattern | Latency | Cost | Use |
|---|---|---|---|
| Batch (Airflow nightly) | Hours | Cheap | Slow-changing features |
| Micro-batch (Spark Structured Streaming) | Minutes | Medium | Hourly aggregates |
| Streaming (Flink / Kafka Streams) | Sub-minute | Expensive | Real-time fraud, recsys |
| On-demand | Milliseconds | Per-request | Request-time computations |

#### Online store backends

| Backend | Latency | Capacity | Use |
|---|---|---|---|
| **Redis** | < 1 ms | Limited (RAM) | Hot features, low-cardinality |
| **DynamoDB** | < 10 ms | Massive | AWS-native production |
| **Bigtable / HBase** | < 10 ms | Petabyte-scale | High-throughput |
| **Cassandra** | < 10 ms | Petabyte-scale | Multi-region |
| **In-memory (rocksdb embedded)** | μs | Local only | Edge inference |

#### Feature lifecycle / governance

| Step | Detail |
|---|---|
| Define in code (Git) | Feature definitions versioned |
| Document | Description, owner, downstream models |
| Test | Quality, freshness, distribution |
| Materialize | Schedule + monitoring |
| Discover | Catalog / search UI |
| Deprecate | Mark + sunset; consumers notified |
| Audit | Lineage to / from features |

#### Feature freshness SLA

| SLA | Use case |
|---|---|
| < 1 second | Real-time fraud / recommendations |
| < 1 minute | Personalization |
| < 1 hour | Marketing / ranking |
| Daily | Batch scoring, churn |
| Weekly | Long-cycle features |

> Monitor freshness with **`materialization_lag = now − last_materialized_ts`** alerts.

#### Common patterns

**Rolling windows (counts, sums, averages):**

```sql
-- Materialized as a feature
SELECT user_id,
       COUNT(*) FILTER (WHERE event_ts >= now() - interval '7 days') AS clicks_7d,
       AVG(amount) FILTER (WHERE event_ts >= now() - interval '30 days') AS avg_amount_30d
FROM events
GROUP BY user_id;
```

**Embeddings (item / user):**

```python
# Batch-compute embeddings, push to online store
# Online: lookup by ID → get 128-dim vector → use in NN inference
```

**Cross features (interactions):**

```python
# Define as a feature: "user × item recent interactions"
# Materialize via streaming aggregation
```

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Computing features differently for train vs serve | Use feature store with one definition |
| Backfill that uses future data | Point-in-time joins |
| Skipping freshness monitoring | Stale features → degraded model silently |
| Online store too slow | Redis / DynamoDB; right-size keys |
| Too many features (10,000+) | Periodic deprecation + cataloging |
| Tight coupling between feature store + serving framework | Use standard interfaces (gRPC) |
| Recomputing same feature in 5 pipelines | Centralize in store |
| Storing PII unencrypted | Encrypt at rest + in transit; access control |
| Not versioning feature definitions | Git everything |

#### Versioning features

| Versioning level | Detail |
|---|---|
| **Schema** | New column → new version |
| **Logic** | Transformation changed → new version |
| **Snapshot** | Materialized values at a moment |
| **Models reference specific versions** | Lock to ensure reproducibility |

#### Streaming features (real-time)

```
Kafka → Flink (windowed aggregations) → online store (Redis) → feature server → model
```

| Window | Examples |
|---|---|
| Sliding 5-minute | Clicks in last 5 min |
| Tumbling 1-hour | Hourly purchase total |
| Session | Within session window |
| Custom | App-specific |

#### Cost trade-offs

| Decision | Cost |
|---|---|
| Many real-time features | Streaming infra (Flink, Kafka) — expensive |
| Many batch features | Storage + compute — cheap |
| Lots of online lookups | Redis / DynamoDB scale costs |
| Pre-computed vs request-time | Storage vs compute trade-off |
| TTL / retention policy | Cost vs availability |

#### Build vs buy

| Need | Choice |
|---|---|
| Single team, < 50 features | Custom Redis + DB; Feast OSS |
| Multi-team, central platform | Feast (managed) or Tecton |
| AWS-only, deep integration | SageMaker Feature Store |
| GCP-only | Vertex AI Feature Store |
| Air-gapped / on-prem regulated | Hopsworks / custom |

#### Architecture (typical)

```
[Sources: warehouse, Kafka, S3]
            ↓
   [Transform / aggregate]
            ↓
   [Feature definitions in Git]
            ↓
   [Materialization: batch + streaming]
        ↓             ↓
[Offline store]  [Online store]
        ↓             ↓
   [Training]   [Inference (feature server)]
```

#### Decision tree

```
Multiple models share features?
├─ No                                → Don't need a feature store yet
└─ Yes
   ├─ Need real-time inference     → Online store + streaming
   ├─ Batch only                    → Just an offline store with point-in-time joins
   └─ Lots of teams / governance    → Centralized store (Tecton / Vertex AI)
```

**Rule of thumb:** **feature store eliminates train-serve skew** by providing a single feature definition served identically at training and inference. Use **point-in-time joins** to prevent data leakage. **Feast** for OSS; **Tecton / Vertex AI / SageMaker** for managed. **Real-time features** need streaming materialization (Flink). Don't over-engineer until **multiple models share features** — single-model teams can roll without one.
