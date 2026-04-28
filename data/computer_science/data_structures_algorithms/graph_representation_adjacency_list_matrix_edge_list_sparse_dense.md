### Graph Representation (adjacency list, matrix, edge list)

**When:** first decision in any graph problem — pick the representation by graph density and the algorithm's access pattern.

**Schema comparison:**

| Form | Space | Edge lookup `(u,v)` | Iterate neighbors of `v` | Add edge | Use when |
|---|---|---|---|---|---|
| Adjacency list | O(V + E) | O(deg v) | O(deg v) | O(1) | **Default** — sparse / real-world graphs |
| Adjacency matrix | O(V²) | O(1) | O(V) | O(1) | Dense graphs; frequent edge-existence checks; small V |
| Edge list | O(E) | O(E) | O(E) | O(1) | Bellman-Ford, Kruskal — algorithms that scan edges |
| Implicit graph | O(1) | O(1) | O(deg) | — | Grid (4-/8-neighbor), word-ladder, board states |

**Adjacency list (the default):**

```python
from collections import defaultdict
graph = defaultdict(list)
for u, v, w in edges:
    graph[u].append((v, w))
    graph[v].append((u, w))      # for undirected
```

**Adjacency matrix:**

```python
INF = float('inf')
matrix = [[INF] * V for _ in range(V)]
for i in range(V): matrix[i][i] = 0
for u, v, w in edges:
    matrix[u][v] = w
    matrix[v][u] = w             # for undirected
```

**Edge list:**

```python
edges = [(u, v, w), ...]         # raw list, no preprocessing
```

**Implicit grid graph (4-neighbor):**

```python
DIRS = [(-1,0), (1,0), (0,-1), (0,1)]
def neighbors(r, c):
    for dr, dc in DIRS:
        nr, nc = r + dr, c + dc
        if 0 <= nr < rows and 0 <= nc < cols:
            yield nr, nc
```

**Density thresholds:**

| E vs V | Density | Pick |
|---|---|---|
| E ≈ V | Sparse | Adjacency list |
| E ≈ V·log V | Medium | Adjacency list |
| E ≈ V² | Dense | Adjacency matrix |

**Algorithm → preferred representation:**

| Algorithm | Best representation |
|---|---|
| BFS / DFS (general) | Adjacency list |
| Dijkstra with heap | Adjacency list |
| Bellman-Ford | Edge list (or adjacency list) |
| Floyd-Warshall | Adjacency matrix |
| Kruskal MST | Edge list (sort by weight) |
| Prim MST | Adjacency list + heap |
| Topological sort | Adjacency list + indegree |
| Strongly connected components | Adjacency list |

**Directed vs undirected:**

| Aspect | Directed | Undirected |
|---|---|---|
| Edge | Add to `graph[u]` only | Add to both `graph[u]` and `graph[v]` |
| Cycle detection | DFS 3-color | Union-Find or DFS with parent |
| Topological sort | DAG only | N/A |
| Shortest path on tree | Single path | Single path |

**Weighted vs unweighted:**

- **Unweighted:** edges as `graph[u].append(v)`; BFS gives shortest path.
- **Weighted:** edges as `graph[u].append((v, w))`; Dijkstra / Bellman-Ford / etc.
- **Negative weights:** Bellman-Ford only; Dijkstra is incorrect.

**Multi-edges and self-loops:** adjacency list handles them naturally; matrix needs to choose (sum weights / take min / forbid).

**Pitfalls:**

| Mistake | Fix |
|---|---|
| Using matrix for sparse 10⁵-node graph | O(V²) = 10¹⁰ memory — use list |
| Forgetting both directions in undirected | Add edge to both `graph[u]` and `graph[v]` |
| Building graph implicitly inside DFS | Pre-build once; cleaner and faster |

**Rule of thumb:** **adjacency list by default**. Matrix only for dense or very small V. Edge list when the algorithm scans all edges (Bellman-Ford, Kruskal).
