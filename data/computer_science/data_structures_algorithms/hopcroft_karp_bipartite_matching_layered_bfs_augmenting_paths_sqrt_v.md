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

#### Implementation — phase loop

```python
def max_matching(adj, U, V):                          # bipartite: U left, V right
    pair_u = [-1] * U; pair_v = [-1] * V
    matching = 0
    while bfs_layers(adj, U, pair_u, pair_v):         # build level graph; quit when no aug path
        for u in range(U):
            if pair_u[u] == -1 and dfs_aug(u, adj, pair_u, pair_v, dist):
                matching += 1
    return matching
```

| Helper | Role |
|---|---|
| `bfs_layers(...)` | BFS from all unmatched left-vertices; sets `dist[u]` to the level along alternating-path layers; returns `True` if some augmenting path was found |
| `dfs_aug(u, ...)` | DFS along strictly-increasing layers; pushes flow on a vertex-disjoint augmenting path |
| Per-phase | One `bfs_layers` then **multiple** `dfs_aug` (one per free left-vertex) |
| Termination | When `bfs_layers` finds no augmenting path |

> Why **vertex-disjoint paths per phase** matter: each phase strictly increases the shortest augmenting-path length. After O(√V) phases, the matching is maximum. Total: **O(E · √V)**.

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
