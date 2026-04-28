### Persistent Segment Tree (versioned, immutable, path copy, K-th order statistic)

**When:** range queries on **multiple historical versions** of an array — "K-th smallest element in range [l, r]", "number of distinct values in [l, r]", "rollback-able" data structures, persistent maps, functional programming, time-travel queries.

**Schema:**

| Concept | Detail |
|---|---|
| Version | Each version of the array has its own root; older roots stay valid |
| Path copy | An update creates O(log n) **new** nodes along the affected path; siblings are shared |
| Memory | O(N + Q · log N) for Q updates |
| Time | Same as a regular segment tree: O(log N) per op |
| Functional | Old versions are **immutable** — no in-place mutation |

> Persistent = "preserve old versions cheaply" via **structural sharing**. Each update returns a new root; old roots still work.

#### Node + update template

```python
class Node:
    __slots__ = ("val", "left", "right")
    def __init__(self, val=0, left=None, right=None):
        self.val = val; self.left = left; self.right = right

def build(l, r, arr):
    if l == r: return Node(arr[l])
    m = (l + r) // 2
    L = build(l, m, arr); R = build(m + 1, r, arr)
    return Node(L.val + R.val, L, R)

def update(node, l, r, i, x):
    if l == r: return Node(x)
    m = (l + r) // 2
    if i <= m:
        return Node(0, update(node.left, l, m, i, x), node.right)         # share right
    else:
        return Node(0, node.left, update(node.right, m + 1, r, i, x))     # share left

def query(node, l, r, ql, qr):
    if qr < l or r < ql: return 0
    if ql <= l and r <= qr: return node.val
    m = (l + r) // 2
    return query(node.left, l, m, ql, qr) + query(node.right, m + 1, r, ql, qr)
```

> The `Node` constructor's pull-up (`val = L.val + R.val`) needs to be added to the update path — typically by maintaining `val` as the segment-tree aggregate.

#### K-th smallest in range — the canonical use

**Idea:** for each prefix index `i`, build a persistent segment tree over the value-domain (compressed) where `roots[i]` counts how many of `a[0..i-1]` fall in each value bucket. Query "K-th in `[l, r]`" = walk both `roots[r+1]` and `roots[l]` simultaneously, computing **count in `[l, r]`** as `roots[r+1].x − roots[l].x` and binary-searching the value domain.

```python
def kth_in_range(roots, l, r, k, lo, hi):
    """K-th smallest of a[l..r] (1-indexed k), persistent ST built per prefix."""
    L, R = roots[l], roots[r + 1]
    while lo < hi:
        m = (lo + hi) // 2
        left_cnt = R.left.val - L.left.val            # count in left half
        if k <= left_cnt:
            L, R = L.left, R.left; hi = m
        else:
            k -= left_cnt
            L, R = L.right, R.right; lo = m + 1
    return values[lo]                                 # decompressed value
```

**Setup:**

```python
sorted_unique = sorted(set(arr))
value_idx = {v: i for i, v in enumerate(sorted_unique)}
roots = [build(0, len(sorted_unique) - 1, [0] * len(sorted_unique))]
for x in arr:
    roots.append(update(roots[-1], 0, len(sorted_unique) - 1, value_idx[x], 1))
# now roots[i] = persistent ST over a[0..i-1]
```

**Query**: `kth_in_range(roots, l, r, k, 0, len(sorted_unique) - 1)`.

#### Use cases

| Problem | Persistent ST trick |
|---|---|
| K-th smallest in range | Per-prefix persistent ST on value domain |
| Number of distinct in range | Persistent ST keyed by "last occurrence index" |
| MEX (minimum excludant) of range | Walk persistent ST tracking smallest missing |
| Rollback to any past version | Just keep the old root |
| Functional / immutable map | Persistent BST or hash array-mapped trie (HAMT) |
| Online range queries with time travel | Standard application |
| Concurrent reads on snapshots | Each thread holds its own root |
| Mergeable segment tree | Combine via persistent merge in O(n log n) total |

#### Persistent vs alternatives

| Need | Use |
|---|---|
| K-th in range, **offline** queries | Merge sort tree, wavelet tree, sqrt decomp |
| K-th in range, **online** queries | **Persistent segment tree** |
| Range sum, **online**, point updates | Fenwick tree (no persistence needed unless queries roll back) |
| Range max with rollback | Persistent ST or operation rollback stack |
| MEX over range | Persistent ST or wavelet tree |
| Mergeable structures (small-to-large) | Persistent + DSU |

#### Memory accounting

Each `update` creates exactly `⌈log₂ n⌉ + 1` new nodes; the rest are shared with the previous version. After Q updates: total nodes ≈ N + Q · log N. For N = 10⁵, Q = 10⁵, log = 17: ~1.8M nodes. Use struct-like nodes (Python `__slots__`, C++ struct) to keep per-node memory tight.

#### Persistent BST (alternative)

Functional balanced BST (Patricia trie / HAMT / treap with persistent insertion) — every modification returns a new tree sharing most of the old. Same asymptotics; harder to write but generalizes to maps / sets, not just arrays.

#### Pitfalls

| Mistake | Fix |
|---|---|
| Mutating an old node | Persistent means **never modify** — always create a new node |
| Not coordinate-compressing values | K-th queries need value indices in `[0, V−1]`; compress with `sorted(set(...))` |
| Memory blowup from too many versions | Drop old roots if you only need recent versions |
| Recursion depth on big N | Iterative segment tree, or `sys.setrecursionlimit` |
| Confusing offline (no time travel) and online | Offline → cheaper structures; persistent shines online |
| Forgetting `roots[0]` (empty prefix) | Always seed with an empty tree before the first element |

#### Complexity

| Op | Cost |
|---|---|
| Build | O(n) |
| Update (point) | O(log n) new nodes + O(log n) time |
| Range query (any version) | O(log n) |
| K-th in range | O(log V) where V = #distinct values |
| Memory after Q updates | O(N + Q · log N) |

**Rule of thumb:** **persistent segment tree = path copy on update**. Each update creates O(log n) new nodes; old versions stay intact and queryable. The canonical use is **K-th smallest in range** — build one persistent ST per prefix on the value domain, then descend both `roots[r+1]` and `roots[l]` simultaneously. For offline-only K-th queries, **merge sort tree** or **wavelet tree** is simpler.
