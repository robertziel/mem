### Floyd-Warshall (all-pairs shortest path, DP, dense, V³)

**When:** **all-pairs** shortest path on a small / dense graph (V ≤ ~500). DP-on-graphs that's tiny to write and handles negative weights (no negative cycles).

**Schema:**

| Concept | Detail |
|---|---|
| `dist[i][j]` | Shortest path from `i` to `j` using vertices `{0..k-1}` as intermediates |
| Recurrence | `dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])` |
| Iteration | `k` outermost; `i, j` inside |
| Initialization | `dist[i][i] = 0`; `dist[i][j] = w(i,j)` if edge; `∞` otherwise |

**Template:**

```python
def floyd_warshall(W):
    n = len(W)
    dist = [row[:] for row in W]                 # copy
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
    return dist
```

**Initialization:**

```python
INF = float('inf')
W = [[INF] * V for _ in range(V)]
for i in range(V): W[i][i] = 0
for u, v, w in edges:
    W[u][v] = min(W[u][v], w)
    W[v][u] = min(W[v][u], w)        # for undirected
```

**Negative cycle detection:** after running Floyd-Warshall, if any `dist[i][i] < 0`, vertex `i` is on (or reachable to) a negative cycle.

**Path reconstruction (`next` table):**

```python
def floyd_with_path(W):
    n = len(W); dist = [row[:] for row in W]
    nxt = [[j if W[i][j] < INF else None for j in range(n)] for i in range(n)]
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
                    nxt[i][j] = nxt[i][k]
    return dist, nxt

def path(nxt, i, j):
    if nxt[i][j] is None: return []
    out = [i]
    while i != j:
        i = nxt[i][j]; out.append(i)
    return out
```

**Complexity:**

| Aspect | Cost |
|---|---|
| Time | O(V³) |
| Space | O(V²) |

**When Floyd-Warshall beats running Dijkstra V times:**

| V | E | Floyd-Warshall | V × Dijkstra (heap) |
|---|---|---|---|
| 100 | dense (V²) | 10⁶ | 10⁶ |
| 500 | dense | 1.25·10⁸ | ~10⁸ |
| 5000 | dense | 1.25·10¹¹ | ~10⁹ |

> Floyd-Warshall wins on **simplicity and dense graphs**; Dijkstra-V-times wins for **sparse + non-negative**.

**Variants (substitute the recurrence):**

| Goal | Recurrence |
|---|---|
| Shortest path | `min(dist[i][j], dist[i][k] + dist[k][j])` |
| Longest path in DAG | Replace `min` with `max` (DAG only) |
| Transitive closure (reachability) | `dist[i][j] = dist[i][j] OR (dist[i][k] AND dist[k][j])` |
| Min-max path | `min(dist[i][j], max(dist[i][k], dist[k][j]))` |
| Max-min capacity | `max(dist[i][j], min(dist[i][k], dist[k][j]))` |

**Patterns map:**

| Problem | Use |
|---|---|
| All-pairs shortest path, V ≤ 500 | Floyd-Warshall |
| Transitive closure | Replace arithmetic with boolean OR / AND |
| Best route through any K cities (small K) | All-pairs first; then DP on subsets |
| Dense graph, negative weights | Floyd-Warshall (Bellman-Ford × V is slower) |
| City reachability matrix | Transitive closure variant |

**Algorithm picker (shortest path summary):**

| Need | Use | Time |
|---|---|---|
| Single source, unit weights | BFS | O(V + E) |
| Single source, non-negative | Dijkstra | O((V+E) log V) |
| Single source, possibly negative | Bellman-Ford | O(V · E) |
| All pairs, small/dense | Floyd-Warshall | O(V³) |
| All pairs, sparse + non-negative | V × Dijkstra | O(V·(V+E) log V) |
| All pairs, sparse + negative | Johnson's algorithm | O(V·E + V² log V) |

**Pitfalls:**

| Mistake | Fix |
|---|---|
| Loop order — `i, j, k` instead of `k, i, j` | The DP requires `k` outermost |
| Forgetting `dist[i][i] = 0` | Diagonal must be zero initially |
| Multi-edges | Take `min` when filling initial matrix |
| Using on V > 1000 | O(V³) = 10⁹+ — too slow |

**Rule of thumb:** Floyd-Warshall = **3-line all-pairs shortest path on small graphs**. **`k` is the outermost loop.** Diagonal `dist[i][i] < 0` after the algorithm = negative cycle reachable to `i`.
