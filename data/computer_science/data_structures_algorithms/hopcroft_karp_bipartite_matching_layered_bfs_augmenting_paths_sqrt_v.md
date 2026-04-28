### Hopcroft-Karp (bipartite matching, layered BFS, augmenting paths, O(E·√V))

**When:** maximum bipartite matching faster than Edmonds-Karp / naive Hungarian augmenting paths. The standard algorithm for graphs with up to ~10⁵ vertices.

**Schema:**

| Concept | Detail |
|---|---|
| Bipartite graph | Two disjoint sets `U`, `V`; edges only between them |
| Matching | Set of edges with no shared vertex |
| Augmenting path | Alternating unmatched / matched edges, starting and ending at unmatched vertices |
| Phase | One BFS to build the level graph + multiple DFS to find vertex-disjoint augmenting paths of the same shortest length |
| Total phases | O(√V) — proven by Hopcroft & Karp (1973) |

> Key insight: **augment many vertex-disjoint shortest paths per BFS pass** instead of one. Reduces O(V·E) (Edmonds-Karp on capacity-1 bipartite) to **O(E·√V)**.

#### Implementation

```python
from collections import deque, defaultdict

INF = float('inf')

class HopcroftKarp:
    def __init__(self, U, V):                         # U, V: vertex counts on each side
        self.U = U; self.V = V
        self.adj = defaultdict(list)
        self.pair_u = [-1] * U
        self.pair_v = [-1] * V
        self.dist   = [INF] * U

    def add_edge(self, u, v):
        self.adj[u].append(v)

    def bfs(self):
        q = deque()
        for u in range(self.U):
            if self.pair_u[u] == -1:
                self.dist[u] = 0; q.append(u)
            else:
                self.dist[u] = INF
        found_aug = False
        while q:
            u = q.popleft()
            for v in self.adj[u]:
                pu = self.pair_v[v]
                if pu == -1:
                    found_aug = True
                elif self.dist[pu] == INF:
                    self.dist[pu] = self.dist[u] + 1
                    q.append(pu)
        return found_aug

    def dfs(self, u):
        for v in self.adj[u]:
            pu = self.pair_v[v]
            if pu == -1 or (self.dist[pu] == self.dist[u] + 1 and self.dfs(pu)):
                self.pair_u[u] = v
                self.pair_v[v] = u
                return True
        self.dist[u] = INF                            # dead-end
        return False

    def max_matching(self):
        matching = 0
        while self.bfs():
            for u in range(self.U):
                if self.pair_u[u] == -1 and self.dfs(u):
                    matching += 1
        return matching
```

> **`bfs()`** sets `dist[u]` for free U-vertices to layered distances; **`dfs()`** finds vertex-disjoint augmenting paths along strictly increasing layers.

#### Why O(E·√V)

Each phase strictly increases the length of the shortest augmenting path. After O(√V) phases, no shorter augmenting paths can exist; the remaining matching gap is ≤ √V, and each remaining vertex needs ≤ 1 augmenting path → ≤ √V more phases. Total work: each phase is O(V + E); √V phases → **O(E·√V)**.

#### Hopcroft-Karp vs alternatives

| Algorithm | Time | Notes |
|---|---|---|
| Naive (Kuhn / Hungarian augmenting) | O(V·E) | Single augmenting path per pass |
| Edmonds-Karp on flow network | O(V·E²) | Slower for unit capacities |
| **Hopcroft-Karp** | **O(E·√V)** | Standard for bipartite matching |
| Dinic's on flow network | O(E·√V) | Same bound — Hopcroft-Karp is the bipartite specialization |
| **Hungarian** | O(n³) | For weighted (min-cost) matching |
| Blossom (Edmonds) | O(V³) | General (non-bipartite) graphs |

#### Patterns map

| Problem | Bipartite-matching reduction |
|---|---|
| Assign workers to jobs (yes / no compatibility) | Workers ↔ Jobs with edge per compatibility |
| Job scheduling on machines | Jobs ↔ Time slots |
| Maximum independent set in **bipartite** graph | `n − max matching` (König) |
| Minimum vertex cover in bipartite | `max matching` (König) |
| Min path cover in DAG | `n − max bipartite matching` (split each node into in/out) |
| Latin square completion | Rows ↔ Columns; matching by valid digit |
| Stable marriage (different) | Gale-Shapley, not Hopcroft-Karp |
| Maximum profit job assignment | **Hungarian** (weighted), not Hopcroft-Karp |

#### König's theorem (bipartite max matching ⇔ min vertex cover)

After running Hopcroft-Karp:

1. Let `Z` = unmatched U-vertices ∪ all vertices reachable from them via alternating paths.
2. Min vertex cover = `(U \ Z) ∪ (V ∩ Z)`.
3. Max independent set = complement = `(U ∩ Z) ∪ (V \ Z)`.

#### Min path cover in DAG

Split each node `v` into `v_out` (in U-side) and `v_in` (in V-side). For each edge `u → v` in DAG, add `u_out → v_in` to bipartite graph. **Min path cover = n − max matching.**

#### Pitfalls

| Mistake | Fix |
|---|---|
| Using the algorithm on a non-bipartite graph | For general graphs, **blossom** (Edmonds) is required |
| Forgetting to return `False` when DFS dead-ends | Set `dist[u] = INF` so DFS doesn't revisit |
| Re-running BFS within DFS unnecessarily | One BFS, then **multiple** DFS in same phase |
| Treating duplicate edges as multi-edges | Bipartite matching doesn't gain anything; deduplicate |
| Confusing matching with flow on capacity > 1 | Hopcroft-Karp is for unit capacities |
| Confusing Hopcroft-Karp with Hopcroft-Tarjan (planarity) | Different algorithms |
| Doing it on a graph that should use Hungarian | Hopcroft-Karp = unweighted; Hungarian = weighted |

#### Complexity

| Op | Cost |
|---|---|
| BFS (one phase) | O(V + E) |
| DFS (per phase, total over all DFS in phase) | O(V + E) |
| Number of phases | **O(√V)** |
| Total | **O(E·√V)** |
| Memory | O(V + E) |

**Rule of thumb:** **Hopcroft-Karp = layered BFS + multi-DFS** for bipartite matching in O(E·√V). For weighted matching (assignment problem), use **Hungarian**. For general (non-bipartite) graphs, use **blossom (Edmonds)**. König's theorem and min-path-cover reductions are the most common applications beyond direct matching.
