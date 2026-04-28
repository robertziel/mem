### Two-Tower / Dual-Encoder (DSSM, deep retrieval, query / item embeddings, negative sampling)

**When:** retrieve top-K items from huge catalogs (millions to billions) **fast enough for online serving**. Two-tower models encode query (or user / context) and items separately into a shared embedding space, then use **approximate nearest neighbor (ANN) search** for retrieval. The default architecture for **modern large-scale recommendation and search**.

**Schema:**

```
[User / query / context]            [Item / document]
        ↓                                   ↓
   [Query tower]                     [Item tower]
        ↓                                   ↓
   query embedding (d-dim)         item embedding (d-dim)
        \                                   /
         \                                 /
          dot product (or cosine similarity)
                       ↓
                 score (relevance)
```

| Concept | Detail |
|---|---|
| **Two towers** | Independent encoders for query and item |
| **Shared embedding space** | Both produce d-dimensional vectors (e.g., 64–256) |
| **Score** | Dot product (or cosine) of query and item embeddings |
| **Pre-compute item embeddings** | Inference: query embedding → ANN search over pre-computed item embeddings |
| **Online cost** | One query encoder forward + ANN retrieval (`O(log N)` with ANN) |

> **Key insight**: items don't change per query, so we can pre-compute their embeddings and use ANN. Online cost = encode query + search index.

#### Architecture

```python
import torch
import torch.nn as nn

class TwoTowerModel(nn.Module):
    def __init__(self, n_users, n_items, embed_dim=64):
        super().__init__()
        self.user_tower = nn.Sequential(
            nn.Embedding(n_users, embed_dim),
            nn.Linear(embed_dim, 128), nn.ReLU(),
            nn.Linear(128, embed_dim),
        )
        self.item_tower = nn.Sequential(
            nn.Embedding(n_items, embed_dim),
            nn.Linear(embed_dim, 128), nn.ReLU(),
            nn.Linear(128, embed_dim),
        )

    def forward(self, user_ids, item_ids):
        u = self.user_tower(user_ids)
        i = self.item_tower(item_ids)
        return (u * i).sum(-1)        # dot product
```

> Real towers also include **content features** (text, categorical, image embeddings, demographics) — not just IDs.

#### Training objectives

| Objective | When |
|---|---|
| **In-batch negatives** | Each query's positive item; other items in batch as negatives — fast and effective |
| **Sampled softmax** | Softmax over a sampled subset of items; corrects for sampling |
| **InfoNCE / contrastive** | Modern; same as in-batch + temperature |
| **BPR** (pairwise) | Positive > sampled negative |
| **Triplet loss** | Anchor / positive / negative |
| **Hard-negative mining** | Sample harder negatives over training |

#### In-batch negatives

```python
def in_batch_loss(query_embs, item_embs, temperature=0.05):
    # Logits: (batch, batch), each row's diagonal = positive
    logits = query_embs @ item_embs.T / temperature
    targets = torch.arange(len(logits), device=logits.device)
    return nn.functional.cross_entropy(logits, targets)
```

> Each query's "negative" items are the **other queries' positives in the same batch**. Free signal, no extra sampling.

#### Sampled softmax (when catalog is huge)

```python
# Bias correction: log-q correction for sampling distribution
logits = q @ item_embs.T - sampling_log_prob[None, :]
loss = cross_entropy(logits, targets)
```

> Subtract log of sampling probability to correct bias from non-uniform negative sampling. Used when catalog is too large to fit all items in batch.

#### Hard-negative mining

| Method | What |
|---|---|
| **Random negatives** | Easy; baseline |
| **Hard negatives** | Items the model currently scores high but aren't actually relevant |
| **Mixed** | Mix easy + hard for stability |
| **Mined from ANN index** | Query the model itself for confusing negatives |

> **Hard negatives** improve recall significantly but require careful curation — too-hard negatives are often actual positives mislabeled.

#### Inference / serving

```
1. Train two-tower model
2. Pre-compute item embeddings for entire catalog
3. Build ANN index (Faiss / ScaNN / HNSW) over item embeddings
4. At serve time:
   a. Encode query / user → q
   b. Query ANN index for top-K nearest items → candidates
   c. Optional: re-rank with heavier model
```

| Cost | Detail |
|---|---|
| Item indexing | O(N · d) memory; rebuild periodically |
| Query encoding | One forward pass on query tower |
| ANN search | O(log N) with HNSW or O(√N) with IVF-PQ |

#### ANN libraries

| Library | Strength |
|---|---|
| **Faiss** (Meta) | Fast, GPU-friendly, multiple index types |
| **ScaNN** (Google) | Best on large-scale benchmarks |
| **HNSWlib** | Pure CPU, very fast |
| **Annoy** (Spotify) | Memory-mapped, simple |
| **Qdrant / Pinecone / Weaviate / Milvus** | Managed vector DBs |
| **Redis Stack** | Vector search alongside KV store |

#### When to use two-tower vs alternatives

