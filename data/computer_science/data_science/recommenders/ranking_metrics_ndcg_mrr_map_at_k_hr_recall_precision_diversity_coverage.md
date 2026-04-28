### Ranking Metrics (NDCG, MRR, MAP@K, HR, Recall, Precision, diversity, coverage)

**When:** evaluating recommendation / ranking / search systems where the **order** of items matters more than absolute scores. RMSE on rating prediction is the wrong metric for top-K problems — use ranking-specific metrics that reward putting relevant items at the top.

**Schema (top-K ranking metrics):**

| Metric | What it measures | Sensitive to order? |
|---|---|---|
| **Precision@K** | What fraction of top-K are relevant? | No (any top-K) |
| **Recall@K** | What fraction of relevant items are in top-K? | No |
| **HR@K** (Hit Rate) | Did we surface ≥ 1 relevant in top-K? | No |
| **MRR** (Mean Reciprocal Rank) | `1 / rank` of first relevant item | **Yes** |
| **MAP@K** (Mean Average Precision) | Average precision averaged over relevant ranks | **Yes** |
| **NDCG@K** | Discounted gain weighted by rank, normalized | **Yes** |
| **Coverage** | Fraction of catalog ever recommended | — |
| **Diversity** | Avg pairwise dissimilarity in top-K | — |
| **Novelty** | How "new" recommendations are vs popularity | — |
| **Serendipity** | Unexpected but liked | — |

> **NDCG is the gold-standard ranking metric** — sensitive to order, handles graded relevance, well-defined. Use it as primary; pair with HR / Coverage for context.

#### Precision@K

`Precision@K = #relevant in top-K / K`

| Setting | Use |
|---|---|
| Top-K display (e.g., 10 results) | Most useful K = display size |
| Multiple relevant items per query | Standard |
| Single relevant item | Same as HR@K |

```python
def precision_at_k(recommended, relevant, k):
    """recommended: list of item IDs in rank order; relevant: set"""
    top_k = recommended[:k]
    return sum(item in relevant for item in top_k) / k
```

#### Recall@K

`Recall@K = #relevant in top-K / total #relevant`

| Use | Detail |
|---|---|
| Search / retrieval | "How many of the relevant docs did we find?" |
| Recommendation | When user has fixed set of likes |
| Cold-start | Hard to define "all relevant" — careful |

#### HR@K (Hit Rate)

```python
def hr_at_k(recommended, relevant, k):
    return int(any(item in relevant for item in recommended[:k]))
```

> Binary: 1 if any relevant item in top-K, else 0. Average over all queries / users.

#### MRR (Mean Reciprocal Rank)

`MRR = (1 / |Q|) · Σ_q 1 / rank_of_first_relevant`

```python
def reciprocal_rank(recommended, relevant):
    for i, item in enumerate(recommended, 1):
        if item in relevant:
            return 1 / i
    return 0
```

| Use | Detail |
|---|---|
| Q&A / search where there's **one** correct answer | Strong fit |
| Recommendation where first hit matters | Common |

#### MAP@K (Mean Average Precision)

For each query, compute **Average Precision** = mean of `Precision@k` at each relevant rank in top-K. Then average over queries.

```python
def average_precision(recommended, relevant, k):
    score = 0.0
    n_hits = 0
    for i, item in enumerate(recommended[:k], 1):
        if item in relevant:
            n_hits += 1
            score += n_hits / i
    return score / min(len(relevant), k) if relevant else 0
```

#### NDCG@K (the gold standard)

**Discounted Cumulative Gain:**

`DCG@K = Σ_{i=1..K} rel_i / log₂(i + 1)`

**Normalized:** divide by **ideal DCG** (best-case ordering):

`NDCG@K = DCG@K / iDCG@K`

```python
import numpy as np

def dcg(relevances, k):
    rels = np.asarray(relevances)[:k]
    return np.sum(rels / np.log2(np.arange(2, len(rels) + 2)))

def ndcg_at_k(predicted_relevances, true_relevances, k):
    actual_dcg = dcg(predicted_relevances, k)
    ideal = dcg(sorted(true_relevances, reverse=True), k)
    return actual_dcg / ideal if ideal > 0 else 0
```

| Property | Detail |
|---|---|
| **Graded relevance** | Supports relevance scores, not just binary |
| **Position-discounted** | Lower ranks contribute less |
| **Normalized [0, 1]** | Comparable across queries |
| Most common in production | Yes |

> Use NDCG@10 (or NDCG@K for whatever K matters in your UI).

#### Online metrics

| Metric | What |
|---|---|
| **CTR** (click-through rate) | Clicks / impressions |
| **Conversion rate** | Conversions / clicks |
| **Engagement (watch time, dwell)** | Long-form metric |
| **Revenue per session** | Ultimate business metric |
| **DAU / MAU shift** | Long-term retention |
| **Bounce rate** | Inverse engagement |

> Online metrics are **gold standard**; offline metrics are proxies. **Always A/B test before declaring victory** based on offline NDCG alone.

#### Beyond accuracy: diversity / novelty / serendipity

