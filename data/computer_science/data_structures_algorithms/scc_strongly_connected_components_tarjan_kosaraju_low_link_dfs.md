### Strongly Connected Components (SCC — Tarjan, Kosaraju, low-link, DFS)

**When:** in a **directed** graph, find maximal subsets where every node reaches every other node. Used for: 2-SAT, cycle compression (DAG of SCCs), reachability, dependency analysis.

**Schema:**

| Concept | Detail |
|---|---|
| SCC | Maximal subset where `u ⇋ v` (mutual reachability) for all pairs |
| Condensation | Replace each SCC with a single node — result is a **DAG** |
| Use | Run topo sort / DP on the condensation DAG |

**Two main algorithms — same answer:**

| Algorithm | DFS passes | Mechanism |
|---|---|---|
| **Kosaraju** | 2 | DFS post-order on original; DFS on reversed graph in that order |
| **Tarjan** | 1 | Single DFS with low-link values + a stack |

Both are O(V + E).

**Kosaraju (simpler to memorize):**

```python
def kosaraju(graph, V):
    rev = [[] for _ in range(V)]
    for u in range(V):
        for v in graph[u]: rev[v].append(u)

    seen = [False] * V; order = []
    def dfs1(u):
        seen[u] = True
        for v in graph[u]:
            if not seen[v]: dfs1(v)
        order.append(u)                          # post-order
    for u in range(V):
        if not seen[u]: dfs1(u)

    comp = [-1] * V
    def dfs2(u, c):
        comp[u] = c
        for v in rev[u]:
            if comp[v] == -1: dfs2(v, c)

    cid = 0
    for u in reversed(order):                    # process in reverse post-order
        if comp[u] == -1:
            dfs2(u, cid); cid += 1
    return comp, cid                              # comp[u] = SCC id; cid = #SCCs
```

**Tarjan (single pass, low-link):**

```python
def tarjan(graph, V):
    idx = [0]
    disc = [-1] * V; low = [0] * V
    on_stack = [False] * V
    stack = []
    sccs = []

    def dfs(u):
        disc[u] = low[u] = idx[0]; idx[0] += 1
        stack.append(u); on_stack[u] = True
        for v in graph[u]:
            if disc[v] == -1:                    # tree edge
                dfs(v)
                low[u] = min(low[u], low[v])
            elif on_stack[v]:                    # back edge to current SCC
                low[u] = min(low[u], disc[v])
        if low[u] == disc[u]:                    # u is SCC root
            comp = []
            while True:
                v = stack.pop(); on_stack[v] = False
                comp.append(v)
                if v == u: break
            sccs.append(comp)

    for u in range(V):
        if disc[u] == -1: dfs(u)
    return sccs
```

**Tarjan low-link semantics:**

| Variable | Meaning |
|---|---|
| `disc[u]` | DFS discovery time of `u` |
| `low[u]` | Lowest `disc` reachable from `u`'s subtree (via tree edges + at most one back edge) |
| SCC root | `low[u] == disc[u]` — anchor of an SCC |
| Stack | Currently-being-explored nodes (on current DFS path / siblings) |

**Building the condensation DAG:**

```python
# After computing comp[] (SCC id per node):
from collections import defaultdict
dag = defaultdict(set)
for u in range(V):
    for v in graph[u]:
        if comp[u] != comp[v]:
            dag[comp[u]].add(comp[v])
# dag is a DAG — run topo sort, DP, longest path, etc.
```

**Patterns map:**

| Problem | SCC application |
|---|---|
| Critical connections / bridges | Different — bridges are for **undirected** graphs (Tarjan low-link variant) |
| 2-SAT (boolean satisfiability) | Implication graph; check `x` and `¬x` aren't in the same SCC |
| Reachability with cycles | Condense to DAG; reachability is then easy |
| Min #vertices to add for full strong connectivity | After SCC, count source/sink components in DAG |
| Find all cycles | Each SCC of size > 1 contains cycles |
| Functional graphs (each node has one out-edge) | Each SCC is a single cycle (rho-shape with tail) |
| Hierarchical clustering | SCC + condensation gives strict ordering |

**Tarjan vs Kosaraju:**

| Concern | Tarjan | Kosaraju |
|---|---|---|
| Passes | 1 | 2 |
| Easier to memorize | ✗ | ✓ |
| Reversed graph needed | ✗ | ✓ |
| Constant factor | Lower | Higher |
| Generalizes to bridges, articulation | ✓ Same low-link technique | ✗ |

**Bridges (undirected) — same low-link idea, different condition:**

```python
# Edge (u, v) is a bridge iff low[v] > disc[u]
```

(Articulation points: `u` is articulation if it's the root with ≥2 children, or for some child `v`, `low[v] >= disc[u]`.)

**Pitfalls:**

| Mistake | Fix |
|---|---|
| Treating SCC as undirected | SCC is **directed**-graph specific |
| Tarjan: forgetting `on_stack` check | Cross edges to visited-but-different-SCC nodes mustn't update `low[u]` |
| Kosaraju: wrong order | Iterate **reverse** post-order from first DFS |
| Confusing bridges with SCC | Bridges are undirected; SCC is directed |
| Stack overflow on large V | Convert to iterative DFS |

**Complexity:** both O(V + E) time, O(V) space.

**Rule of thumb:** **SCC = directed graph's connected components**. Use **Kosaraju** if you want easy-to-explain code (two DFS passes); **Tarjan** if you want a single pass and the same low-link technique generalizes to **bridges and articulation points** in undirected graphs. Condense to a DAG — most "graph with cycles" problems become "DAG" after SCC.
