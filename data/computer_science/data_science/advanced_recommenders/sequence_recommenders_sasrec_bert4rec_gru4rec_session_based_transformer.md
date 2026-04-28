### Sequence Recommenders (SASRec, BERT4Rec, GRU4Rec, session-based, transformer)

**When:** users' **order of past actions matters** for next-item prediction — content feeds, e-commerce next-purchase, music streaming, video recommendations. Sequence models capture temporal dynamics that classical CF misses (recency, order, sequential patterns).

**Schema:**

| Concept | Detail |
|---|---|
| **Input** | User's interaction sequence `[i₁, i₂, …, iₜ]` |
| **Target** | Next item `iₜ₊₁` |
| **Architecture** | RNN, GRU, LSTM, Transformer (self-attention) |
| **Training task** | Next-item prediction (autoregressive) or masked-item prediction (BERT-style) |
| **Use case** | "What should I show next given the user's recent activity?" |

> Sequence recommenders treat user behavior as a **sequence prediction problem**, similar to language modeling.

#### Algorithm comparison

| Model | Architecture | Training | When |
|---|---|---|---|
| **GRU4Rec** | GRU | Next-item prediction | Session-based; classical baseline |
| **SASRec** | Causal (decoder) self-attention | Autoregressive | Strong default; like GPT for items |
| **BERT4Rec** | Bidirectional (encoder) self-attention | Masked-item prediction | Strongest accuracy; like BERT for items |
| **Caser** | CNN over sequence | Next-item | Older, less common |
| **NextItNet** | Dilated CNN | Same | Specialized |
| **Transformers4Rec (NVIDIA)** | Various | Various | Production-friendly framework |
| **TiSASRec** | SASRec + time embeddings | Same | Adds time-of-action info |
| **SR-GNN** | Graph NN over sessions | Same | Graph-based |
| **HGN, SHAN** | Hierarchical attention | Same | Session + long-term |

#### GRU4Rec (the classical RNN baseline)

```
[i_1, i_2, ..., i_t] → embedding → GRU → hidden state → softmax over items
                                                           ↓
                                                     P(next item)
```

```python
import torch.nn as nn

class GRU4Rec(nn.Module):
    def __init__(self, n_items, embed_dim=128, hidden=256):
        super().__init__()
        self.embed = nn.Embedding(n_items, embed_dim)
        self.gru = nn.GRU(embed_dim, hidden, batch_first=True)
        self.head = nn.Linear(hidden, n_items)

    def forward(self, seq):
        x = self.embed(seq)
        h, _ = self.gru(x)
        return self.head(h[:, -1])     # predict next item
```

> Originally for **session-based** recs (no user identity), but generalizes. Training: cross-entropy or pairwise (BPR-max).

#### SASRec (self-attentive sequential recommendation)

```
[i_1, ..., i_t] → embedding + position → causal self-attention layers → predict next
```

| Component | Detail |
|---|---|
| Causal mask | Attention only to past items (decoder-style) |
| Multi-head self-attention | Captures relationships between items in sequence |
| Position embeddings | Standard transformer positional encoding |
| Output | Per-position prediction of next item |

```python
class SASRec(nn.Module):
    def __init__(self, n_items, max_len=50, embed_dim=128, n_heads=2, n_layers=2):
        super().__init__()
        self.item_embed = nn.Embedding(n_items + 1, embed_dim, padding_idx=0)
        self.pos_embed = nn.Embedding(max_len, embed_dim)
        encoder_layer = nn.TransformerEncoderLayer(embed_dim, n_heads, batch_first=True)
        self.transformer = nn.TransformerEncoder(encoder_layer, n_layers)
    def forward(self, seq):
        positions = torch.arange(seq.size(1), device=seq.device)
        x = self.item_embed(seq) + self.pos_embed(positions)
        # Causal mask for autoregressive
        mask = nn.Transformer.generate_square_subsequent_mask(seq.size(1)).to(seq.device)
        h = self.transformer(x, mask=mask)
        return h @ self.item_embed.weight.T   # logits over items
```

