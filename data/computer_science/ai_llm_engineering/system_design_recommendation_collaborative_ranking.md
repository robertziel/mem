### AI System Design: Recommendation System

**Requirements:**
- Recommend items (products, movies, songs) to users
- Personalized based on user history and preferences
- Handle cold-start (new users, new items)
- Real-time (homepage) and batch (email) recommendations

**Architecture:**
```
User Activity → [Event Stream (Kafka)] → [Feature Store]
                                              |
                                    [Candidate Generation]
                                    (retrieve 1000s of candidates cheaply)
                                              |
                                    [Ranking Model]
                                    (score and rank top candidates)
                                              |
                                    [Business Rules / Filtering]
                                    (diversity, freshness, already-seen)
                                              |
                                    [API] → Client
```

**Two-stage architecture (industry standard):**

**Stage 1: Candidate generation (recall):**
- Goal: narrow millions of items to ~1000 candidates quickly
- Methods:
  - Collaborative filtering: users who liked X also liked Y
  - Content-based: similar items by attributes (genre, category)
  - ANN (Approximate Nearest Neighbor): embed users + items, find closest
  - Popular/trending: baseline for cold-start users

**Stage 2: Ranking (precision):**
- Goal: score ~1000 candidates, return top-K
- ML model: predicts probability of engagement (click, purchase, watch)
- Features: user history, item attributes, context (time, device, location)
- Models: gradient-boosted trees (XGBoost), deep learning, two-tower neural networks

**Recommendation approaches:**
| Approach | How | Pros | Cons |
|----------|-----|------|------|
| Collaborative filtering | Users who liked X also liked Y | No feature engineering | Cold-start problem |
| Content-based | Similar items by attributes | Works for new items | Narrow recommendations |
| Hybrid | Combine collaborative + content | Best quality | More complex |
| Embedding + ANN | Neural embeddings, vector search | Scales, captures complex patterns | Needs training data |

**Cold-start solutions:**
- New user: show popular items, ask preferences onboarding
- New item: content-based (use item attributes), boost exposure
- Exploration: blend known-good with new items (epsilon-greedy, Thompson sampling)

**Feature store:**
- Precomputed features for real-time serving (user history, item stats)
- Offline features: user lifetime value, item popularity
- Real-time features: last 5 items viewed, session duration
- Tools: Feast, Tecton, SageMaker Feature Store

**Evaluation:**
| Metric | What | Offline/Online |
|--------|------|---------------|
| Precision@K | % of recommended items that are relevant | Offline |
| Recall@K | % of relevant items that are recommended | Offline |
| NDCG | Quality of ranking (higher = better ordering) | Offline |
| CTR | Click-through rate | Online (A/B test) |
| Engagement | Time spent, purchases, saves | Online (A/B test) |

**Rule of thumb:** Two-stage: candidate generation (recall) → ranking (precision). Collaborative filtering for warm users, content-based for cold-start. Use a feature store for real-time serving. A/B test everything. Start simple (popular items + collaborative filtering) before building complex ML models.
