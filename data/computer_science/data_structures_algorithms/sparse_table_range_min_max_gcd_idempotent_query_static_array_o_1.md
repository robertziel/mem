### Sparse Table (range min / max / gcd, idempotent query, static array, O(1))

**When:** many range queries on a **static** array where the operation is **idempotent** (`f(x, x) = x`) — min, max, gcd, AND, OR, lcm. O(N log N) preprocess, **O(1) per query**.

**Schema:**

| Concept | Detail |
|---|---|
| `st[k][i]` | Result of `f` over the range `[i, i + 2ᵏ − 1]` (length `2ᵏ`) |
| `K = ⌊log₂ N⌋` | Largest power of 2 ≤ N |
| Query `[l, r]` | Take two overlapping ranges of power-2 length covering `[l, r]`; combine — works because `f` is idempotent |

#### Why idempotent?

For sum (not idempotent), two overlapping ranges double-count the overlap → incorrect. For min / max / gcd / AND / OR, **overlap is fine** — `min(a, a) = a`. That's why sparse table is restricted to idempotent ops.

> For range sum, use prefix sum. For mutable arrays, use Fenwick / segment tree.

#### Implementation (range min)

```python
import math

class SparseTableMin:
    def __init__(self, arr):
        n = len(arr)
        K = max(1, int(math.log2(n)) + 1)
        self.log = [0] * (n + 1)                 # floor-log table (saves recomputation)
        for i in range(2, n + 1):
            self.log[i] = self.log[i // 2] + 1
        self.st = [arr[:]]
        for k in range(1, K):
            prev = self.st[-1]; size = 1 << k
            row = [min(prev[i], prev[i + (size >> 1)])
                   for i in range(n - size + 1)]
            self.st.append(row)

    def query(self, l, r):                       # inclusive
        k = self.log[r - l + 1]
        return min(self.st[k][l], self.st[k][r - (1 << k) + 1])
```

**For other ops:** swap `min` for `max`, `math.gcd`, `&`, `|`, etc. The logic is identical.

#### Operations cost

| Op | Time | Space |
|---|---|---|
| Build | O(N log N) | O(N log N) |
| Query | **O(1)** (idempotent) | — |
| Query (non-idempotent like sum) | O(log N) | — |
| Update | **Not supported** — rebuild O(N log N) |

#### Sparse table vs segment tree vs Fenwick

| Property | Sparse table | Segment tree | Fenwick (BIT) |
|---|---|---|---|
| Static array | ✓ | ✓ | ✓ |
| Mutable | ✗ (rebuild) | ✓ | ✓ |
| Idempotent ops (min, max, gcd, AND, OR) | **O(1) query** | O(log N) | ✗ |
| Sum | O(log N) (variant) | O(log N) | **O(log N)** |
| Range update + range query | ✗ | **✓ with lazy** | Limited (diff trick) |
| Implementation | Easiest | Hardest | Easy for sum |
| Constant factor | **Lowest** | Highest | Low |

#### Patterns map

| Problem | Use |
|---|---|
| Range min / max query, no updates | **Sparse table** |
| Static range gcd | Sparse table with `math.gcd` |
| Online RMQ for LCA (Euler tour + RMQ) | Sparse table on depth array |
| Range AND / OR | Sparse table with `&` / `\|` |
| K-th smallest in sub-range | Wavelet tree (sparse table doesn't help) |
| 2D range min on static matrix | 2D sparse table — O(N·M·log·log) prep, O(1) query |

#### 2D sparse table (sketch)

```
st[i][j][k1][k2] = min over rows [i, i+2^k1−1] and cols [j, j+2^k2−1]
Build: O(N·M·log N·log M)
Query: 4 corners, O(1)
```

#### Pitfalls

| Mistake | Fix |
|---|---|
| Using sparse table for sum | Overlap double-counts; use prefix sum or Fenwick |
| Updating array after build | Rebuild — sparse table is static |
| Off-by-one with inclusive `r` | `[l, r]` length = `r - l + 1`; query: `log[r - l + 1]` |
| Computing `log` per query (`math.log2`) | Precompute the log table once |
| Using on big-int arrays where each min costs more than O(1) | Time per query becomes that cost — still much better than O(N log N) per query |

#### When NOT to use

| Situation | Use instead |
|---|---|
| Array changes between queries | Segment tree |
| Range sum | Prefix sum (immutable) or Fenwick (mutable) |
| Range update + query | Segment tree with lazy |
| Operation is not idempotent (multiplication, sum) | Segment tree |
| Memory tight (sparse table is O(N log N)) | Segment tree O(N) |

**Complexity summary:**

| Op | Cost |
|---|---|
| Preprocess | O(N log N) |
| Query (idempotent) | **O(1)** |
| Memory | O(N log N) |
| Update | Not supported |

**Rule of thumb:** sparse table is the **simplest, fastest** structure for **static range min / max / gcd** — O(1) per query is the win. Use it inside Euler-tour LCA for the O(1)-query LCA variant. If the array changes, switch to segment tree. If the op isn't idempotent (sum, multiply), use prefix sum or Fenwick.
