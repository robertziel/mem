### MinHash + LSH (locality-sensitive hashing, Jaccard similarity, approximate nearest neighbor)

**When:** find similar items at scale — near-duplicate document detection, plagiarism detection, recommendation systems, clustering web pages, deduplication of crawler data, similarity search over billions of items. Trades exact similarity for **sublinear retrieval**.

**Schema:**

| Concept | Detail |
|---|---|
| **MinHash signature** | For each of `K` independent hash functions `hᵢ`, compute `min over x in S of hᵢ(x)`; gives a `K`-vector signature |
| **Jaccard similarity** | `|A ∩ B| / |A ∪ B|` |
| **MinHash unbiased estimator** | `Pr[h(A) = h(B)] = J(A, B)` (per hash); average over `K` hashes → estimate |
| **LSH (banding)** | Partition signature into `b` bands of `r` rows each; bucket by per-band hash; collision in any band → candidate pair |
| **(s, threshold)** | Tune `(b, r)` so that `1 − (1 − sʳ)ᵇ` jumps from low to high near `s = (1/b)^(1/r)` |

> **MinHash gives unbiased Jaccard estimate.** **LSH amplifies** that into a sublinear retrieval — pairs with similar signatures collide in at least one band with high probability.

#### MinHash signature

```python
import random

class MinHasher:
    def __init__(self, k=128, seed=0):
        rng = random.Random(seed)
        self.k = k
        self.a = [rng.randint(1, (1 << 32) - 1) | 1 for _ in range(k)]
        self.b = [rng.randint(0, (1 << 32) - 1) for _ in range(k)]
        self.MOD = (1 << 31) - 1                      # Mersenne prime

    def signature(self, items):
        sig = [float('inf')] * self.k
        for x in items:
            h = hash(x) & 0xFFFFFFFF
            for i in range(self.k):
                hi = (self.a[i] * h + self.b[i]) % self.MOD
                if hi < sig[i]: sig[i] = hi
        return sig

    @staticmethod
    def estimate_jaccard(sig_a, sig_b):
        eq = sum(1 for x, y in zip(sig_a, sig_b) if x == y)
        return eq / len(sig_a)
```

> **Standard error** ≈ `1 / √K`. K = 128 → ~9% RMSE; K = 256 → ~6%.

#### LSH (banding for approximate near-neighbor search)

```python
from collections import defaultdict

class LSH:
    def __init__(self, b, r):                         # b bands × r rows = signature length
        self.b, self.r = b, r
        self.buckets = [defaultdict(list) for _ in range(b)]

    def index(self, doc_id, sig):
        for band in range(self.b):
            band_sig = tuple(sig[band * self.r:(band + 1) * self.r])
            self.buckets[band][hash(band_sig)].append(doc_id)

    def candidates(self, sig):
        cands = set()
        for band in range(self.b):
            band_sig = tuple(sig[band * self.r:(band + 1) * self.r])
            cands.update(self.buckets[band][hash(band_sig)])
        return cands
```

#### S-curve (band tuning)

| `(b, r)` | Signature length | Threshold ≈ `(1/b)^(1/r)` | Use |
|---|---|---|---|
| (20, 5) | 100 | ≈ 0.55 | Moderate similarity (text near-dup) |
| (50, 4) | 200 | ≈ 0.40 | Lower threshold; more candidates |
| (10, 10) | 100 | ≈ 0.79 | High threshold; only very similar pairs |
| (25, 8) | 200 | ≈ 0.69 | Sweet spot for many web-scale dedup |

> Plot `f(s) = 1 − (1 − sʳ)ᵇ` — it's an S-curve. Tune `(b, r)` to put the steep transition at your similarity threshold.

#### LSH families for other distances

| Distance | LSH family |
|---|---|
| **Jaccard** (set similarity) | **MinHash** |
| **Cosine** (dot product) | **SimHash** / random hyperplane |
| **Euclidean (L2)** | Random projection: `h(v) = ⌊(a · v + b) / w⌋` |
| **L1 / Manhattan** | Random projection on Cauchy-distributed vectors |
| **Hamming** | Choose random bit position |

#### SimHash for cosine similarity

```python
def simhash(features, weights, k=64):
    vec = [0] * k
    for f, w in zip(features, weights):
        h = hash(f)
        for i in range(k):
            vec[i] += w if (h >> i) & 1 else -w
    return sum((1 if v > 0 else 0) << i for i, v in enumerate(vec))

# Hamming distance between two SimHashes ≈ angular distance
def hamming(a, b): return bin(a ^ b).count("1")
```

> Hamming on SimHashes correlates with cosine similarity. Used by **Google for near-duplicate detection** in 2007.

#### Use cases

| Application | Reason |
|---|---|
| Web crawl deduplication | MinHash + LSH on shingles |
| Plagiarism detection | Word k-grams + MinHash |
| Image deduplication | Perceptual hash + LSH |
| Recommendation (item-item similarity) | MinHash on user-set per item |
| News article clustering | Sentence shingles + LSH |
| Genome similarity (k-mer Jaccard) | MASH (uses MinHash) |
| Spam clustering | URL / phrase signatures |
| Social-network clustering | Friend-set Jaccard |
| Approximate-nearest-neighbor for embeddings | SimHash / LSH on dense vectors |

#### Shingling (text → set)

| Method | Detail |
|---|---|
| Word k-shingles | Slide window of `k` words; set of phrases |
| Char k-shingles | Same with characters; better for short text |
| Token-skip-grams | Skip-grams for paraphrase invariance |

For news articles: **k = 5 word shingles** is a strong default.

#### MinHash / LSH vs alternatives

| Need | Tool |
|---|---|
| Jaccard similarity at scale | **MinHash + LSH** |
| Cosine similarity at scale | **SimHash + LSH** / random projection |
| Exact KNN, low dimension | K-D tree |
| Exact KNN, high dimension | Brute force is best |
| Approximate KNN, embeddings | HNSW, Annoy, FAISS, IVF |
| Membership only | Bloom filter |
| Cardinality only | HyperLogLog |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Few hashes (`K = 32`) | Standard error ~18% — not enough for tight thresholds |
| Picking `(b, r)` ad hoc | Plot the S-curve; align inflection with your threshold |
| Using `set(x for x in items)` without normalization | Lowercase, strip punctuation, etc. |
| One global hash function | Use independent hashes (Mersenne LCG family is fine) |
| Comparing all candidate pairs naively | Verify with exact Jaccard only on LSH candidates |
| Forgetting that LSH is **probabilistic** | False negatives possible; tune `(b, r)` for recall vs precision |
| Using MinHash for cosine | Wrong family — use SimHash / random projection |
| Memory blowup from huge buckets | Salt with random seed per band; use second-level filter |

#### Complexity

| Op | Cost |
|---|---|
| MinHash signature | O(K · |S|) |
| LSH index | O(b) per insert |
| LSH query (return candidates) | O(b) hash lookups + |candidates| |
| Memory | O(K · N) for signatures + O(b · N) for buckets |
| Verification (exact Jaccard) | O(|A| + |B|) per candidate |

**Rule of thumb:** **MinHash estimates Jaccard via signature collisions**, **LSH amplifies similar pairs into sublinear retrieval**. Pick **K = 128 to 256** hashes; tune **`(b, r)`** so the S-curve's inflection sits at your similarity threshold. For **cosine** (embeddings), use **SimHash** instead. Always **verify** LSH candidates with exact distance — LSH gives you the candidate set, not the answer.