| Metric | Formula |
|---|---|
| **Intra-list diversity** | Avg pairwise distance among top-K items |
| **Coverage** | Unique items recommended / total catalog |
| **Novelty** | Mean `−log(popularity)` of recommended items |
| **Serendipity** | Relevant + unexpected (relative to baseline pop) |
| **Long-tail share** | Fraction of recommendations from non-top items |

```python
def intra_list_diversity(items, similarity_matrix):
    """Avg pairwise dissimilarity among top-K items."""
    pairs = [(i, j) for i in range(len(items)) for j in range(i+1, len(items))]
    return np.mean([1 - similarity_matrix[items[i], items[j]] for i, j in pairs])
```

#### Filter / fairness metrics

| Metric | What |
|---|---|
| **Demographic parity in recs** | Recommendation rate equal across groups |
| **Calibration in ranking** | Predicted score matches observed CTR per bucket |
| **Exposure fairness** | Items / creators get fair share of impressions |
| **Filter bubble metrics** | Diversity of opinions / sources |

#### Group-level evaluation

```python
# Avg NDCG by user segment
for segment, sub in user_df.groupby("segment"):
    ndcg_segment = np.mean([ndcg_at_k(r, t, 10) for r, t in zip(sub.recs, sub.true)])
    print(f"{segment}: {ndcg_segment:.3f}")
```

> Aggregate metrics hide segment regressions. **Always evaluate per-segment** (cohort, country, language, device).

#### Pointwise vs pairwise vs listwise loss

| Loss | What |
|---|---|
| **Pointwise** | Predict relevance per (q, i) — RMSE / cross-entropy on score |
| **Pairwise** | Prefer relevant `i` over irrelevant `j` — BPR, RankNet |
| **Listwise** | Optimize ranking quality directly — LambdaRank, ListNet |

| Loss type | Aligns with metric | Difficulty |
|---|---|---|
| Pointwise | RMSE | Easy |
| Pairwise | NDCG (approximately) | Medium |
| Listwise | NDCG (directly) | Hard |

> Use **LambdaRank / LambdaMART** (pairwise with NDCG-aware weighting) for ranking — standard in search and recommendations.

#### Implicit feedback evaluation

When you only see clicks (no explicit "irrelevant"):

| Approach | Detail |
|---|---|
| Treat clicked items as relevant; sample non-clicks as irrelevant | Standard but assumes "didn't click = irrelevant" |
| Use exposure logs | Only count items the user actually saw |
| Counterfactual / IPS | Inverse propensity scoring |
| Position bias correction | Click ≠ relevance — discount by position click prob |

#### Position bias

Users click higher-ranked items more, **even if quality is identical**. Naive evaluation rewards already-popular items.

| Fix | How |
|---|---|
| **Inverse propensity scoring** (IPS) | Weight by `1 / P(click | position)` |
| **Counterfactual estimation** | Estimate "what would CTR be if all positions equal?" |
| **Random arm** | Reserve a fraction of traffic for unbiased eval |
| **Click models** (cascade, DCM) | Model click as `relevance × examination` |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Reporting RMSE / MAE on rating data | Top-K problems need NDCG / Precision@K |
| Aggregating metrics over all queries equally | Weight by query importance / frequency |
| Single K (e.g., NDCG@10) | Report curve over K |
| Ignoring diversity | Top accuracy with all-popular items often loses long-term |
| Position bias not corrected | Inflates click-based metrics |
| Cold-start items penalized | They have no ground truth; segment them |
| Same metric for retrieval + ranking | Recall@1000 (retrieval) vs NDCG@10 (ranking) |
| One offline metric improves, online metric drops | Always A/B test |
| Ignoring time decay | Old popular items dominate ground truth — use recency-aware truth |
| Including own predictions in test ground truth | Causes feedback loop |

#### Multi-objective optimization

| Objective | Trade-off |
|---|---|
| Relevance + diversity | DPP (Determinantal Point Process), MMR |
| Relevance + novelty | Add `−log(popularity)` weighting |
| Relevance + business goals (revenue) | Multi-task learning; reweight loss |
| Relevance + fairness | Constrained optimization; equity bonus |

#### Picker

```
Top-K problem with binary relevance?
├─ One right answer per query              → MRR
├─ Multiple relevant, want top items hit   → HR@K, Precision@K
├─ Care about ranking quality              → NDCG@K (preferred)
└─ Long ranked list                         → MAP@K, NDCG with full list

Have graded relevance?
└─ Always NDCG (handles grades natively)

Production validation?
└─ A/B test online (CTR, conversion, retention)
```

#### Reporting template

For each model / experiment, report:

| Metric | Overall | Per segment |
|---|---|---|
| NDCG@10 | 0.34 | 0.29 (mobile), 0.36 (web), 0.31 (new users) |
| Precision@10 | 0.18 | … |
| Coverage | 24% | — |
| Diversity | 0.62 | — |
| Latency p95 | 45ms | — |
| Online CTR (A/B) | +3.2% (95% CI) | — |

**Rule of thumb:** **NDCG@K is the default ranking metric** for top-K recommendation / search. **Pair with diversity, coverage, novelty** to avoid accuracy-but-boring traps. **Pointwise loss for prediction; pairwise (LambdaRank) for ranking**. **Always evaluate per-segment** — aggregate hides regressions. **Online A/B test is the gold standard** — offline metrics are proxies that often correlate weakly with business outcomes.
