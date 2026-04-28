### Collaborative Filtering (user-user, item-item, matrix factorization, implicit / explicit)

**When:** recommend items based on **user behavior** (purchases, clicks, ratings) rather than item content. The classical foundation of recommender systems — Netflix, Amazon, YouTube, Spotify all started with collaborative filtering before adding deep learning. **Default baseline** for any recommendation problem.

**Schema:**

| Concept | Detail |
|---|---|
| **Users** | Set of users `U` |
| **Items** | Set of items `I` |
| **Interaction matrix** `R ∈ R^{|U| × |I|}` | Ratings / clicks / purchases (mostly missing) |
| **Explicit feedback** | Stars, ratings, likes (sparse, biased) |
| **Implicit feedback** | Clicks, views, purchases (dense, biased toward action) |
| **Goal** | Predict `R[u, i]` for unknown pairs and recommend top-K |

#### Two flavors

| Type | Idea |
|---|---|
| **User-user CF** | "Users like you also liked X" |
| **Item-item CF** | "Users who bought this also bought X" |
| **Matrix factorization** | Learn user / item latent factors from R |
| **Hybrid** | CF + content (item features, user attributes) |

> **Item-item CF dominates in production** — items change less often than users, so item similarities are stable and cacheable.

#### User-user CF

```python
# Cosine similarity between users
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# R is users × items, with NaN for unobserved
sim = cosine_similarity(R.fillna(0))            # (n_users, n_users)

# Predict rating for user u, item i
def predict(u, i, k=20):
    similar = sim[u].argsort()[::-1][1:k+1]    # top-k similar users
    weights = sim[u, similar]
    ratings = R.iloc[similar, i].values
    mask = ~np.isnan(ratings)
    return np.average(ratings[mask], weights=weights[mask])
```

| Strength | Weakness |
|---|---|
| Intuitive | Doesn't scale beyond ~100K users |
| Interpretable ("similar users to you...") | Computationally expensive to update |

#### Item-item CF (Amazon's classic)

```python
sim_items = cosine_similarity(R.T.fillna(0))    # (n_items, n_items)

def predict(u, i, k=20):
    rated_by_u = R.iloc[u].dropna().index
    similar = sim_items[i, rated_by_u].argsort()[::-1][:k]
    sims = sim_items[i, rated_by_u][similar]
    ratings = R.iloc[u, rated_by_u].values[similar]
    return np.average(ratings, weights=sims)
```

| Why preferred | Why |
|---|---|
| Item similarities are **stable** | New users come and go; items don't change daily |
| Pre-computable | Compute once; cache; serve in O(1) |
| Scales to billions of users | Item count usually << user count |

#### Similarity metrics

| Metric | When |
|---|---|
| **Cosine** | Default; ratings or counts |
| **Pearson correlation** | Centered cosine; removes user-rating bias |
| **Adjusted cosine** | Subtract item mean (similar to Pearson but per item) |
| **Jaccard** | Binary (clicked / not) |
| **Conditional probability** (`P(j | i) = co(i,j) / count(i)`) | Asymmetric; "Amazon-style" |
| **TF-IDF on co-occurrence** | Down-weight popular items |

#### Matrix factorization (the workhorse)

Decompose `R ≈ U · Vᵀ`:

| Symbol | Shape |
|---|---|
| `R` | `(n_users, n_items)` |
| `U` | `(n_users, k)` — user latent factors |
| `V` | `(n_items, k)` — item latent factors |
| `k` | Latent dimensions (~10–200) |

> Predict: `r̂[u, i] = U[u] · V[i]ᵀ`. Recommend: top-K items by score for user `u`.

##### Funk SVD (Simon Funk's gradient descent)

```python
def funk_svd(R, k=20, lr=0.01, reg=0.02, epochs=20):
    n_u, n_i = R.shape
    U = np.random.normal(0, 0.1, (n_u, k))
    V = np.random.normal(0, 0.1, (n_i, k))
    for epoch in range(epochs):
        for u, i in zip(*np.where(~np.isnan(R))):
            err = R[u, i] - U[u] @ V[i]
            U[u] += lr * (err * V[i] - reg * U[u])
            V[i] += lr * (err * U[u] - reg * V[i])
    return U, V
```

> Famous for the **Netflix Prize** (2006). Still a strong baseline.

##### SVD with biases

```
r̂[u, i] = μ + b_u + b_i + U[u] · V[i]
```

| Term | Captures |
|---|---|
| `μ` | Global mean rating |
| `b_u` | User bias (some users always rate high) |
| `b_i` | Item bias (popular items rated high) |
| `U[u] · V[i]` | Personalized interaction |

> Adding biases improves accuracy 10–20% — most variance in ratings is bias, not preference.

#### ALS (Alternating Least Squares)

For implicit feedback or large matrices:

| Step | Action |
|---|---|
| 1 | Fix `V`, solve `U` via least squares |
| 2 | Fix `U`, solve `V` via least squares |
| 3 | Repeat until convergence |

```python
from implicit.als import AlternatingLeastSquares

# implicit feedback (counts)
model = AlternatingLeastSquares(factors=64, regularization=0.01, iterations=15)
model.fit(R_sparse_csr)              # users × items, sparse

# Recommend top-K for user
ids, scores = model.recommend(userid=42, user_items=R[42], N=10)
```