> SASRec is the **strong default**. Beats GRU4Rec on most benchmarks; faster to train (parallel attention).

#### BERT4Rec (bidirectional self-attention)

Trains by **masking** items in the sequence and predicting them:

```
[i_1, [MASK], i_3, [MASK], i_5] → encoder → predict masked positions
```

| Property | Detail |
|---|---|
| Bidirectional | Each item attends to all others (no causal mask) |
| Cloze training | Mask 15% of items per sequence |
| Inference | Append `[MASK]` to predict next |
| Strength | Often best accuracy on offline benchmarks |

#### Training objectives

| Objective | What |
|---|---|
| **Cross-entropy over full vocabulary** | Standard; expensive for huge catalogs |
| **Sampled softmax** | Sample negatives; bias-correct |
| **In-batch negatives** | Other batch examples as negatives |
| **BPR / pairwise** | Prefer positive over sampled negative |
| **Contrastive (InfoNCE)** | Modern; temperature-scaled |
| **Distillation** | Teacher model distills to student |

#### Key design choices

| Choice | Trade-off |
|---|---|
| **Sequence length** | Longer captures more history; more compute |
| **Embedding dim** | 64–256 typical |
| **# layers / heads** | 2 / 2 small; 6 / 8 large |
| **Position embeddings** | Learned (default), sinusoidal, T5-style |
| **Side features** | Item category, time-since-action, dwell time |
| **User embedding** | Add to sequence as token, or as global context |

#### Side / context features

```python
# Per-item: item ID + category + price bucket + time-since
item_emb = item_id_emb + cat_emb + price_emb + time_emb
```

> Modern models (TiSASRec, Transformers4Rec) **incorporate side info per token**. Often beats pure ID-based.

#### Inference

```
Given user's recent N actions: [i_{t-N+1}, ..., i_t]
1. Forward pass through model
2. Score over all items: logits = h_t @ item_embeddings.T
3. Apply business rules (already-seen filter, diversity)
4. Top-K
```

For huge catalogs, combine with **two-tower retrieval** (see two-tower memo) → candidate generation, then rank with sequence model.

#### Two-stage architecture (production-typical)

```
[Sequence model]   ← user sequence
        ↓ generate query embedding
[ANN over item embeddings] → top-1000 candidates
        ↓
[Cross-attention ranker]  → top-100 ranked
        ↓
[Business logic / diversity]
```

#### Negative sampling

| Strategy | Detail |
|---|---|
| **Random** | Sample uniformly from catalog |
| **In-batch** | Other users' positives in same batch |
| **Popularity-weighted** | Sample popular items more (better contrast) |
| **Hard negatives** | Items model currently ranks high but aren't actually next |
| **Mixed** | Random + hard for stability |

> **Hard negatives** improve recall but require care — too hard (actually positives) = mislabeled.

#### Common patterns

| Pattern | Approach |
|---|---|
| **Cold start (new user)** | Onboarding picks; popularity start |
| **Cold start (new item)** | Item embedding from content features (text / image) |
| **Long-term + short-term** | Hierarchical models; merge user-level + session-level |
| **Multi-step prediction** | Predict next K items; teacher forcing |
| **Diversity** | DPP, MMR after ranking |
| **Multi-task** | Predict click + watch-time + add-to-cart |

#### Evaluation

| Metric | Use |
|---|---|
| **Hit@K** | Did the next item appear in top-K? |
| **NDCG@K** | Position-discounted hit |
| **MRR** | Reciprocal rank of next item |
| **Recall@K** | Same as Hit@K |
| **Coverage** | Fraction of catalog ever recommended |
| **Novelty** | Penalize popular-only recs |
| **Diversity** | Pairwise dissimilarity in top-K |
| **Serendipity** | Unexpected + relevant |

