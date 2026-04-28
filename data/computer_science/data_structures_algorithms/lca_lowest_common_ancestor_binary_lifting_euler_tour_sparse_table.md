### LCA (Lowest Common Ancestor — binary lifting, Euler tour, sparse table)

**When:** many LCA queries on a static rooted tree — distance between two nodes (`dist(u, v) = depth(u) + depth(v) − 2·depth(lca(u, v))`), tree path queries, K-th ancestor.

**Schema (which technique fits):**

| Technique | Preprocess | Query | Notes |
|---|---|---|---|
| Naive (walk up) | O(N) | O(N) | Fine for tiny trees |
| **Binary lifting** | O(N log N) | O(log N) | **Default** — also gives K-th ancestor |
| Euler tour + sparse table (RMQ) | O(N log N) | **O(1)** | Best for many queries; harder to extend |
| Tarjan's offline LCA | O((N + Q) α) | — | Offline batched queries |
| Heavy-light decomposition | O(N) | O(log² N) | Generalizes to path queries / updates |

#### Binary lifting — core skeleton

**Schema:** `up[k][v]` = the 2ᵏ-th ancestor of `v`, or `-1` if none.

```python
# Preprocess: BFS from root to set depth[] and up[0][v] = parent[v]
# Then fill: up[k][v] = up[k-1][ up[k-1][v] ]   for k = 1..LOG

def kth_ancestor(v, k):
    for i in range(LOG + 1):
        if k & (1 << i):
            v = up[i][v]
            if v == -1: return -1
    return v

def lca(u, v):
    if depth[u] < depth[v]: u, v = v, u
    u = kth_ancestor(u, depth[u] - depth[v])           # lift to same depth
    if u == v: return u
    for k in range(LOG, -1, -1):                        # lift in lockstep
        if up[k][u] != up[k][v]:
            u = up[k][u]; v = up[k][v]
    return up[0][u]

def dist(u, v):
    return depth[u] + depth[v] - 2 * depth[lca(u, v)]
```

| Step | Detail |
|---|---|
| `LOG` | `⌈log₂ n⌉` — `20` covers n ≤ 10⁶ |
| Preprocess | BFS / DFS from root to fill `depth[]` and `up[0]` |
| Sparse-table fill | `up[k][v] = up[k-1][up[k-1][v]]` — O(N log N) |
| LCA | Lift deeper node to same depth, then lift both in lockstep |
| Distance | `depth(u) + depth(v) − 2·depth(LCA)` |

**How it works (binary lifting LCA):**

| Step | Action |
|---|---|
| 1 | Lift the deeper node up so both are at the same depth (using K-th ancestor on the depth difference) |
| 2 | Now equally deep — if they're already equal, that's the LCA |
| 3 | Otherwise lift both by the largest power-of-2 jump that keeps them on different ancestors; repeat |
| 4 | After loop, the parent of either node is the LCA |

#### Euler tour + sparse table (O(1) per query)

**Idea:** record the Euler tour (DFS visits each edge twice). LCA(u, v) corresponds to the **shallowest node** in the tour between the first occurrences of `u` and `v` — a range-min query (RMQ) over the depth array. RMQ over a static array is O(1) with a sparse table after O(N log N) preprocessing.

```python
# Sketch — full code is verbose
tour = []                                    # nodes in DFS order
depth_in_tour = []
first = [0] * n                              # first index in tour for each node

def dfs(u, parent, d):
    first[u] = len(tour)
    tour.append(u); depth_in_tour.append(d)
    for v in adj[u]:
        if v != parent:
            dfs(v, u, d + 1)
            tour.append(u); depth_in_tour.append(d)   # back-edge entry

# Build sparse table on depth_in_tour for O(1) RMQ
# LCA(u, v) = node at argmin in depth_in_tour over [first[u], first[v]]
```

**Trade-offs:**

| Concern | Binary lifting | Euler + RMQ |
|---|---|---|
| Preprocess | O(N log N) | O(N log N) |
| Query | O(log N) | **O(1)** |
| K-th ancestor support | ✓ Free | ✗ Separate structure |
| Path-query extensions | Easier | Harder |
| Memory | O(N log N) | O(N log N) |

#### Patterns map

| Problem | Approach |
|---|---|
| LCA of two nodes | Binary lifting |
| Distance between two nodes | `depth(u) + depth(v) - 2·depth(LCA)` |
| K-th ancestor | Binary lifting (free) |
| Is `u` an ancestor of `v`? | DFS in/out times: `in[u] ≤ in[v]` and `out[v] ≤ out[u]` |
| Sum / max on path `u → v` | Binary lifting with prefix max / sum on `up[k][v]` |
| Online tree-path queries | Heavy-light decomposition + segment tree |
| Offline LCA (batched) | Tarjan's offline LCA with DSU |
| Subtree queries | DFS Euler tour → linear range; segment tree / Fenwick |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Building `up` for the wrong root | Pick a root and stick with it |
| Forgetting to lift to equal depth before lockstep | Two-step process matters |
| Using DFS recursion on huge tree | Use BFS or iterative DFS |
| Off-by-one in `LOG` (need `ceil`) | `math.ceil(log2(n))` or just use 20 for n ≤ 10⁶ |
| Binary lifting on a graph with cycles | LCA only makes sense on trees |
| Comparing `up[k][u]` and `up[k][v]` when one is `-1` | Be careful; both being `-1` shouldn't trigger ascent |

**Complexity summary:**

| Op | Binary lifting | Euler + RMQ |
|---|---|---|
| Preprocess | O(N log N) | O(N log N) |
| LCA query | O(log N) | O(1) |
| K-th ancestor | O(log N) | — |
| Distance query | O(log N) | O(1) |

**Rule of thumb:** **binary lifting** is the default — O(N log N) preprocess, O(log N) per LCA / K-th-ancestor query, easy to implement, easy to extend (max/sum on path, etc.). Reach for **Euler tour + sparse table** only when you need true O(1) queries and the constant factor matters. **Distance on tree = depth(u) + depth(v) − 2·depth(LCA(u, v))** — the universal formula.
