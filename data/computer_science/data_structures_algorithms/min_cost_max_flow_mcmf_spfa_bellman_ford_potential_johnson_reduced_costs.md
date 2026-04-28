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

#### MCMF with SPFA — core loop

```python
def min_cost_flow(graph, s, t):              # graph: paired forward + reverse edges
    flow = cost = 0
    while True:
        dist, prev_edge = spfa(graph, s)     # cheapest-cost path s→all (handles negative reverse-edge costs)
        if dist[t] == INF: break
        push = bottleneck(graph, prev_edge, s, t)   # min residual cap along the path
        augment(graph, prev_edge, s, t, push)        # subtract on forward, add on reverse
        flow += push; cost += push * dist[t]
    return flow, cost
```

| Helper | Role |
|---|---|
| `add_edge(u, v, cap, cost)` | Add forward edge `(cap, cost)` **and** reverse edge `(0, −cost)`; store mutual `rev` indices |
| `spfa(graph, s)` | Bellman-Ford queue version — returns `dist[]` + `prev_edge[]` |
| `bottleneck(...)` | Walk back via `prev_edge`; minimum residual capacity |
| `augment(...)` | Walk back; subtract on forward, add on reverse |
| Stop | When `dist[t] == INF` (no augmenting path) |

> **Dijkstra + potentials (Johnson):** after first SPFA, set `h[v] = dist[v]`. Reduced cost `c'(u, v) = c + h[u] − h[v] ≥ 0`. Switch to Dijkstra; update `h[v] += dist[v]` after each augment.

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
