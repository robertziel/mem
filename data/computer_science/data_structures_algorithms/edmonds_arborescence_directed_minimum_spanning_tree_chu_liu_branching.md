### Edmonds' Arborescence (directed minimum spanning tree, Chu-Liu, branching)

**When:** find the **minimum spanning arborescence** (directed MST) rooted at a specific vertex `r` — every other vertex has exactly one incoming edge in the arborescence; total weight is minimized. Used for: dependency-tree resolution, broadcast routing, parsing (NLP dependency parsers like McDonald's), network design with directed costs.

**Schema:**

| Concept | Detail |
|---|---|
| Arborescence | Directed tree with root `r`; every non-root has exactly one in-edge in the tree; reachable from `r` |
| Min spanning arborescence | Among all arborescences, minimum total edge weight |
| Existence | Iff every vertex `v ≠ r` has at least one incoming edge from a vertex reachable from `r` |
| Time | O(V·E) (Chu-Liu / Edmonds), O(E + V log V) with Tarjan's improvements |

> Kruskal / Prim are wrong for directed graphs — they ignore direction. Edmonds' is the correct algorithm.

#### Chu-Liu / Edmonds — high-level algorithm

| Step | Action |
|---|---|
| 1 | For every `v ≠ r`, pick the minimum-weight incoming edge into `v` |
| 2 | If the chosen edges form a forest (no cycle), they're the arborescence — done |
| 3 | Otherwise, find a cycle `C`; **contract** it into a single node |
| 4 | For each edge entering the contracted node, **adjust weights**: subtract the chosen-edge weight of the destination |
| 5 | Recurse on the contracted graph |
| 6 | **Expand** the contraction: for each contracted cycle, drop the one cycle edge whose destination receives the new external edge |

> The recursion bottoms out at a graph with no cycle in the chosen-edges set.

#### Implementation (Chu-Liu / Edmonds, O(V·E))

```python
def min_arborescence(n, edges, root):
    """edges: list of (u, v, w). Returns (cost, edges_in_tree) or None if no arborescence."""
    # work on a copy
    INF = float('inf')
    in_edge = [None] * n; in_w = [INF] * n            # min in-edge per vertex
    cost = 0

    while True:
        for v in range(n):
            if v == root: continue
            in_w[v] = INF; in_edge[v] = None
        for i, (u, v, w) in enumerate(edges):
            if v != root and w < in_w[v]:
                in_w[v] = w; in_edge[v] = i
        # check existence
        for v in range(n):
            if v != root and in_edge[v] is None:
                return None
        cost = sum(in_w[v] for v in range(n) if v != root)

        # detect cycles in the in-edge relation
        comp = [-1] * n; idx = [-1] * n; cnt = 0
        for v in range(n):
            if v == root: continue
            chain = []; u = v
            while u != root and idx[u] == -1 and comp[u] == -1:
                idx[u] = v; chain.append(u)
                u = edges[in_edge[u]][0]
            if u != root and idx[u] == v:
                # found a cycle
                while True:
                    w = chain.pop(); comp[w] = cnt
                    if w == u: break
                cnt += 1
            for w in chain: comp[w] = -2

        if cnt == 0:
            return cost, [in_edge[v] for v in range(n) if v != root]

        # rename non-cycle vertices to fresh ids
        for v in range(n):
            if comp[v] == -2:
                comp[v] = cnt; cnt += 1
        if comp[root] == -1: comp[root] = cnt; cnt += 1

        # rebuild edges in the contracted graph
        new_edges = []
        for i, (u, v, w) in enumerate(edges):
            cu, cv = comp[u], comp[v]
            if cu != cv:
                new_w = w - (in_w[v] if comp[v] != cnt else 0)
                # ↑ subtract incoming-cycle-edge weight if v was in a contracted cycle
                new_edges.append((cu, cv, new_w))
        edges = new_edges
        n = cnt
        root = comp[root]
```

> The above is one of several presentations; **Tarjan's O(E + V log V)** version uses meldable heaps (Fibonacci) to track minimum-incoming for each component.

#### Use cases

| Application | Reason |
|---|---|
| Multicast / broadcast trees | Source → all reachable; minimize total bandwidth |
| Dependency-graph reduction | "Cheapest" assembly schedule with directed dependencies |
| **Dependency parsing in NLP** | McDonald et al.; directed MST over candidate parses |
| Optimum branchings in DAGs | Special case (no cycles → trivial) |
| Network upgrade with directed link costs | Plan minimal directed reach |
| Phylogenetic tree (rooted) | Most-parsimonious directed tree |

#### Edmonds' vs MST (undirected)

| Property | MST (Kruskal / Prim) | Edmonds' arborescence |
|---|---|---|
| Graph | Undirected | **Directed** |
| Greedy on edges | ✓ | ✗ — must consider cycles |
| Time | O(E log E) | O(V·E) or O(E + V log V) |
| Output | Tree (V − 1 edges, undirected) | Arborescence (V − 1 edges, directed) |
| Root specified | No | **Yes** |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Treating directed graph as undirected | Wrong tree weights; use Edmonds' |
| Forgetting unreachable vertices | If some vertex has no path from root, no arborescence exists |
| Multiple-edge handling | Keep only the lightest in-edge per `(u, v)` pair |
| Contraction without weight adjustment | After contraction, weights to the super-node must subtract the chosen in-edge weight to the cycle |
| Implementing on n = 10⁵ in pure Python | Use C++ or PyPy |
| Confusing arborescence with branching | A **branching** is a forest of arborescences; same algorithm, no specified root |

#### Variants

| Variant | What |
|---|---|
| **Min spanning branching** | No fixed root — min-weight forest where each tree is an arborescence |
| **Max spanning arborescence** | Negate weights, run Edmonds' |
| **K-best arborescences** | Iterative subtraction / parametric algorithms |
| **Approx Steiner arborescence** | NP-hard with terminal subset; use approximation |
| **Online arborescence** | Specialized variants for streaming graphs |

#### Complexity

| Op | Cost |
|---|---|
| Edmonds' (Chu-Liu) | O(V·E) |
| Tarjan's improvement | O(E + V log V) |
| Memory | O(V + E) |
| Sparse graph | Same complexity bound applies |

**Rule of thumb:** **Edmonds' = directed MST**. Every non-root vertex picks its **cheapest incoming edge**; if cycles form, contract and recurse. Don't reach for Kruskal / Prim on directed graphs — they're wrong. Standard time **O(V·E)** is fine for most contest sizes; for huge graphs, use **Tarjan's O(E + V log V)** version. Major application: **NLP dependency parsing**.
