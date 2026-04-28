### Max Flow / Min Cut (Ford-Fulkerson, Edmonds-Karp, Dinic, bipartite matching)

**When:** push as much "flow" from `s` to `t` through a directed network with edge capacities; equivalently find a minimum-capacity cut. Used for: bipartite matching, project selection, image segmentation, edge-disjoint paths, scheduling with constraints.

**Schema:**

| Concept | Detail |
|---|---|
| Capacity `c(u, v)` | Max flow allowed on edge `u → v` |
| Flow `f(u, v)` | Current flow; `0 ≤ f(u, v) ≤ c(u, v)` |
| Conservation | For every non-source/sink node, in-flow = out-flow |
| Residual capacity `c_f(u, v)` | `c(u, v) − f(u, v)`; **plus** `f(v, u)` on the reverse edge |
| Augmenting path | Path `s → t` in the residual graph with all capacities > 0 |
| Min cut | Partition `(S, T)` with `s ∈ S, t ∈ T`; cost = sum of capacities of edges from S to T |

#### Max-flow / min-cut theorem

> **Max flow value = Min cut capacity** in any flow network.

After running max-flow, the min cut is `(S, T)` where `S` = nodes reachable from `s` in the residual graph; `T` = the rest.

#### Algorithm comparison

| Algorithm | Augmenting path search | Time | Notes |
|---|---|---|---|
| Ford-Fulkerson | Any path | O(E · max_flow) — depends on capacities | Doesn't terminate on irrational capacities |
| **Edmonds-Karp** | **BFS** (shortest in #edges) | **O(V·E²)** | Polynomial; **most common for interviews** |
| **Dinic** | BFS layers + multiple DFS pushes | O(V²·E); O(E·√V) on unit/bipartite | Fast in practice; standard for competitive |
| ISAP | Distance labels | Same as Dinic | Faster constants |
| Push-relabel | Local push + relabel | O(V²·√E) | Theoretical best; complex |

#### Edmonds-Karp (clean canonical implementation)

```python
from collections import deque, defaultdict

class MaxFlow:
    def __init__(self, n):
        self.n = n
        self.graph = defaultdict(lambda: defaultdict(int))   # capacities

    def add_edge(self, u, v, cap):
        self.graph[u][v] += cap                              # add to existing if multi-edge
        # reverse residual capacity starts at 0 (auto-handled by defaultdict)

    def _bfs(self, s, t, parent):
        seen = {s}; q = deque([s])
        while q:
            u = q.popleft()
            for v, c in self.graph[u].items():
                if v not in seen and c > 0:
                    seen.add(v); parent[v] = u
                    if v == t: return True
                    q.append(v)
        return False

    def max_flow(self, s, t):
        flow = 0
        while True:
            parent = {}
            if not self._bfs(s, t, parent): break
            # bottleneck along the augmenting path
            path_flow = float('inf'); v = t
            while v != s:
                u = parent[v]
                path_flow = min(path_flow, self.graph[u][v])
                v = u
            # apply: decrease forward capacities, increase reverse
            v = t
            while v != s:
                u = parent[v]
                self.graph[u][v] -= path_flow
                self.graph[v][u] += path_flow
                v = u
            flow += path_flow
        return flow

    def min_cut(self, s):
        # nodes still reachable from s in residual = S; the rest = T
        seen = {s}; q = deque([s])
        while q:
            u = q.popleft()
            for v, c in self.graph[u].items():
                if v not in seen and c > 0:
                    seen.add(v); q.append(v)
        return seen
```

#### Bipartite matching (max-flow specialization)

| Setup | Cost |
|---|---|
| Source `s` → every left vertex with capacity 1 | |
| Every left → right edge in matching graph with capacity 1 | |
| Every right vertex → sink `t` with capacity 1 | |
| Run max-flow | O(E·√V) with Dinic on unit-capacity graphs |

> Max flow = max matching size. The matched edges are those with flow = 1.

**König's theorem (bipartite):** in a bipartite graph, **max matching = min vertex cover**. Used in many "minimum-X-to-cover" reductions.

**Hall's theorem:** a perfect matching exists in a bipartite graph iff every subset `S` of one side has at least `|S|` neighbors on the other side.

**Hungarian algorithm:** weighted bipartite assignment in O(n³).

#### Reductions to max flow

| Problem | Reduction |
|---|---|
| Bipartite matching | s → left → right → t, capacities 1 |
| Edge-disjoint paths from `s` to `t` | All capacities 1; max flow = max # disjoint paths |
| Vertex-disjoint paths | Split each vertex `v` into `v_in → v_out` with capacity 1 |
| Project selection (cost / profit) | s → profit projects → cost projects → t |
| Image segmentation (foreground / background) | Pixels = nodes; capacities reflect likelihoods |
| Min-cost max-flow | Add edge costs; Bellman-Ford / SPFA inside |
| Scheduling with constraints | Jobs ↔ time slots, capacities = duration |
| Closure problem | Project selection variant |
| Multi-source / multi-sink | Add super-source / super-sink with infinite-capacity edges |

#### Min-cost max flow (sketch)

Each edge has both capacity and cost per unit flow. Find max flow with **minimum total cost**. Replace BFS in Edmonds-Karp with **Bellman-Ford or SPFA** (allows negative reduced costs from reverse edges). O(V·E²) typical; O(V·E·flow) worst.

#### Patterns map

| Problem | Setup |
|---|---|
| Max bipartite matching | Direct reduction; capacities 1 |
| Min vertex cover (bipartite) | König — find max matching, then BFS-residual |
| Edge connectivity (min edges to disconnect s from t) | Capacities 1; max flow |
| Vertex connectivity | Vertex split + max flow |
| Maximum independent set on bipartite | `n - max matching` |
| Two-color a graph minimizing conflicts | Min cut |
| Assign jobs to workers minimizing cost | Min-cost max-flow / Hungarian |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Forgetting to add reverse residual edges | Every push must increment `f(v, u)` so future pushes can "cancel" |
| Using DFS for augmenting path in Edmonds-Karp | BFS is required for the polynomial bound |
| Multi-edges between same pair | Sum capacities or store as list — depends on implementation |
| Integer capacities only? | Ford-Fulkerson can fail on irrationals; Edmonds-Karp / Dinic are polynomial regardless |
| Min-cut from `t` instead of `s` | Min-cut walk uses **`s`-side reachability** in residual |

**Complexity summary:**

| Algorithm | Time |
|---|---|
| Ford-Fulkerson (any path) | O(E · max_flow) |
| Edmonds-Karp (BFS) | O(V·E²) |
| Dinic | O(V²·E); O(E·√V) on unit/bipartite |
| Push-relabel | O(V²·√E) |
| Min-cost max-flow (SSP) | O(V·E·flow) |

**Rule of thumb:** **Edmonds-Karp** is the right balance for interviews — simple to code, polynomial bound. **Bipartite matching = max flow with all capacities 1** + Dinic in O(E·√V). The **min-cut after max-flow** is BFS in the residual graph from `s` — that's how you recover the actual cut. Most "minimum X to separate / select / cover" problems on graphs reduce to max flow.
