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

#### Implementation — Chu-Liu loop skeleton

```python
def min_arborescence(n, edges, root):
    while True:
        # 1. each non-root v picks its cheapest incoming edge
        in_edge = [None] * n; in_w = [float('inf')] * n
        for i, (u, v, w) in enumerate(edges):
            if v != root and w < in_w[v]:
                in_w[v] = w; in_edge[v] = i
        if any(in_edge[v] is None for v in range(n) if v != root):
            return None                               # not all reachable

        # 2. detect cycles among chosen edges; if none, we have the arborescence
        cycles = find_cycles_in(in_edge)              # returns list of cycle node-sets
        if not cycles:
            return sum(in_w[v] for v in range(n) if v != root)

        # 3. contract each cycle into a super-node; adjust weights
        edges, n, root = contract(edges, cycles, in_w, root)
```

| Step | Detail |
|---|---|
| **Pick min in-edge** | `in_edge[v] = argmin_w (u, v) edges` |
| **Cycle detection** | Walk `in_edge` chain backwards from each `v`; mark visit-order |
| **Contraction** | Merge cycle into one node; adjust each external edge's weight by `−in_w[dest]` for its cycle entry |
| **Recurse** | On the smaller (contracted) graph |
| **Expansion** | After base case, for each contracted cycle drop the one cycle edge whose destination receives the new external in-edge |

> Tarjan's **O(E + V log V)** version uses meldable heaps (Fibonacci) to track minimum-incoming for each component.

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