| Need | Use |
|---|---|
| Large catalog (1M+ items) | Two-tower + ANN |
| Need item / user features | Two-tower (handles natively) |
| Cold-start items / users | Content features in towers |
| Multi-stage retrieval + ranking | Two-tower for retrieval, deeper model for ranking |
| Small catalog (< 10K) | Plain neural CF or matrix factorization |
| Sequential behavior crucial | Sequence models (SASRec, BERT4Rec) — extends two-tower |
| Multi-modal | Two-tower with vision / text encoders |

#### Architectural variants

| Variant | What |
|---|---|
| **Symmetric two-tower** | Same architecture, different weights |
| **Asymmetric** | Different architectures per side |
| **Multi-tower** | Separate towers for different feature types |
| **Mixture of experts** | Multiple towers per side; gated combination |
| **Sequence-aware** | User tower has transformer over recent interactions |
| **Contextual** | Query tower includes context (location, device, time) |

#### Production patterns

| Pattern | Detail |
|---|---|
| **Periodic re-index** | Rebuild ANN index daily / hourly |
| **Real-time updates** | Incremental index updates for hot items |
| **Sharded index** | Per-region or per-segment indices |
| **Batched query** | Multiple users in one ANN call |
| **Index in memory** | RAM-resident for sub-ms latency |
| **Offline retrieval + online ranking** | Pre-compute candidates; rank online |

#### Multi-tower for ranking

After retrieval, often use a heavier ranking model:

```
Retrieval (two-tower + ANN)  → top-1000 candidates
       ↓
Cross-attention / Wide & Deep / DLRM  → top-100 ranked
       ↓
Business logic + diversity   → top-10 shown
```

> Two-tower's **independent encoders** make it fast (pre-compute items), but **lose interaction features**. Cross-attention models score (query, item) **together** — slower but more accurate. Use both: cheap retrieval, expensive ranking.

#### Loss design choices

| Choice | Effect |
|---|---|
| Cosine vs dot product | Cosine more stable; dot product gives implicit norm-as-importance |
| Temperature `τ` | Lower → sharper distribution; tune (0.05–0.5 typical) |
| Symmetric loss (q→i AND i→q) | Better embeddings |
| L2 normalize embeddings | Ensures cosine geometry; standard with cosine sim |

#### Industry examples

| Company | Use |
|---|---|
| **YouTube** | Candidate generation tower (Covington 2016 paper) |
| **Pinterest** | PinSage (graph-based two-tower) |
| **Google Search** | Dual-encoder + dense retrieval |
| **Facebook** | DLRM with deep towers |
| **Amazon** | Item retrieval + ranking pipeline |
| **Netflix** | Multi-task deep retrieval |
| **Spotify** | Two-tower for podcast / song retrieval |

#### Loss for ranking metrics

For top-K, optimize **softmax cross-entropy** (in-batch negatives) or **contrastive (InfoNCE)** — they correlate well with NDCG. **BPR** for pairwise.

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Optimizing in-batch loss but evaluating top-K NDCG | Validate with the deployment metric |
| Random negatives only on huge catalogs | Use hard negatives + bias correction |
| ANN index trained on outdated items | Periodic refresh |
| Cold-start items absent from index | Add immediately on creation; warm with content features |
| Embedding norm drift | L2 normalize embeddings |
| Skewed embeddings (popular items dominate) | Sampled-softmax bias correction; explicit popularity normalization |
| Same model serves retrieval + ranking | Different objectives; use separate models |
| Forgetting to pre-warm ANN | First requests timeout |
| Asymmetric data (query distribution shifts) | Re-train / re-index on recent data |

#### Cold start in two-tower

| Problem | Fix |
|---|---|
| New item, no interactions | Item tower uses **content features** → initial embedding from features alone |
| New user | User tower uses demographics + onboarding signals |
| Hot item out of index | Real-time index updates / streaming ingestion |
| Sparse signal | Hybrid with content-based recs as fallback |

#### Evaluation

| Metric | Pre-training | Online |
|---|---|---|
| Recall@K (offline) | Held-out positives | Click-through rate |
| NDCG@K | Same | User satisfaction |
| Coverage | Fraction of catalog retrieved | Same |
| Latency p95 | Local | Production trace |

> Always **A/B test online** — offline NDCG often correlates weakly with business metrics.

#### Decision

```
Catalog size?
├─ < 10K items                        → Plain CF / matrix factorization
├─ 10K–1M items                        → Two-tower OR cross-attention
├─ > 1M items, fast online retrieval  → Two-tower + ANN
└─ Multi-stage: retrieval + ranking
   ├─ Retrieval                        → Two-tower
   └─ Ranking on candidates            → Cross-attention / DLRM / Wide & Deep
```

**Rule of thumb:** **two-tower / dual-encoder = the standard architecture for large-scale retrieval**. Pre-compute item embeddings; use **ANN (Faiss, ScaNN)** for online lookup. Train with **in-batch negatives + InfoNCE**; add **hard-negative mining** to scale recall. **L2 normalize embeddings** for stable cosine geometry. Pair with **cross-attention ranking model** for two-stage pipeline. **A/B test online** — offline metrics misleadingly optimistic.
