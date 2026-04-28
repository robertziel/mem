### Union-Find (Disjoint Set, path compression, union by rank, α inverse Ackermann)

**When:** maintain a partition of `n` elements under merge & query operations. The right answer for **components, equivalence classes, cycle detection in undirected graphs, Kruskal MST**, and online connectivity.

**Schema:**

| Field | Purpose |
|---|---|
| `parent[i]` | Pointer to parent in the tree (root has `parent[i] == i`) |
| `rank[i]` (or `size[i]`) | Tree height bound — used to attach smaller under larger |
| `find(x)` | Walk to root; flatten path on the way back (path compression) |
| `union(x, y)` | Merge the two roots; smaller tree under larger root |
| `connected(x, y)` | `find(x) == find(y)` |

**Implementation (path compression + union by rank):**

```python
class DSU:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.components = n

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]   # path compression (halving)
            x = self.parent[x]
        return x

    def union(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx == ry: return False                  # already same set
        if self.rank[rx] < self.rank[ry]: rx, ry = ry, rx
        self.parent[ry] = rx
        if self.rank[rx] == self.rank[ry]: self.rank[rx] += 1
        self.components -= 1
        return True

    def connected(self, x, y):
        return self.find(x) == self.find(y)
```

**Why so fast:** with both **path compression** and **union by rank**, each op is O(α(N)) amortized — α = inverse Ackermann, ≤ 4 for any practical N. Treat as O(1).

**Operations cost:**

| Op | With both optimizations | With only one | Naive |
|---|---|---|---|
| `find` | ~O(α(N)) | O(log N) | O(N) |
| `union` | ~O(α(N)) | O(log N) | O(N) |

**Recursive find with path compression (alternative):**

```python
def find(self, x):
    if self.parent[x] != x:
        self.parent[x] = self.find(self.parent[x])
    return self.parent[x]
```

**Patterns map:**

| Problem | DSU trick |
|---|---|
| Number of connected components | Count distinct roots after all unions |
| Cycle detection (undirected) | Cycle iff `find(u) == find(v)` before union |
| Kruskal MST | Sort edges; union smaller-weight first; skip if already connected |
| Account merge / friend circles | Each query is `union`; final groups are components |
| Number of provinces / islands | DSU over adjacency, count components |
| Redundant connection | First edge that creates a cycle |
| Smallest equivalent string | Component → smallest character in the group |
| Online connectivity queries | Standard DSU |
| Largest component size | Track `size[]` instead of (or with) `rank[]` |
| Earliest moment when everyone connected | Process events in time order; stop when components == 1 |
| Accounts merge | Union accounts that share an email |

**Kruskal MST (canonical use):**

```python
def kruskal(V, edges):
    dsu = DSU(V)
    edges.sort(key=lambda e: e[2])              # ascending by weight
    cost = 0; mst = []
    for u, v, w in edges:
        if dsu.union(u, v):
            cost += w; mst.append((u, v, w))
            if len(mst) == V - 1: break
    return cost, mst
```

**DSU on grids (treat each cell as a node):**

```python
def index(r, c, cols): return r * cols + c
# Then union neighbors that satisfy the predicate
```

**Variants:**

| Variant | Use |
|---|---|
| Weighted DSU | Track relative offsets — "are A and B in the same set, and how do they relate?" |
| Rollback DSU | Stack of unions to undo (for offline / divide & conquer) |
| Persistent DSU | Multiple historical versions (functional / immutable) |
| 2D / grid DSU | Encode `(r, c) → r * cols + c` |

**Pitfalls:**

| Mistake | Fix |
|---|---|
| Calling `union(x, y)` without finding roots first | Always operate on roots |
| Path compression alone without rank | Still O(log N) — both together gives O(α) |
| Recursing `find` past Python's stack on huge N | Use iterative `find` |
| Tracking sizes by index instead of root | Always read/update `size[find(x)]` |

**Rule of thumb:** any time the problem is about **"are these two in the same group?"** or **"merge groups"**, reach for DSU. With path compression + union by rank, treat operations as **O(1)**. Canonical use cases: **components, undirected cycle detection, Kruskal**.
