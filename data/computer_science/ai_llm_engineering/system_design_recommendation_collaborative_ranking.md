### System Design — Recommendation System (Two-Stage)

**Definition:** recommend personalized items (products, movies, songs) to users at scale. The **two-stage pattern is industry standard**: **candidate generation** narrows millions to ~1,000 cheaply (recall); **ranking** scores those ~1,000 to top-K precisely. Add **business rules**, **A/B testing**, and **cold-start handling**.

**Requirements:**

| Type | Detail |
|---|---|
| **Functional** | Personalized item recommendations; cold-start (new users / items); real-time + batch |
| **Non-functional** | Low latency (< 200ms p99 for homepage); scale (millions DAU); fresh data |
| **Business** | Diversity, freshness, exploration, business rules (in-stock, price tier) |

**Architecture:**

```
   User activity (clicks, views, ratings)
        │
        ▼
   ┌────────────────────────────┐
   │ Event Stream (Kafka)        │
   └─────────────┬──────────────┘
                 ▼
   ┌────────────────────────────┐
   │ Feature Store (offline + RT) │
   └─────────────┬──────────────┘
                 │
                 ▼
   ┌────────────────────────────┐
   │ Stage 1: Candidate Generation │   millions → ~1,000 candidates
   │ (cheap, recall-focused)       │
   └─────────────┬──────────────┘
                 │
                 ▼
   ┌────────────────────────────┐
   │ Stage 2: Ranking              │   ~1,000 → top-K
   │ (expensive, precision-focused)│
   └─────────────┬──────────────┘
                 │
                 ▼
   ┌────────────────────────────┐
   │ Business rules / Filtering    │   diversity, freshness, already-seen
   └─────────────┬──────────────┘
                 │
                 ▼
   API → Client
```

**Stage 1 — Candidate Generation (recall):**

| Method | Detail |
|---|---|
| **Collaborative filtering (CF)** | "Users who liked X also liked Y" |
| **Matrix factorization (MF)** | Users + items → low-dim embeddings |
| **Content-based** | Similar items by attributes (genre, brand, category) |
| **ANN search (two-tower)** | Embed user + items, find nearest in vector space |
| **Popularity / trending** | Baseline for cold-start |
| **Recently viewed / similar** | Item co-view patterns |
| **Graph-based** | PageRank-style on user-item graph |

**Stage 2 — Ranking (precision):**

| Property | Detail |
|---|---|
| Score each candidate | Probability of engagement (click, watch, purchase) |
| **Models**: gradient-boosted trees (XGBoost), DNN, two-tower, GBDT + DNN | Trade simplicity vs accuracy |
| **Features**: user history, item attrs, context (time, device, location) | Hundreds typically |
| **Output**: scored list | Sort + apply business rules |

**Recommendation approach comparison:**

| Approach | How | Pros | Cons |
|---|---|---|---|
| **Collaborative filtering** | Co-occurrence in interactions | No feature engineering | Cold-start problem |
| **Content-based** | Similarity by attributes | Works for new items | Narrow / "filter bubble" |
| **Matrix factorization** | User × item → low-dim embeddings | Captures latent factors | Cold-start, no explicit features |
| **Hybrid** | Combine CF + content | Best quality | More complex |
| **Two-tower DNN** | User-tower + item-tower → ANN | Scales, captures complex patterns | Needs training data + serving infra |
| **Graph neural network (GNN)** | Embed via graph structure | Capture relationships | Complex training |
| **LLM-based** | Embed text descriptions / reasoning | Cold-start, multilingual | Cost, latency |

**Cold-start strategies:**

| Cold-start type | Strategy |
|---|---|
| **New user** | Show popular / trending; ask preferences in onboarding |
| **New item** | Content-based via attributes; boost exposure for N days |
| **Both new** | Pure popularity baseline |
| **Sparse interactions** | Add side information (demographics, content) |
| **Exploration** | Epsilon-greedy / Thompson sampling — show ε% novel |

**Feature store — separate concerns:**

| Type | Examples | Update freq |
|---|---|---|
| **Offline features** | User LTV, total purchases, avg session length | Daily / hourly batch |
| **Real-time features** | Last 5 items viewed, current session length | Per-event |
| **Item features** | Category, price, popularity score | Daily / on-update |
| **Context features** | Time of day, day of week, device, location | Per-request |

**Tools:**

