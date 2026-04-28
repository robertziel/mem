### Cold Start (new user, new item, content-based, hybrid, bandit, onboarding)

**When:** recommender system encounters **users or items with no interaction history**. Pure collaborative filtering can't help — there's nothing to collaborate on. Cold-start strategies bridge the gap until enough behavioral signal accumulates.

**Schema (the three cold-start scenarios):**

| Type | Problem | Mitigation |
|---|---|---|
| **New user (cold user)** | No interaction history; system doesn't know preferences | Onboarding survey, popularity, demographics, content-based |
| **New item (cold item)** | No interaction history; can't recommend something nobody's seen | Content-based, contextual bandits, similarity to existing |
| **System cold start** | Brand-new platform, no users + no items | Manual curation, importing external data |

> Cold-start is the **most-violated assumption** of pure CF systems. Production recommenders need an explicit cold-start path.

#### New-user strategies

| Strategy | Detail |
|---|---|
| **Popularity baseline** | Recommend top-K trending items |
| **Onboarding survey** | "Pick 5 favorites" — instant personalization |
| **Demographic-based** | Use age, location, language, signup source |
| **Implicit signals** | Referrer URL, device, time-of-day, session context |
| **Content-based** | Recommend items similar to first interactions |
| **Bandits with priors** | Thompson sampling with weak prior |
| **Lookalike** | Find similar known users; recommend what they liked |
| **Editorial / curated** | Hand-picked starter sets |

#### New-item strategies

| Strategy | Detail |
|---|---|
| **Content-based recommendation** | Use item attributes (text, category, image embedding) to find similar items |
| **Two-tower with content features** | Item tower learns embedding from features; ANN-search immediately |
| **Contextual bandit** | Allocate exploration traffic to learn quickly |
| **Editorial promotion** | Manual placement (homepage feature) to gather signal |
| **Cohort-based seeding** | Distribute new items to known similar users |
| **Random exposure** | ε-greedy slot for novelty |
| **Cold-start boost** | Score boost during first N impressions |

#### Hybrid recommendation (CF + content)

```python
score(u, i) = w_cf · cf_score(u, i) + w_content · content_score(u, i)
```

| Mechanism | Detail |
|---|---|
| **Switching** | Use content when CF data sparse, CF when rich |
| **Weighted** | Linear combination |
| **Feature-based** | Concatenate as inputs to ranking model |
| **Cascade** | Content first; CF re-ranks top results |
| **Meta-level** | One model's output is another's input |

> **Switching is simplest**: use CF if user has ≥ N interactions, else content; switch threshold tunable.

#### Content-based primer

Compute item similarity from features (not behavior):

| Feature | Embedding |
|---|---|
| Text (title, description) | TF-IDF, BERT, sentence-transformer |
| Category / tags | One-hot, embedding |
| Numerical (price, age) | Normalized |
| Image | CNN / CLIP embedding |
| Audio | Spectrogram + CNN |
| Combined | Concatenate / multi-modal model |

```python
# Cosine similarity between content embeddings
from sklearn.metrics.pairwise import cosine_similarity
sim = cosine_similarity(item_embeddings)

# For new user: aggregate liked-item embeddings
def cold_user_recs(liked_items, item_embeddings, top_k=10):
    user_centroid = item_embeddings[liked_items].mean(axis=0)
    scores = cosine_similarity([user_centroid], item_embeddings)[0]
    scores[liked_items] = -np.inf       # exclude already-liked
    return scores.argsort()[::-1][:top_k]
```

#### Onboarding survey design

| Pattern | Detail |
|---|---|
| **Pick categories** | "Which topics interest you?" |
| **Pick examples** | Show 20 popular items; ask user to like 5 |
| **Implicit / progressive** | Start with popularity, learn from first sessions |
| **Optional skip** | Don't gate; default to popularity |
| **Calibrate to diversity** | Avoid all-similar choices early |

> First 5–20 interactions are **disproportionately predictive**. Onboarding signal often more useful than the next 100 interactions.

#### Bandits for cold start

Multi-armed bandits **explore** new items to gather data while exploiting known good ones:

| Algorithm | Use |
|---|---|
| **ε-greedy** | Simple; explore ε fraction |
| **Thompson sampling** | Bayesian; natural for cold-start (Beta(1, 1) prior) |
| **UCB** | Optimistic in face of uncertainty |
| **Contextual bandit** | Use user / item features to predict reward |

```python
# Thompson sampling for new items
def select_item(items_alpha_beta):
    samples = [np.random.beta(a, b) for a, b in items_alpha_beta]
    return np.argmax(samples)
```

> **Cold items get a "fair shot"** because their posteriors are wide (high uncertainty) and TS samples can occasionally pick them.

#### Two-tower for cold start (modern approach)

Item tower learns from **content features**, so new items get embeddings instantly:

```python
class ItemTower(nn.Module):
    def __init__(self, ...):
        # Combines: item ID embedding + content features (text, image, category)
        # New item with no ID embedding falls back to content alone
        ...

# At inference:
new_item_embedding = item_tower(content_features)   # works without prior interactions
similarity = user_embedding @ new_item_embedding
```