> Evaluate on **held-out future**: leave-one-out (most-recent action held out), or temporal split.

#### Sequence vs CF vs two-tower

| Method | Strength |
|---|---|
| **CF / matrix factorization** | Static, no order; baseline |
| **Two-tower (ID-based)** | Fast retrieval at scale |
| **Two-tower (with content)** | Cold-start friendly |
| **Sequence (SASRec, BERT4Rec)** | Captures order, recency, transitions |
| **Hybrid** | Sequence for user representation + two-tower for retrieval |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Training on shuffled data | Sequences must be order-preserved |
| No padding masking | Padding tokens get attention; mask them |
| Causal mask wrong direction (BERT vs GPT) | SASRec: causal; BERT4Rec: full attention |
| Long sequences without truncation | OOM; truncate to last N |
| Item dictionary changes between train and serve | Pin vocabulary; handle OOV |
| Time-leak: training on future actions | Use only past actions |
| Optimize HR@10 then deploy serving NDCG@1 | Match offline metric to deployment use |
| Random train/test split | Use temporal split |
| Same item in candidate set as in input sequence | Filter already-seen |

#### Production considerations

| Concern | Detail |
|---|---|
| **Latency** | Self-attention is O(n²); cap sequence length |
| **Update frequency** | Item embeddings refresh per period; user state updates per request |
| **Batching** | Pad to same length per batch; mask padding |
| **Embedding sharing** | Reuse for retrieval AND ranking |
| **Cold start** | Sequence model degrades on short sequences; fallback to popularity / content |

#### Frameworks

| Framework | Strength |
|---|---|
| **Transformers4Rec (NVIDIA)** | Production-ready PyTorch |
| **RecBole** | Many models in one library |
| **SASRec / BERT4Rec official repos** | Reference implementations |
| **PyTorch Geometric** | For graph-based variants |
| **Hugging Face** | Adapt language model architectures |
| **TFRS (TensorFlow Recommenders)** | TF-native |

#### Real-world examples

| Company | Use |
|---|---|
| **YouTube** | RNN over watch history |
| **TikTok** | Transformer over recent watches |
| **Spotify** | Sequence + collaborative for daily mixes |
| **Netflix** | Multi-task sequence + classical CF |
| **Amazon** | Personalized search ranking |
| **Pinterest** | Pin sequences with multimodal |

#### Decision tree

```
Domain has clear sequence?
├─ Yes
│   ├─ Short sequences (sessions)        → GRU4Rec or short SASRec
│   ├─ Long history (users over months) → Long-context SASRec / BERT4Rec
│   ├─ Need cold-item handling           → Add content features per item
│   ├─ Real-time updates                  → Transformer + KV cache
│   └─ Multi-objective (click + dwell)   → Multi-task sequence model
└─ No
    └─ Classical CF / two-tower
```

#### Code: training SASRec end-to-end (sketch)

```python
def train_step(model, batch, optim):
    seq = batch["seq"]                  # [B, T]
    pos = batch["positive_next"]        # [B, T]
    neg = batch["negative_next"]        # [B, T] — sampled
    logits = model(seq)                  # [B, T, embed_dim]

    pos_emb = model.item_embed(pos)
    neg_emb = model.item_embed(neg)

    pos_score = (logits * pos_emb).sum(-1)
    neg_score = (logits * neg_emb).sum(-1)

    loss = -F.logsigmoid(pos_score - neg_score).mean()
    loss.backward(); optim.step(); optim.zero_grad()
    return loss.item()
```

**Rule of thumb:** **sequence matters → use a sequence model**. **SASRec** is the strong autoregressive default; **BERT4Rec** for highest offline accuracy. Pair with **two-tower retrieval** for huge catalogs (sequence model becomes the user-side encoder). Cold-start needs **content features per item**. Always **temporal split** for evaluation; **filter already-seen** items at inference.
