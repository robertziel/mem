### Segment Tree & Fenwick Tree (BIT, range query, lazy propagation)

**When:** mutable array with **range queries + point/range updates**. Sweet spot:

| Need | Use |
|---|---|
| Point update + prefix/range sum | **Fenwick tree (BIT)** — simpler, ~half the memory |
| Range update + point query | Difference array + Fenwick |
| Range update + range query (sum / min / max / gcd / …) | **Segment tree with lazy propagation** |
| Static array, range queries only | Prefix sum / sparse table (O(1) query) |

**Fenwick tree (BIT) — schema:**

| Concept | Detail |
|---|---|
| Storage | 1-indexed array of size `n+1` |
| Each `bit[i]` covers | A range of size `i & (-i)` ending at `i` |
| `i & (-i)` | Isolates lowest set bit (the "responsibility size") |

**Fenwick — point update + prefix query:**

```python
class BIT:
    def __init__(self, n): self.n = n; self.bit = [0] * (n + 1)
    def update(self, i, delta):           # 1-indexed
        while i <= self.n:
            self.bit[i] += delta
            i += i & (-i)
    def query(self, i):                   # prefix sum [1..i]
        s = 0
        while i > 0:
            s += self.bit[i]
            i -= i & (-i)
        return s
    def range_sum(self, l, r):            # inclusive
        return self.query(r) - self.query(l - 1)
```

| Op | Cost |
|---|---|
| Build (loop of updates) | O(n log n) |
| Build (linear) | O(n) — propagate to parent index `i + (i & -i)` |
| Point update | O(log n) |
| Prefix query | O(log n) |

**Segment tree — schema:**

| Concept | Detail |
|---|---|
| Storage | Array of size `4n` (safe upper bound) |
| Node indexing | Node 1 = root; left = `2k`, right = `2k+1` |
| Each node covers | A range; combine = sum / min / max / gcd / xor |
| Lazy array | Same shape; defers range updates to children when touched |

**Segment tree — sum with point update:**

```python
class SegTree:
    def __init__(self, arr):
        self.n = len(arr); self.t = [0] * (4 * self.n)
        self._build(1, 0, self.n - 1, arr)
    def _build(self, k, l, r, arr):
        if l == r: self.t[k] = arr[l]; return
        m = (l + r) // 2
        self._build(2*k, l, m, arr); self._build(2*k+1, m+1, r, arr)
        self.t[k] = self.t[2*k] + self.t[2*k+1]
    def update(self, i, x): self._update(1, 0, self.n - 1, i, x)
    def _update(self, k, l, r, i, x):
        if l == r: self.t[k] = x; return
        m = (l + r) // 2
        if i <= m: self._update(2*k, l, m, i, x)
        else:      self._update(2*k+1, m+1, r, i, x)
        self.t[k] = self.t[2*k] + self.t[2*k+1]
    def query(self, ql, qr): return self._query(1, 0, self.n - 1, ql, qr)
    def _query(self, k, l, r, ql, qr):
        if qr < l or r < ql: return 0           # disjoint
        if ql <= l and r <= qr: return self.t[k] # fully covered
        m = (l + r) // 2
        return self._query(2*k, l, m, ql, qr) + self._query(2*k+1, m+1, r, ql, qr)
```

**Lazy propagation — range update + range query:**

```python
# Pseudocode for "add v to [ql..qr]" and "sum of [ql..qr]"
def push_down(k, l, r):
    if lazy[k]:
        m = (l + r) // 2
        for child, lo, hi in [(2*k, l, m), (2*k+1, m+1, r)]:
            t[child] += lazy[k] * (hi - lo + 1)
            lazy[child] += lazy[k]
        lazy[k] = 0

def range_update(k, l, r, ql, qr, v):
    if qr < l or r < ql: return
    if ql <= l and r <= qr:
        t[k] += v * (r - l + 1)
        lazy[k] += v
        return
    push_down(k, l, r)
    m = (l + r) // 2
    range_update(2*k, l, m, ql, qr, v)
    range_update(2*k+1, m+1, r, ql, qr, v)
    t[k] = t[2*k] + t[2*k+1]
```

**Choosing the structure:**

| Problem | Structure |
|---|---|
| Range sum, point update | **Fenwick** (simplest) |
| Range min / max / gcd, point update | **Segment tree** (Fenwick can't do non-invertible ops cleanly) |
| Range update + range sum | **Segment tree with lazy** |
| Range update + point query | **Difference array** (offline) or **Fenwick on diff** |
| Static array, range query only | **Sparse table** (O(1) idempotent queries) or prefix sum |
| 2D range sum, mutable | **2D Fenwick** |
| Frequent range queries on positions | **Order-statistics tree** (or offline + sort) |

**Operations cost:**

| Structure | Update | Query | Build |
|---|---|---|---|
| Prefix sum (immutable) | O(n) rebuild | O(1) | O(n) |
| Fenwick (BIT) | O(log n) | O(log n) | O(n) |
| Segment tree | O(log n) | O(log n) | O(n) |
| Segment tree + lazy | O(log n) range | O(log n) range | O(n) |
| Sparse table | — | O(1) idempotent | O(n log n) |

**Pitfalls:**

| Mistake | Fix |
|---|---|
| Fenwick on min/max | Doesn't work directly — segment tree instead |
| Forgetting 1-indexing in Fenwick | Use a sentinel; off-by-one is the #1 bug |
| Segment tree size | Use `4 * n` (safe), not `2 * n` |
| Forgetting `push_down` before recursing in lazy | Stale child sums |

**Rule of thumb:** **Fenwick is a smaller, faster segment tree** for sum-like (invertible) operations. **Segment tree** for everything else (min, max, gcd, range update, complex tags). For static arrays, **prefix sum** is simpler and faster than either.