| Tool | Detail |
|---|---|
| **Feast** | OSS feature store |
| **Tecton** | Managed feature platform |
| **SageMaker Feature Store** | AWS-native |
| **Vertex AI Feature Store** | GCP |

**Evaluation — offline vs online:**

| Metric | What | Phase |
|---|---|---|
| **Precision @ K** | % of top-K that are relevant | Offline |
| **Recall @ K** | % of relevant items in top-K | Offline |
| **NDCG @ K** | Quality of ranking (better order = higher) | Offline |
| **MAP** (mean avg precision) | Average across users | Offline |
| **Hit rate** | Did user click any recommendation? | Online |
| **CTR** (click-through rate) | Click ratio | Online (A/B) |
| **Engagement** (time, purchase, save) | Long-term value | Online (A/B) |
| **Diversity** | Variety in recommendations | Both |
| **Coverage** | What % of catalog is recommended | Offline |

**A/B testing setup:**

| Component | Detail |
|---|---|
| Hash user_id → bucket | Stable assignment |
| Control vs treatment | 50/50 typical, smaller for risky |
| Metric: business KPI | CTR, revenue, retention |
| Statistical significance | Sample size + confidence |
| Holdout period | At least one full cycle (week) |
| Guardrail metrics | Latency, error rate, complaints |

**Latency budget — typical homepage:**

| Step | Budget |
|---|---|
| Feature lookup | 10–30 ms |
| Candidate generation | 30–80 ms |
| Ranking | 50–100 ms |
| Filtering / business rules | 5–15 ms |
| Total | < 200 ms p99 |

**Caching strategies:**

| Cache | Detail |
|---|---|
| **Pre-compute per user** | Daily batch; serve from cache; freshness lag |
| **Real-time online** | Compute per-request; latency cost |
| **Hybrid** | Most users from cache; active users real-time |
| **Edge caching** | CDN for popular landings |

**Common patterns:**

| Pattern | Use |
|---|---|
| **Homepage** | Real-time scoring (full pipeline) |
| **"Similar to X"** | Item-item similarity via ANN |
| **"Because you bought Y"** | CF over recent activity |
| **Email recommendations** | Daily batch (no real-time) |
| **Push notifications** | Pre-computed; trigger on event |

**Scaling considerations:**

| Concern | Mitigation |
|---|---|
| Inference latency | Two-tower → ANN for candidates |
| Training cost | Incremental updates, online learning |
| Storage of features | Tiered (hot in Redis, cold in S3) |
| Model freshness | Daily retrain; feature drift monitoring |
| Multi-tenant fairness | Diverse exposure per item |
| Negative feedback | Implicit (skip, dwell time) + explicit |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Single-stage ranking on millions of items | Latency / cost explosion |
| Ignoring cold-start | New users / items invisible |
| Optimizing only CTR | Clickbait, low-quality engagement |
| Recommending already-seen items | Bad UX |
| No diversity constraint | Filter bubble |
| Skipping A/B tests | Can't tell if changes help |
| Training on biased data | Reinforces existing skew |
| Models without retraining | Drift over time |
| Synchronous DB lookups in hot path | Latency stacks |
| Forgetting business rules (out-of-stock, age-restricted) | Embarrassing recs |

**Decision matrix:**

| Need | Pick |
|---|---|
| First system | Popularity + simple CF |
| Mid-scale, cold-start matters | Hybrid (CF + content) |
| Large-scale, complex patterns | Two-tower DNN + ANN |
| Real-time personalization | Online ranking + feature store |
| Email / push (no real-time) | Daily batch |
| Multi-product (homepage, search, similar) | Multi-stage with shared features |

**Cross-references:**

- Vector DB / ANN: [vector_databases_*.md](vector_databases_embeddings_similarity_search.md)
- LLM deployment: [llm_deployment_*.md](llm_deployment_serving_latency_optimization.md)
- Customer support chatbot (similar architecture): [chatbot_*.md](system_design_customer_support_chatbot_rag_intent_handoff.md)
- Caching strategies: [caching_strategies_*.md](../system_design_hld_high_level_design/patterns/caching_strategies_redis_memcached_invalidation.md)

**Rule of thumb:** **Two-stage: candidate generation (recall, cheap) → ranking (precision, expensive).** Start simple — **popularity + collaborative filtering** — before building complex DNN models. **Use a feature store** to share features between training and serving. **A/B test everything**; offline metrics (NDCG) approximate but online metrics (CTR, engagement) are the truth. Handle **cold-start** explicitly with content-based fallback + exploration.
