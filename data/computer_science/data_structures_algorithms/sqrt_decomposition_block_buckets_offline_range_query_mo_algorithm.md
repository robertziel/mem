### Sqrt Decomposition (block buckets, offline range query, Mo's algorithm)

**When:** range queries (sum / min / count / mode / distinct) on a mutable array, when segment tree feels heavy or when you need offline batch queries with Mo's algorithm.

**Schema:**

| Concept | Detail |
|---|---|
| Block size | `B = ⌈√n⌉` |
| #Blocks | `⌈n / B⌉` |
| Per block | Aggregate (sum / min / etc.) over the block's elements |
| Query `[l, r]` | Full blocks fully inside `[l, r]` (read aggregates) + partial blocks at edges (scan elements) |
| Update | Update the element + the block aggregate |
| Cost per op | **O(√n)** |

#### Range sum + point update

```python
import math

class SqrtSum:
    def __init__(self, arr):
        self.n = len(arr)
        self.B = max(1, int(math.isqrt(self.n)))
        self.arr = list(arr)
        self.block_sum = [0] * ((self.n + self.B - 1) // self.B)
        for i, x in enumerate(arr):
            self.block_sum[i // self.B] += x

    def update(self, i, x):
        self.block_sum[i // self.B] += x - self.arr[i]
        self.arr[i] = x

    def query(self, l, r):                       # inclusive
        s = 0
        bl, br = l // self.B, r // self.B
        if bl == br:
            for i in range(l, r + 1): s += self.arr[i]
            return s
        for i in range(l, (bl + 1) * self.B):    s += self.arr[i]
        for b in range(bl + 1, br):              s += self.block_sum[b]
        for i in range(br * self.B, r + 1):      s += self.arr[i]
        return s
```

#### Range update + point query (lazy add per block)

| Field | Use |
|---|---|
| `arr[i]` | Original element |
| `lazy[b]` | Add applied to all of block `b` (deferred) |
| Point query `i` | `arr[i] + lazy[i // B]` |
| Range update `[l, r] += v` | Edge blocks: update individual `arr[i]`. Middle blocks: bump `lazy[b]` |

#### Mo's algorithm (offline range queries)

**When:** Q queries `[lᵢ, rᵢ]` known in advance; per-query "answer" you can update by adding/removing a single element from a window.

**Idea:** sort queries by `(l // B, r)` so the window slides minimally between queries. Each pointer moves O(n √Q) total.

**Complexity:** O((n + Q) · √n · cost_of_add_remove).

**Mo template:**

```python
def mo(arr, queries):                            # queries: list of (l, r, idx)
    B = max(1, int(len(arr) ** 0.5))
    queries.sort(key=lambda q: (q[0] // B, q[1] if (q[0] // B) % 2 == 0 else -q[1]))
    res = [0] * len(queries)
    l = 0; r = -1
    cur = 0
    cnt = {}                                     # whatever state the answer depends on

    def add(x):
        nonlocal cur
        cnt[x] = cnt.get(x, 0) + 1
        if cnt[x] == 1: cur += 1                 # example: # distinct values

    def remove(x):
        nonlocal cur
        cnt[x] -= 1
        if cnt[x] == 0: cur -= 1; del cnt[x]

    for ql, qr, idx in queries:
        while r < qr: r += 1; add(arr[r])
        while r > qr: remove(arr[r]); r -= 1
        while l < ql: remove(arr[l]); l += 1
        while l > ql: l -= 1; add(arr[l])
        res[idx] = cur
    return res
```

> The **Hilbert order** sort key is a popular optimization, but the simple `(l // B, ±r)` sort with parity-flipped tie-breaking is enough.

#### Sqrt vs segment tree vs BIT

| Need | Sqrt decomp | Segment tree | Fenwick (BIT) |
|---|---|---|---|
| Range sum, point update | √n | log n | **log n** |
| Range min/max, point update | √n | **log n** | ✗ (not invertible) |
| Range update, range query | √n with lazy | **log n** with lazy | log n with diff trick |
| Mode / distinct in range | **Mo's: √n** offline | Hard | ✗ |
| Implementation simplicity | **Easier** | Harder | Easiest for sum |
| K-th order statistic in range | √n with sorted blocks | Wavelet tree / merge sort tree | ✗ |

> Sqrt decomp wins when the operation **doesn't have a clean associative merge** (mode, distinct count, K-th element by value — segment tree can't easily handle these).

#### Patterns map

| Problem | Use |
|---|---|
| Range sum, point update | Sqrt sum (or Fenwick) |
| Range min/max, point update | Sqrt or segment tree |
| Range mode / distinct count | **Mo's algorithm** |
| Range XOR / k-th element | Sqrt with sorted blocks |
| Number of inversions in range | Mo's + Fenwick (per element) |
| Snake-walk / block-based BFS | √-block layered BFS |
| K-th smallest in subarray | Mo's + Fenwick on values |
| Persistent range queries | Persistent segment tree (sqrt is harder to make persistent) |

#### Block size tuning

| n | B (block size) |
|---|---|
| 10⁴ | 100 |
| 10⁵ | 316 |
| 10⁶ | 1000 |

For Mo: `B = n / √Q` minimizes total moves; if `Q ≈ n`, use `B = √n`.

#### Pitfalls

| Mistake | Fix |
|---|---|
| Forgetting to update `block_sum` on point update | Always update both `arr[i]` and `block_sum[i // B]` |
| Inconsistent inclusive vs exclusive `[l, r]` | Pick a convention and stick with it |
| Mo's: forgetting parity sort | Worse constant; harder to debug perf |
| Mo's: add then remove (or vice versa) when window starts negative-radius | Initialize `r = -1`, `l = 0` so first query expands properly |
| `B = sqrt(n)` as `int(...)` rounding | Use `math.isqrt`; ensure `B ≥ 1` |
| Updating `cur` via stale `cnt` | Add/remove must update `cnt` **then** check if it crossed the threshold |

**Complexity summary:**

| Op | Time |
|---|---|
| Build | O(n) |
| Point update | O(1) |
| Range query | O(√n) |
| Range update with lazy block | O(√n) |
| Mo's algorithm (Q queries) | O((n + Q) · √n) |

**Rule of thumb:** **sqrt decomposition is the duct tape of range queries** — easier to code than a segment tree, and supports operations that segment trees can't merge cleanly (mode, distinct, K-th). For **offline batch queries**, **Mo's algorithm** is the canonical √-decomp tool. Default to segment tree / BIT for clean associative ops; reach for sqrt when the operation is awkward.
