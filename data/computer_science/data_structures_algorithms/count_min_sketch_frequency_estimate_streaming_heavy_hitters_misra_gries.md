### Count-Min Sketch (frequency estimate, streaming, heavy hitters, Misra-Gries)

**When:** estimate the frequency of items in a stream using sublinear memory — top-K elephants, network flow analysis, streaming analytics, "approximate histogram" with bounded error. Trades exact count for **fixed-size** memory regardless of universe size.

**Schema:**

| Concept | Detail |
|---|---|
| Width `w` | Number of cells per row (≈ `e / ε`) |
| Depth `d` | Number of independent hash functions / rows (≈ `ln(1/δ)`) |
| Update | For each row `i`, increment `C[i][hᵢ(x)]` |
| Query | Return `min over i of C[i][hᵢ(x)]` |
| Bounds | `count(x) ≤ estimate(x) ≤ count(x) + ε·N` with probability ≥ 1−δ |

> **Always overestimates, never underestimates.** Smaller items get inflated by collisions; minimum across rows discards the worst collisions.

#### Implementation

```python
import math, random

class CountMinSketch:
    def __init__(self, eps=0.01, delta=0.01):
        self.w = max(2, math.ceil(math.e / eps))      # ≈ 272 for eps=0.01
        self.d = max(1, math.ceil(math.log(1 / delta)))  # ≈ 5 for delta=0.01
        self.table = [[0] * self.w for _ in range(self.d)]
        self.seeds = [random.randint(0, 2**31 - 1) for _ in range(self.d)]

    def _hash(self, i, x):
        return hash((self.seeds[i], x)) % self.w

    def add(self, x, count=1):
        for i in range(self.d):
            self.table[i][self._hash(i, x)] += count

    def estimate(self, x):
        return min(self.table[i][self._hash(i, x)] for i in range(self.d))

    def merge(self, other):
        assert self.w == other.w and self.d == other.d
        for i in range(self.d):
            for j in range(self.w):
                self.table[i][j] += other.table[i][j]
```

#### Choosing parameters

| Target | Width `w` | Depth `d` | Memory (with 4-byte counters) |
|---|---|---|---|
| ε = 0.01, δ = 0.01 | 272 | 5 | 5 KB |
| ε = 0.001, δ = 0.001 | 2719 | 7 | 76 KB |
| ε = 0.0001, δ = 0.001 | 27183 | 7 | 760 KB |
| ε · N | Means: estimate is at most `ε · N` over the true count |

> Memory is **independent of the universe size** — the same sketch can summarize a billion-distinct-item stream as a thousand-distinct-item stream.

#### Heavy-hitters extraction

| Approach | How |
|---|---|
| Threshold sweep | Track items with `estimate(x) ≥ φ · N`; need to know candidate set |
| Count-Min + heap | Per-update, update sketch; if `estimate(x)` ≥ threshold, push to top-K heap |
| Misra-Gries | **Deterministic** alternative; finds elements with count > N/k |
| Count-Sketch | Variant with **median** instead of min — gives ±error, not just over- |

#### Misra-Gries (deterministic heavy hitters > N/k)

```python
def heavy_hitters(stream, k):
    counters = {}                                    # at most k - 1 entries
    for x in stream:
        if x in counters:
            counters[x] += 1
        elif len(counters) < k - 1:
            counters[x] = 1
        else:
            for key in list(counters):
                counters[key] -= 1
                if counters[key] == 0: del counters[key]
    return counters                                  # candidates; verify with second pass
```

> Returns at most `k - 1` candidates; **verify** with a second pass — true heavy hitters (count > N/k) are guaranteed to be in this set.

#### Variants

| Variant | What it adds |
|---|---|
| **Count-Min Sketch** | Standard — overestimates only |
| **Count-Sketch** (Charikar et al.) | Median + sign hash; unbiased estimate, ±error |
| **Conservative update CM** | Update only the cell with the current minimum count + delta — tighter bounds |
| **Sliding-window CMS** | Decay or windowed cells |
| **Distributed CMS** | Mergeable — sum cell-wise |

#### Use cases

| Application | What's counted |
|---|---|
| Network heavy flows | Source IP / port pair → packet count |
| DDoS detection | Source IP → request count |
| Cache admission policy (TinyLFU) | Key → recent-access count |
| NLP n-gram counts | n-gram → frequency |
| Streaming analytics (tweet hashtags) | Hashtag → mention count |
| Anomaly detection | Item → recent occurrence |
| Ad clickthrough estimation | Ad ID → impression count |
| Database query plan statistics | Predicate value → cardinality estimate |

#### Count-Min vs alternatives

| Need | Use |
|---|---|
| Approximate frequency, fixed memory | **Count-Min** / Count-Sketch |
| Exact top-K with bounded memory | Misra-Gries (k − 1 candidates) + verify |
| Distinct count | **HyperLogLog** |
| Membership only | **Bloom filter** |
| Quantiles | t-digest, GK summary |
| Most-recent k items | LRU / sliding-window |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Treating `estimate(x)` as exact | It's an upper bound — never trust as ground truth |
| Bad hash function (correlated rows) | Use independent seeds; standard hash with seed mixing |
| `ε` chosen too small for memory budget | Memory grows like `1/ε`, not log; pick realistically |
| Querying many distinct items expecting low collisions | Frequent items dominate cell budget — rare items overestimate more |
| Using for items with negative frequencies | Standard CMS doesn't handle deletions cleanly |
| Forgetting CMS is point query, not range | Range queries need CMS variants or different sketches |
| Reporting heavy hitters without verification pass | Misra-Gries / CMS produce candidates; verify before publishing |

#### Complexity

| Op | Cost |
|---|---|
| Add | O(d) hashes |
| Estimate | O(d) hashes |
| Merge | O(d · w) |
| Memory | O(d · w · sizeof(counter)) |
| Misra-Gries update | Amortized O(1) per item |

**Rule of thumb:** Count-Min Sketch = **fixed-memory frequency estimate with one-sided error**. Pick **`w = e / ε`** and **`d = ln(1/δ)`**; memory is `O(d · w)` independent of the stream's universe. **Always overestimates** — useful for "is this item heavy?" but not for exact counts. For **deterministic top-k > N/k**, use **Misra-Gries**. For distinct count, switch to **HyperLogLog**.