| Strength | Weakness |
|---|---|
| Parallelizable per row | Doesn't capture context / time |
| Handles implicit feedback | Tuning regularization matters |
| Scales to 10M× 10M | One model per training batch |

#### Implicit vs explicit feedback

| Property | Implicit | Explicit |
|---|---|---|
| Source | Clicks, views, purchases | Ratings, likes, stars |
| Volume | Massive | Small |
| Sparsity | Less sparse | Very sparse |
| Bias | Action ≠ love (clicked but disliked) | Selection bias (only motivated users rate) |
| Negative sample | Implicit "didn't click" — but might have not seen | Explicit non-rating ambiguous |
| Methods | ALS with confidence weights, BPR, two-tower | SVD, RBM, neural CF |

#### Implicit ALS confidence weighting

For implicit feedback, treat presence as binary preference + confidence:

`p[u, i] = 1 if r[u, i] > 0 else 0`
`c[u, i] = 1 + α · r[u, i]` (more interaction = higher confidence)

> Cost includes **all** user-item pairs (not just observed); confidence scales the loss. Hu, Koren, Volinsky 2008 paper.

#### BPR (Bayesian Personalized Ranking)

Pairwise ranking loss: prefer item `i` (clicked) over item `j` (not clicked):

`min Σ -log σ(r̂[u, i] - r̂[u, j])`

> Optimizes **ranking**, not absolute scores. Better for top-K recommendation than pointwise SVD.

#### Cold start strategies

| Cold-start | Strategy |
|---|---|
| **New user** | Onboarding survey; demographic-based recs; popularity baseline |
| **New item** | Content-based (item attributes); similar to existing items |
| **No interaction history** | Hybrid: content + CF when available |
| **First-day signups** | A/B test recommendation strategy |

#### Evaluation metrics

| Metric | What |
|---|---|
| **Precision@K** | What fraction of top-K are relevant? |
| **Recall@K** | What fraction of relevant items are in top-K? |
| **NDCG@K** | Discounted score for ranking quality |
| **MAP@K** | Mean Average Precision |
| **MRR** | Mean Reciprocal Rank of first relevant |
| **Coverage** | Fraction of catalog ever recommended |
| **Diversity** | Avg pairwise dissimilarity in top-K |
| **Novelty** | How "new" recommendations are vs popularity |
| **Serendipity** | Unexpected but liked items |
| **RMSE / MAE** | For rating prediction (less used in production) |
| **Online metrics** | Click-through rate, conversion, revenue (gold standard) |

(See ranking metrics memo for details.)

#### Train / test split for recommenders

| Strategy | Use |
|---|---|
| **Random split** | Easy, but may leak temporal info |
| **Temporal split** | Train on past, test on future — realistic |
| **Leave-one-out per user** | Hold out one item per user; classic CF eval |
| **Time-based + cohort** | Train on month 1–11, test on month 12 |

> **Always do temporal splits in production** — random splits over-estimate by 20–50%.

#### Production architecture

```
[User profile + recent behavior]
        ↓
[Candidate generation]   → top-1000 candidates
        ↓
[Ranking model]           → top-100 ranked
        ↓
[Business rules / diversity]
        ↓
[Top-K shown to user]
```

| Stage | Method |
|---|---|
| Candidate generation | Item-item CF, two-tower retrieval, ANN search on embeddings |
| Ranking | Deep model (Wide & Deep, DeepFM, DLRM); features: user, item, context |
| Re-ranking | Diversity, freshness, business rules |
| Display | A/B test variants |

#### Hybrid recommendations

Combine CF with content:

| Hybrid | How |
|---|---|
| **Switching** | Use content when CF data sparse |
| **Weighted** | Linear combination of CF + content scores |
| **Feature combination** | Concatenate as inputs to ranking model |
| **Meta-level** | Output of one model = input of another |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Random train/test split for time-aware data | Use temporal split |
| Optimizing RMSE for top-K problem | Use NDCG / Precision@K |
| Implicit feedback as positive-only | Use confidence weighting (ALS) or sample negatives (BPR) |
| Ignoring popularity bias | Add diversity / novelty constraints |
| Treating CTR as the only metric | Include long-term engagement, fairness |
| Stale embeddings | Periodically refresh; use real-time updates for hot items |
| Item-item similarity computed on raw counts | Use TF-IDF / log-IDF to deweight popular |
| Evaluating only offline | Always A/B test before launch |
| One model for everything | Ensemble + ranking |
| No exploration | Add ε-greedy / Thompson sampling for new content |

#### When to move beyond classical CF

| Signal | Move to |
|---|---|
| Need item / user features | Hybrid; two-tower |
| Sequential behavior matters | Sequence models (SASRec, GRU4Rec, BERT4Rec) |
| Multi-modal items | Two-tower with content encoders |
| Large catalog (100M items) | ANN-based retrieval (Faiss, ScaNN) |
| Many objectives (CTR + watch time + diversity) | Multi-task neural |
| Cold start is dominant | Content-based / contextual bandits |

**Rule of thumb:** **start with item-item CF or matrix factorization** — they're fast, interpretable, and competitive baselines. **Item-item CF dominates production** for stable similarities. Use **ALS with confidence weighting** for implicit feedback. **Always temporal-split for evaluation**. Top-K recommendations need **NDCG / Precision@K**, not RMSE. The first deployment should be a **simple CF baseline**; deep models earn their keep only after the foundation is in place.
