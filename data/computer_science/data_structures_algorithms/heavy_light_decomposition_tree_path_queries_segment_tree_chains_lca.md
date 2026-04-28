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

#### Build — two DFS passes (skeleton)

```python
# DFS-1: compute parent, depth, size, heavy child (max-size child)
# DFS-2: assign pos[v] in DFS order, visiting heavy child FIRST so heavy paths are contiguous
#        head[v] = topmost node of v's heavy path

def lca(u, v):
    while head[u] != head[v]:
        if depth[head[u]] < depth[head[v]]: u, v = v, u
        u = parent[head[u]]
    return u if depth[u] < depth[v] else v

def path_query(u, v, segtree_query):
    res = identity
    while head[u] != head[v]:
        if depth[head[u]] < depth[head[v]]: u, v = v, u
        res = combine(res, segtree_query(pos[head[u]], pos[u]))
        u = parent[head[u]]
    if depth[u] > depth[v]: u, v = v, u
    return combine(res, segtree_query(pos[u], pos[v]))
```

| Helper | Role |
|---|---|
| DFS-1 (`size, heavy, parent, depth`) | Bottom-up sizes; `heavy[u]` = child with max subtree |
| DFS-2 (`pos, head`) | Pre-order visit; **heavy child first** so each heavy path occupies a contiguous range of `pos` |
| `head[v]` | Topmost node of `v`'s heavy path |
| `lca` | Climb chains; deeper-`head` side moves to its chain head's parent |
| `path_query` | Same climb, but query the segment tree on each chain segment |
| Subtree query | Range `[pos[v], pos[v] + size[v])` on the segment tree |

> Pair with a **segment tree** keyed on `pos[v]`. Path query: **O(log n) chains × O(log n) segment-tree op = O(log² n)** total.

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
