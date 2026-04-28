### HyperLogLog (cardinality estimation, distinct count, streaming, LogLog family)

**When:** estimate the **number of distinct elements** in a multiset / stream using O(1) memory regardless of cardinality. The standard tool for "approximate count distinct" — Redis `PFCOUNT`, Google BigQuery, Presto, distributed analytics, web traffic uniques.

**Schema:**

| Concept | Detail |
|---|---|
| Hash | Each element → uniformly random ~64-bit hash |
| Bucket | Use first `p` bits of hash to choose one of `2ᵖ` buckets |
| Register `M[j]` | Stores the **maximum number of leading zeros + 1** of all hashes routed to bucket `j` |
| Estimate | `αₘ · m² / Σ 2^(-M[j])` (harmonic-mean-style) |
| Memory | `m = 2ᵖ` registers, each ~5–6 bits → ~12 KB for `p = 14` |
| Standard error | ≈ **1.04 / √m** |

> **Intuition:** if you've seen `n` distinct uniformly hashed items, the maximum number of leading zeros in any of their hashes is ≈ `log₂ n`. Distribute across `m` buckets → cancel variance via harmonic mean.

#### Implementation (HLL with bias correction)

```python
import math, hashlib, struct

class HyperLogLog:
    def __init__(self, p=14):                         # m = 2^p, default p=14 → ~12 KB
        self.p = p
        self.m = 1 << p
        self.M = bytearray(self.m)                    # registers (≤ 64 fits in 6 bits)
        if p == 4:    self.alpha = 0.673
        elif p == 5:  self.alpha = 0.697
        elif p == 6:  self.alpha = 0.709
        else:         self.alpha = 0.7213 / (1 + 1.079 / self.m)

    def _hash(self, x):
        h = hashlib.sha1(repr(x).encode()).digest()[:8]
        return struct.unpack(">Q", h)[0]              # 64-bit unsigned

    def add(self, x):
        h = self._hash(x)
        j = h >> (64 - self.p)                        # top p bits = bucket
        w = ((h << self.p) & ((1 << 64) - 1)) | (1 << (self.p - 1))
        # leading-zeros count + 1 in the remaining 64−p bits
        if w == 0: rho = 64 - self.p + 1
        else:
            rho = 1
            while not (w & (1 << 63)):
                rho += 1; w <<= 1
        if rho > self.M[j]: self.M[j] = rho

    def count(self):
        Z = sum(2.0 ** (-r) for r in self.M)
        E = self.alpha * self.m * self.m / Z

        # Small-range correction (linear counting)
        if E <= 2.5 * self.m:
            zeros = self.M.count(0)
            if zeros != 0:
                E = self.m * math.log(self.m / zeros)
        # Large-range correction (rare, only relevant for ~32-bit hashes)
        return E

    def merge(self, other):
        assert self.p == other.p
        for i in range(self.m):
            if other.M[i] > self.M[i]: self.M[i] = other.M[i]
```

#### Parameter trade-offs

| `p` | `m = 2ᵖ` | Memory (~6 bit / register) | Standard error |
|---|---|---|---|
| 4 | 16 | 12 B | 26% |
| 8 | 256 | 192 B | 6.5% |
| 12 | 4096 | 3 KB | 1.6% |
| 14 | 16384 | 12 KB | **0.81%** (Redis default) |
| 16 | 65536 | 48 KB | 0.41% |

> **Linear independence of error from cardinality** — same ~1% error whether the set has 1000 or 1 trillion distinct items.

#### HyperLogLog++ (Google's improvement)

| Improvement | Effect |
|---|---|
| 64-bit hashes | Removes large-range correction |
| Sparse representation | When `n ≪ m`, store as a list of (bucket, value) pairs — saves memory in the small regime |
| Bias correction tables | Empirically-derived correction for medium cardinalities |

> Most modern implementations (Redis, BigQuery) use HLL++.

#### Patterns map

| Application | Use |
|---|---|
| Unique visitors per day | Add user ID; query `count()` |
| Unique queries / search terms | Add query string |
| Unique IPs in DDoS detection | Add IP address |
| Approximate `SELECT COUNT(DISTINCT col)` | Aggregate sketch per partition |
| Streaming dashboards | Update HLL per minute, merge for hour |
| Distributed cardinality | Each node maintains HLL; merge by max-of-registers |
| Audit / fraud detection | Distinct accounts touching a resource |
| Reach estimation in advertising | Distinct cookies |

#### Set operations

| Operation | Result |
|---|---|
| Union (A ∪ B) | Merge: take max per register; `count()` is exactly `|A ∪ B|` |
| Intersection (A ∩ B) | **No exact estimator**; use inclusion-exclusion: `|A| + |B| − |A ∪ B|` |
| Difference | Same — inclusion-exclusion only |
| Subset check | Via approximate Jaccard from MinHash |

> **Intersection via HLL is unreliable** when sets are similar — relative error explodes. For Jaccard / intersection, use **MinHash**.

#### Use cases (real systems)

| System | HLL usage |
|---|---|
| **Redis** | `PFADD`, `PFCOUNT`, `PFMERGE` (HLL++) |
| **BigQuery** | `APPROX_COUNT_DISTINCT(...)` |
| **Presto / Trino** | `approx_distinct(col)` |
| **Snowflake** | `APPROX_COUNT_DISTINCT` |
| **ClickHouse** | `uniqHLL12` |
| **Druid** | `cardinality` aggregator (HLL-based) |
| **Algolia / search analytics** | Distinct query / user counts |

#### Count-Min vs HLL vs Bloom — pick by need

| Need | Tool |
|---|---|
| "Have I seen X?" | **Bloom filter** |
| "How many distinct items?" | **HyperLogLog** |
| "How many times did X appear?" | **Count-Min sketch** |
| "What are the top-K items?" | Count-Min + heap, or Misra-Gries |
| "Set similarity" | **MinHash + LSH** |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Using HLL for tiny cardinality (n < m) | Use linear counting (sparse representation) — implementations handle automatically |
| Estimating intersection from HLLs | Use inclusion-exclusion; for accurate similarity, use MinHash |
| Different `p` between sketches you want to merge | Must match — pick `p` upfront |
| Bad / non-uniform hash | Use SHA-1 / MurmurHash3 / xxHash |
| Underestimating storage savings | HLL is 10–100× smaller than a hash set for typical cardinalities |
| Treating `count()` as exact | ~1% error at p=14; design tolerances accordingly |
| Naive 32-bit hash | Insufficient for billions; use 64-bit |

#### Complexity

| Op | Cost |
|---|---|
| Add | O(1) — one hash + one register update |
| Count | O(m) — one pass over registers |
| Merge | O(m) — max per register |
| Memory | O(m) registers (~ 12 KB for p=14) |
| Standard error | 1.04 / √m |

**Rule of thumb:** **HyperLogLog = fixed-memory distinct count, ~1% error**. Bucket by **top `p` hash bits**, store **max leading-zero count** per bucket, estimate via **harmonic mean of `2^M[j]`**. Memory is **independent of cardinality**. Mergeable via **max per register**. Default `p = 14` → ~12 KB → ~0.8% error. **Don't use HLL for intersection** — that's a job for **MinHash**.