> **Two-tower handles cold-start naturally** when item tower uses content features. Same architecture for warm and cold items.

#### Strategies by phase

| Phase | Strategy |
|---|---|
| **0 interactions** | Popularity / demographic / onboarding survey |
| **1–5 interactions** | Content-based + onboarding |
| **5–50** | Hybrid with high content weight |
| **> 50** | Pure CF or hybrid with low content weight |

#### Production architecture

```
[Request: user_id, context]
        ↓
[Check user history]
   ├─ Brand new          → Cold-start path
   │                          ├─ Popularity
   │                          ├─ Demographic-based
   │                          ├─ Onboarding picks
   │                          └─ Editorial featured
   ├─ Some history (sparse) → Hybrid (content-heavy)
   └─ Rich history          → CF / two-tower
```

#### Evaluation for cold-start

Standard CF evaluation **overstates** cold-start performance. Specific eval:

| Strategy | What |
|---|---|
| **Hold out cold users** | Test on users with ≤ N prior interactions |
| **Hold out new items** | Recommend items not in training set |
| **Bootstrap simulation** | Replay historical "first N days" of new users |
| **Onboarding A/B** | Different onboarding flows; measure 7-day retention |

> **Cold-start metrics often diverge from warm-user metrics.** Optimize each segment separately.

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Showing 0 recommendations to new users | Always have a popularity fallback |
| Treating new users like power users | Lower-weight CF; emphasize content + onboarding |
| Surveys that are too long | Risk drop-off; aim for ≤ 30 seconds |
| Recommending only popular items to all new users | Personalize from any signal (location, source) |
| Filter bubble starts on first session | Build in diversity / exploration |
| New items invisible because algorithm hasn't seen them | Cold-item boost / explicit exploration slot |
| Editorial picks ignored when CF is strong | Hybrid weights need to leave room |
| Treating "lapsed user" as warm | They may have changed; partial cold-start mode |
| Single demographic encoding | Combine multiple signals |

#### Lookalike modeling

Find similar known users to a cold user using sparse signals:

| Signal | Use |
|---|---|
| Acquisition source (ad campaign, referral) | Same campaign → similar tastes often |
| Geographic / language | Coarse personalization |
| Device | iOS vs Android — different behavior |
| Time of day at signup | Lifestyle proxy |
| Initial click / page visited | First content-based signal |

```python
# Find nearest known user by demographic vector
nearest = nn.kneighbors(cold_user_demo)
recs_for_cold = recommend(known_users[nearest])
```

#### Multi-armed cold-start

Different strategies for different cold-start segments:

```python
if n_interactions == 0:
    return popularity_recs(by_demographic=user.demographic)
elif n_interactions < 5:
    return hybrid_recs(content_weight=0.7, onboarding_picks=user.picks)
elif n_interactions < 50:
    return hybrid_recs(content_weight=0.3, cf_weight=0.7)
else:
    return cf_recs(user.id)
```

#### Bandits + LinUCB for cold-start

For new items, contextual bandit allocates exploration:

```python
# Pseudo: LinUCB
def select(user_context, available_items):
    scores = []
    for item in available_items:
        mu = item_theta @ user_context        # predicted reward
        sigma = sqrt(user_context.T @ inv(item_A) @ user_context)  # uncertainty
        scores.append(mu + α * sigma)         # UCB
    return available_items[argmax(scores)]
```

> Items with **little data have high uncertainty (σ)** → high UCB → get explored. Yahoo News (Li et al. 2010).

#### Long-tail considerations

| Pattern | Detail |
|---|---|
| **Most items get few interactions** | Long-tail catalog |
| **Pure CF favors popular** | Bias correction needed |
| **Diversity / coverage matters** | Beyond accuracy |
| **Discovery objective** | Surface relevant long-tail to interested users |

#### Hybrid scoring formula

```python
def hybrid_score(user, item):
    cf = cf_score(user, item)
    content = content_score(user, item)
    n_interactions = user.interaction_count

    # Sigmoidal weighting: more CF as user warms up
    cf_weight = 1 / (1 + np.exp(-(n_interactions - 30) / 10))
    content_weight = 1 - cf_weight

    return cf_weight * cf + content_weight * content
```

#### Decision tree

```
New user?
├─ Pre-signup (anon)        → Popular for region / context / referrer
├─ Just signed up            → Onboarding survey + popularity
├─ < 10 interactions        → Hybrid (heavy content)
├─ 10–100 interactions      → Hybrid (balanced)
└─ Deep history              → CF / two-tower

New item?
├─ Has rich content          → Content-based / two-tower with content features
├─ Sparse content            → Editorial promotion + bandit exploration
└─ Hot launch                → Manual featuring + cohort distribution
```

**Rule of thumb:** **always have a cold-start fallback** — never show empty recommendations. **Onboarding signal is disproportionately valuable** — invest in good first-session capture. Use **content features in two-tower** for natural cold-item handling. **Bandits explore** new items fairly. Switch from content-heavy to CF-heavy as user **interaction count grows**. Evaluate **cold and warm segments separately** — they need different metrics and trade-offs.
