### Centroid Decomposition (tree divide & conquer, path / distance queries, log layers)

**When:** problems counting / finding paths between **all pairs** of nodes in a tree — count paths of length K, sum of distances, K-th nearest node, "for each node, how many other nodes are within distance d?". Each path passes through O(log n) centroids → O(n log n) total work.

**Schema:**

| Concept | Detail |
|---|---|
| **Centroid** | Node whose removal makes every remaining subtree ≤ ⌊n/2⌋ |
| **Centroid tree** | Auxiliary tree of depth O(log n); root = centroid of whole tree, children = centroids of each remaining subtree |
| **Key fact** | Every path `u → v` in the original tree passes through their **LCA in the centroid tree**, which is some centroid `c` |
| **Algorithm** | At each centroid, count / answer for paths through that centroid; recurse on each subtree |

> Pick the centroid; solve the problem **for paths passing through it**; remove the centroid; recurse on each piece.

#### Find centroid

```python
def find_centroid(root, parent, size, removed):
    n = size[root]                                    # size of current subgraph
    # walk down to centroid: child with max subtree size
    u = root
    while True:
        for v in adj[u]:
            if v == parent or removed[v]: continue
            if size[v] > n // 2:
                parent, u = u, v; break
        else:
            return u
```

#### Standard template — solve loop (count paths of length K)

```python
def solve(u):
    calc_size(u, -1)                                  # subtree sizes in current piece
    c = find_centroid(u, size[u])                     # node where every child subtree ≤ size/2
    seen = {0: 1}                                     # paths-to-centroid distances seen so far
    for v in children_of(c):
        sub = []; collect_distances(v, 1, sub)        # distances from c through v
        for d in sub:
            answer += seen.get(K - d, 0)              # match against previously-processed subtrees
        for d in sub:
            seen[d] = seen.get(d, 0) + 1              # add this subtree's distances afterward
    removed[c] = True
    for v in children_of(c):
        solve(v)                                       # recurse into each piece
```

| Helper | Role |
|---|---|
| `calc_size(u, parent)` | Sizes within the current (un-removed) subgraph |
| `find_centroid(u, total)` | Walk to a node whose biggest child has size ≤ `total/2` |
| `collect_distances(v, d, out)` | DFS from `v` (not crossing removed nodes) collecting distances from `c` |
| **Critical** | Process each subtree's `sub` **against `seen`** then **add to `seen`** — no double-count, paths must cross `c` |
| Recurse | After marking `c` removed, `solve` each remaining piece independently |

#### Centroid tree (precompute the hierarchy)

```python
def build_centroid_tree(adj, n):
    size = [0] * n; removed = [False] * n
    parent_in_ct = [-1] * n

    def calc_size(u, p):
        size[u] = 1
        for v in adj[u]:
            if v != p and not removed[v]:
                calc_size(v, u); size[u] += size[v]

    def find_cent(u, p, tree_size):
        for v in adj[u]:
            if v != p and not removed[v] and size[v] > tree_size // 2:
                return find_cent(v, u, tree_size)
        return u

    def build(u, p_ct):
        calc_size(u, -1)
        c = find_cent(u, -1, size[u])
        parent_in_ct[c] = p_ct
        removed[c] = True
        for v in adj[c]:
            if not removed[v]: build(v, c)

    build(0, -1)
    return parent_in_ct
```

#### Use cases

| Problem | Approach |
|---|---|
| Count paths of length exactly K | Standard centroid template + bucket of distances |
| Count paths with sum ≤ S | Sort + two pointers per centroid |
| Count paths with XOR = 0 | Hash map of path-XORs per centroid |
| Sum of all pairwise distances | Sum from each centroid weighted by subtree sizes |
| K-th nearest node from each query | Centroid tree + per-node sorted distances |
| Closest "marked" node to each query | Update on marking propagates up O(log n) centroids |
| Range "color" updates on paths | Update at centroid ancestors; query at centroid ancestors |
| Tree network design (online queries) | Centroid tree as the index |

#### Complexity

| Op | Cost |
|---|---|
| Build centroid tree | O(n log n) |
| Count paths of length K (per query) | O(n log n) total |
| K-nearest-via-centroid-tree | O(n log² n) build, O(log n) per update / O(log² n) per query |
| Sum of distances | O(n log n) |
| Memory | O(n log n) auxiliary |

#### Centroid vs alternatives

| Problem | Centroid | HLD | Euler tour |
|---|---|---|---|
| Path through every pair | ✓ | ✗ | ✗ |
| Path between two specific nodes | Use HLD | ✓ | ✗ (subtree only) |
| Subtree query / update | Use Euler | ✗ | ✓ |
| Distance from query node to all marked | ✓ via centroid tree | Hard | Hard |
| Aggregating over all paths | ✓ | ✗ | ✗ |

#### Patterns map

| Phrasing | Apply |
|---|---|
| "Count pairs of nodes such that [property of path]" | Centroid + bucket / sort / hash |
| "For each node, find the closest [marked / colored] node" | Centroid tree + sorted lists |
| "Update along path u→v + ask about pair" | HLD (not centroid) |
| "Sum / count over all paths" | Centroid decomp |
| "K-th nearest neighbor in a tree metric" | Centroid tree |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Adding centroid's own distances multiple times | Process subtrees one at a time, against accumulated set |
| Counting paths within the same subtree | Subtract them off — paths must cross centroid |
| Forgetting to remove the centroid before recursing | Use `removed[]` flag |
| Recomputing subtree sizes inside `find_cent` | Compute once per `solve(u)` call |
| Recursion depth on linear trees | Iterative DFS or increase recursion limit |

**Rule of thumb:** **centroid decomposition** turns "for-all-pairs" tree problems into **n log n**. Pick the centroid (max subtree ≤ n/2), solve for paths through it, recurse on each piece. The **centroid tree** has depth O(log n) — every path's "highest centroid" is its LCA there. Use **HLD** for path queries between specific endpoints; **centroid** for global aggregations / nearest-marked queries.
