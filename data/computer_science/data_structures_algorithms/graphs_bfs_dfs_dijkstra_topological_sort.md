### Graphs (BFS, DFS, Dijkstra, Topological Sort, Union-Find)

**Representations:**

| Form | Space | Edge lookup | Iterate neighbors of v | Use when |
|---|---|---|---|---|
| Adjacency list (`dict[v] -> [u, ...]`) | O(V + E) | O(deg v) | O(deg v) | **Default** — sparse, most real graphs |
| Adjacency matrix (`m[i][j]`) | O(V²) | O(1) | O(V) | Dense graphs, frequent edge-existence checks |
| Edge list (`[(u, v, w), ...]`) | O(E) | O(E) | O(E) | Bellman-Ford, Kruskal — algorithms that scan edges |

**Traversal & shortest-path algorithms:**

| Algorithm | Graph constraint | Time | Space | Data structure | Yields |
|---|---|---|---|---|---|
| BFS | unweighted | O(V + E) | O(V) | **queue** | Shortest path in #edges, level order, connected components |
| DFS (recursive or iterative) | any | O(V + E) | O(V) | **stack** (or recursion) | Cycle detection, topo sort, paths, components, bridges/articulation |
| Dijkstra | weighted, **non-negative** | O((V + E) log V) | O(V) | **min-heap** + dist map | Single-source shortest path |
| Bellman-Ford | weighted, **may be negative** | O(V · E) | O(V) | dist array, V−1 relax passes | Single-source shortest path; **detects negative cycles** |
| Floyd-Warshall | weighted | O(V³) | O(V²) | DP matrix | All-pairs shortest path; small/dense graphs |
| 0-1 BFS | weights ∈ {0, 1} | O(V + E) | O(V) | **deque** (push 0 to front, 1 to back) | Same as Dijkstra but linear |
| A* | weighted + heuristic | O((V + E) log V) | O(V) | priority queue + heuristic | Goal-directed shortest path |
| Topological sort (Kahn) | DAG | O(V + E) | O(V) | queue + in-degree | Linear order respecting dependencies; cycle detect (output size < V) |
| Topological sort (DFS) | DAG | O(V + E) | O(V) | DFS post-order, reverse | Same; produces SCC building blocks (Tarjan / Kosaraju) |
| Union-Find (DSU) | undirected | ≈O(1) per op (with path compression + rank) | O(V) | parent + rank arrays | Connected components, **cycle detect (undirected)**, Kruskal MST |

**Cycle detection — pick by graph type:**

| Graph type | Method |
|---|---|
| Undirected | Union-Find: cycle iff `find(u) == find(v)` before union |
| Undirected (DFS) | DFS with parent — back-edge to non-parent = cycle |
| Directed | DFS 3-color (white/grey/black); grey→grey edge = cycle |
| Directed (Kahn) | Topo sort produces fewer than V nodes → cycle exists |

**Algorithm → use case (the question→algorithm map):**

| Problem signature | Reach for |
|---|---|
| "Shortest path, all edges weight 1" | BFS |
| "Shortest path with positive weights" | Dijkstra |
| "Shortest path, weights can be negative" | Bellman-Ford |
| "All pairs shortest path, V ≤ a few hundred" | Floyd-Warshall |
| "Order tasks given prerequisites" | Topological sort |
| "Course schedule possible?" | Topo sort + cycle check (or DFS 3-color) |
| "Connected components" | BFS / DFS / Union-Find |
| "Number of islands in a grid" | BFS or DFS (grid as implicit graph) |
| "Cheapest flights with at most k stops" | Bellman-Ford bounded by k iterations |
| "Word ladder shortest transformation" | BFS over implicit graph |
| "MST" | Kruskal (Union-Find on sorted edges) or Prim (heap from a node) |
| "Strongly connected components" | Tarjan or Kosaraju (two DFS passes) |
| "Bipartite check / 2-color graph" | BFS / DFS coloring |
| "Critical edges (bridges) / articulation points" | DFS with low-link (Tarjan) |
| "Word search / maze with obstacles + goal" | A* if you have a heuristic, BFS otherwise |

**Dijkstra — minimal correct skeleton:**

```python
import heapq
def dijkstra(graph, start):
    dist = {start: 0}; heap = [(0, start)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist.get(u, float('inf')): continue   # stale entry
        for v, w in graph[u]:
            nd = d + w
            if nd < dist.get(v, float('inf')):
                dist[v] = nd
                heapq.heappush(heap, (nd, v))
    return dist
```

The "stale entry" guard (`if d > dist[u]: continue`) is what lets you skip the expensive `decrease-key` operation.

**Topological sort (Kahn) — minimal:**

```python
from collections import deque, defaultdict
def topo(graph, V):
    indeg = defaultdict(int)
    for u in graph:
        for v in graph[u]: indeg[v] += 1
    q = deque(u for u in range(V) if indeg[u] == 0)
    order = []
    while q:
        u = q.popleft(); order.append(u)
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0: q.append(v)
    return order if len(order) == V else None   # None ⇒ cycle
```

**Union-Find with path compression + union by rank — operations are effectively O(α(N)) ≈ O(1):**

| Op | What it does |
|---|---|
| `find(x)` | Walk to root; flatten path on the way back (path compression) |
| `union(x, y)` | Attach the lower-rank root under the higher-rank root |
| `connected(x, y)` | `find(x) == find(y)` |

**Pitfalls:**

| Mistake | Fix |
|---|---|
| Dijkstra on graph with a negative edge | Use Bellman-Ford |
| BFS for shortest path on weighted graph | Wrong — only correct for unit weights |
| Recursion-DFS on huge graphs | Stack overflow — switch to iterative DFS with explicit stack |
| Marking "visited" before pushing in BFS vs after popping | Mark **on push** to avoid duplicate enqueues |
| Topo sort on cyclic graph | Detect: `len(order) < V`, return error |

**Rule of thumb:** **adjacency list by default.** **BFS for unit-weight shortest path**, **DFS for cycle detection / topo sort / components**, **Dijkstra for non-negative weights**, **Bellman-Ford if negatives are possible**, **Union-Find for component/cycle queries on undirected graphs**. The right algorithm is almost always implied by the constraint on the weights.
