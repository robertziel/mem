### Min-Cost Max-Flow (MCMF, SPFA / Bellman-Ford, potentials, Johnson, reduced costs)

**When:** find max flow with **minimum total cost** — assignment problems with capacities, transportation / logistics, matching with weights, scheduling with priorities. Generalizes Hungarian (when capacities are 1 and graph is bipartite).

**Schema:**

| Concept | Detail |
|---|---|
| Edge | `(u, v, cap, cost)` — capacity `cap`, cost-per-unit-flow `cost` |
| Reverse residual | Capacity 0, cost `−cost`; appears after pushing flow |
| Augmenting path | `s → t` with positive residual capacity along it |
| Cost | Per unit flow on a path = sum of edge costs |
| Goal | Find max flow; among max-flow solutions, minimize total cost |

> **Successive shortest paths:** repeatedly find the **cheapest** augmenting path and push as much flow as possible along it.

#### Algorithm choices

| Variant | Path search | Time | Notes |
|---|---|---|---|
| **MCMF with SPFA** | Bellman-Ford queue version | O(F · V · E) | Most common; handles negative reduced costs |
| **MCMF with Dijkstra + potentials** (Johnson's reduction) | Dijkstra after first SPFA | O(F · (V + E) log V) | Faster; needs initial potentials from SPFA |
| **Network simplex** | LP simplex on flow LP | Exponential worst, fast in practice | Used in real OR solvers |
| **Capacity scaling MCMF** | Scale capacities by powers of 2 | O((E log U)·MCMF subroutine) | Better for huge capacities |

#### MCMF with SPFA (canonical)

```python
from collections import deque, defaultdict
INF = float('inf')

class MCMF:
    def __init__(self, n):
        self.n = n
        self.adj = defaultdict(list)                  # adj[u] = list of edge indices
        self.edges = []                               # (to, cap, cost, rev_index)

    def add_edge(self, u, v, cap, cost):
        self.adj[u].append(len(self.edges)); self.edges.append([v, cap, cost, len(self.edges) + 1])
        self.adj[v].append(len(self.edges)); self.edges.append([u, 0, -cost, len(self.edges) - 1])

    def spfa(self, s, t):
        dist = [INF] * self.n; dist[s] = 0
        in_q = [False] * self.n
        prev_edge = [-1] * self.n
        q = deque([s]); in_q[s] = True
        while q:
            u = q.popleft(); in_q[u] = False
            for eid in self.adj[u]:
                v, cap, cost, _ = self.edges[eid]
                if cap > 0 and dist[u] + cost < dist[v]:
                    dist[v] = dist[u] + cost
                    prev_edge[v] = eid
                    if not in_q[v]:
                        q.append(v); in_q[v] = True
        return dist, prev_edge

    def min_cost_flow(self, s, t):
        flow = cost = 0
        while True:
            dist, prev_edge = self.spfa(s, t)
            if dist[t] == INF: break
            # bottleneck along the path
            push = INF; v = t
            while v != s:
                eid = prev_edge[v]
                push = min(push, self.edges[eid][1])
                v = self.edges[eid ^ 1][0] if False else self.edges[self.edges[eid][3]][0]
                # safer: walk via edges[eid][3] (rev edge's "to")
                u = self.edges[self.edges[eid][3]][0]
                v = u
            # apply
            v = t
            while v != s:
                eid = prev_edge[v]
                self.edges[eid][1] -= push
                self.edges[eid ^ 1][1] += push if (eid ^ 1) < len(self.edges) and self.edges[eid][3] == (eid ^ 1) else 0
                # cleaner: edges store rev index explicitly — walk that
                rev = self.edges[eid][3]
                self.edges[rev][1] += push
                v = self.edges[rev][0]
            flow += push; cost += push * dist[t]
        return flow, cost
```

> Production code uses paired `(u→v)` and `(v→u)` edges with `rev` indices, and the **inner walk** uses `prev_edge` to step back along the augmenting path.

#### Dijkstra + potentials (Johnson's reduction)

After the first SPFA, all `dist[v]` values are finite. Define **potentials** `h[v] = dist[v]`. Replace each edge cost with **reduced cost** `c'(u, v) = c(u, v) + h[u] − h[v] ≥ 0`. Now run **Dijkstra** instead of SPFA. After each augment, update `h[v] += dist[v]` to maintain non-negativity. Same answer, faster.

#### Bipartite assignment via MCMF

| Setup | |
|---|---|
| Source `s` → every left vertex with cap 1, cost 0 | |
| Each compatibility edge with cap 1, cost = assignment cost | |
| Every right vertex → sink `t` with cap 1, cost 0 | |
| Run MCMF | |
| Result: max matching size = flow; min total cost = cost | |

> For **square bipartite** with full compatibility, **Hungarian** is faster (O(n³) without flow overhead).

#### Use cases

| Problem | Reduction |
|---|---|
| Assignment with capacities | Direct MCMF |
| Transportation problem (supply / demand graph) | Source connects to supply with cap = supply, demand to sink with cap = demand |
| Min-cost edge-disjoint paths | Capacities 1 |
| Project selection with costs | Min cut + costs |
| Scheduling with priorities | Cost = priority weight |
| Min-cost flow on time-expanded graph | Time-indexed network |
| K-min-cost paths | Run MCMF for k units of flow |

#### Patterns map

| Phrasing | Approach |
|---|---|
| "Assign … minimizing total cost, with capacities" | MCMF |
| "Maximize flow, ties broken by cost" | MCMF |
| "Min cost to ship X units" | MCMF with `cap[s] = X` |
| "K-Min cost paths from s to t" | Push k units through MCMF |
| "Cycle of negative cost" | MCMF detects via SPFA negative cycle (or use Bellman-Ford first) |
| "Min-cost perfect matching" | MCMF or Hungarian (Hungarian is faster for bipartite without capacities) |

#### Complexity

| Aspect | Cost |
|---|---|
| Time (SPFA-based) | O(F · V · E) where F = total flow |
| Time (Dijkstra + potentials) | O(F · (V + E) log V) |
| Memory | O(V + E) |
| Multi-source / multi-sink | Add super-source / super-sink with infinite capacity |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Using Dijkstra without potentials on graph with negatives | Wrong — must run SPFA first or Johnson |
| Forgetting reverse edges with `−cost` | Without them, MCMF can't "cancel" suboptimal pushes |
| Mistaking max-flow for min-cost-max-flow | Edmonds-Karp ignores cost; for cost-aware, use MCMF |
| Hungarian when graph has capacities > 1 | Use MCMF |
| Negative cycle in graph | Treat negative cycles before MCMF, or use specialized cycle-canceling |
| Float precision in cost | Use integers / Fractions if exactness matters |
| Bottleneck calc with bug | Walk via `prev_edge` carefully; off-by-one is common |

#### MCMF vs Hungarian — pick by need

| Property | Hungarian | MCMF |
|---|---|---|
| Capacity 1 only | ✓ | ✓ (specialization) |
| Capacity > 1 | ✗ | ✓ |
| Bipartite | ✓ | ✓ |
| General graph | ✗ | ✓ |
| Time | O(n³) for n×n | O(F · V · E) or O(F · (V+E) log V) |
| Implementation | Easier | Harder |

**Rule of thumb:** **MCMF = max-flow with cost as a tiebreaker** — repeatedly find **cheapest augmenting path** and push. SPFA is the default path-finder; Dijkstra with potentials is faster after the first iteration. For pure bipartite assignment with unit capacities, **Hungarian** is simpler and faster.
