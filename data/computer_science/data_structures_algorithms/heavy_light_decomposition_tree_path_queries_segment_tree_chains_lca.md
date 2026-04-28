### Heavy-Light Decomposition (tree path queries, segment tree on chains, LCA)

**When:** range queries (max / sum / xor / assign) on **paths in a tree** — "sum on path u→v", "max edge weight on path u→v", "increment all nodes on path", with point or range updates. Reduces tree-path problems to O(log n) segment tree queries on a linear array.

**Schema:**

| Concept | Detail |
|---|---|
| **Heavy child** | The child with the largest subtree (`size[v]` is max) |
| **Heavy edge** | Edge from parent to its heavy child |
| **Heavy path** | Maximal sequence of consecutive heavy edges |
| **Chain head** | Topmost node of each heavy path |
| Linear order | DFS visit heavy children **first**; assign `pos[v]` in DFS order |
| Path u→v | Decomposes into ≤ 2·log₂(n) heavy-path segments |

> Each path from any node to the root crosses at most **log₂(n) light edges** (because moving up a light edge at least halves the subtree size).

#### Build (two DFS passes)

```python
import sys
sys.setrecursionlimit(10**6)

class HLD:
    def __init__(self, n, adj, root=0):
        self.n = n; self.adj = adj
        self.parent = [-1] * n
        self.depth  = [0] * n
        self.size   = [1] * n
        self.heavy  = [-1] * n
        self._dfs1(root, -1)
        self.head   = [0] * n
        self.pos    = [0] * n
        self._cur   = 0
        self._dfs2(root, root)

    def _dfs1(self, u, p):
        max_size = 0
        for v in self.adj[u]:
            if v == p: continue
            self.parent[v] = u; self.depth[v] = self.depth[u] + 1
            self._dfs1(v, u)
            self.size[u] += self.size[v]
            if self.size[v] > max_size:
                max_size = self.size[v]; self.heavy[u] = v

    def _dfs2(self, u, h):
        self.head[u] = h
        self.pos[u] = self._cur; self._cur += 1
        if self.heavy[u] != -1:
            self._dfs2(self.heavy[u], h)             # heavy child first
        for v in self.adj[u]:
            if v != self.parent[u] and v != self.heavy[u]:
                self._dfs2(v, v)                      # new chain starts at v

    def lca(self, u, v):
        while self.head[u] != self.head[v]:
            if self.depth[self.head[u]] < self.depth[self.head[v]]: u, v = v, u
            u = self.parent[self.head[u]]
        return u if self.depth[u] < self.depth[v] else v

    def path_query(self, u, v, segtree_query):
        res = 0                                       # combine appropriately
        while self.head[u] != self.head[v]:
            if self.depth[self.head[u]] < self.depth[self.head[v]]: u, v = v, u
            res = max(res, segtree_query(self.pos[self.head[u]], self.pos[u]))
            u = self.parent[self.head[u]]
        if self.depth[u] > self.depth[v]: u, v = v, u
        res = max(res, segtree_query(self.pos[u], self.pos[v]))
        return res
```

> Pair with a **segment tree** keyed on `pos[v]`. Each path query is **O(log n) chains × O(log n) segment-tree query = O(log² n) total**.

#### Operations cost

| Op | Time |
|---|---|
| Build | O(n) |
| Path query (max / sum / xor) | **O(log² n)** |
| Path update (range add / assign) | **O(log² n)** |
| Subtree query / update | O(log n) — subtree is a contiguous `[pos[v], pos[v] + size[v])` range |
| LCA (without segment tree) | O(log n) |

#### When to use

| Problem | HLD use |
|---|---|
| Path max on edge weights | Segment tree of edge weights at `pos[child]` |
| Path sum / xor / assign | Segment tree with corresponding op |
| Subtree updates + path queries | Subtree = contiguous range; path = log chains |
| K-th node on path | Walk chains, binary-search within each |
| Distance between two nodes | LCA + depths |
| "Update every node on path u→v" | Path range update with lazy propagation |

#### HLD vs alternatives

| Need | HLD | Centroid decomp | Euler tour + segment tree | Link-cut tree |
|---|---|---|---|---|
| Path queries / updates | ✓ O(log² n) | Hard | ✗ (subtree only) | ✓ O(log n) |
| Subtree queries | ✓ O(log n) | ✗ | ✓ O(log n) | ✗ |
| Pairwise distance | ✓ via LCA | ✓ via centroid path | LCA via RMQ | ✓ |
| Static tree | ✓ | ✓ | ✓ | (overkill) |
| Dynamic edges | ✗ | ✗ | ✗ | ✓ |
| Implementation | Medium | Medium | Easy | Hard |

#### Patterns map

| Problem | HLD application |
|---|---|
| Max edge weight on path u→v | Segment tree of weights at child positions |
| Sum / count of nodes with property | Indicator at `pos[v]` + sum query |
| Color a path | Range assign + lazy propagation |
| Heaviest subtree of v | Use `size[]` directly |
| K-th ancestor | Walk chains until depth matches |
| Most common color on path | Mode query in segment tree (heavy structure) |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Querying along path without flipping deeper end | Always move from the chain whose head is deeper |
| Forgetting "DFS heavy child first" in second DFS | Without it, chain positions are wrong |
| Off-by-one when path query passes through LCA | Final query is `[pos[u], pos[v]]` after equalization |
| Edge weights on nodes vs edges | Edge weights → store on the **child** end (skip root) |
| Using HLD for dynamic tree | Use **link-cut tree** instead |

**Rule of thumb:** **HLD reduces tree path queries to ≤ 2·log n segment-tree queries**. Build with two DFS passes (compute sizes; then assign positions, heavy child first). For each path, climb chain by chain until both endpoints share a chain. **Path → log² n; subtree → log n**. For dynamic edges, switch to **link-cut tree**.
