### Eulerian Path / Circuit (Hierholzer's algorithm, bridges, Chinese postman)

**When:** find a path / circuit that uses **every edge exactly once** — DNA assembly (de Bruijn graphs), one-stroke drawing, mailman / street-sweeping routing, Chinese Postman Problem, certain puzzle solvers.

**Schema (existence conditions):**

| Goal | Undirected graph | Directed graph |
|---|---|---|
| Eulerian **circuit** (closed) | Every vertex has **even** degree, AND graph is connected (over edges) | Every vertex has **in-degree = out-degree**, AND graph is **strongly connected** (over edges) |
| Eulerian **path** (open) | Exactly **0 or 2** vertices have odd degree; if 2, path runs between them | Exactly **0 or 1** with `in − out = +1` and **0 or 1** with `out − in = +1`; path runs from the latter to the former |
| Neither | Otherwise | Otherwise |

> Eulerian = "every edge once". Hamiltonian = "every vertex once" (NP-hard, completely different).

#### Hierholzer's algorithm

| Step | Action |
|---|---|
| 1 | Start at any vertex with non-zero degree (or specifically, the odd-degree start for an Eulerian path) |
| 2 | Walk a tour, removing edges as you go, until you can't move (back at start, or at the end vertex) |
| 3 | If unused edges remain, find a vertex on the current tour that still has incident edges, and splice a sub-tour starting there into the main tour |
| 4 | Repeat step 3 until all edges are used |

#### Implementation (undirected, in-place edge removal)

```python
def euler_circuit(adj_lists, n, start=0):
    """
    adj_lists[u] = list of (v, edge_id); edges stored as ids to avoid double-count.
    Returns list of vertices in Euler circuit order, or None if no circuit.
    """
    used = [False] * (sum(len(a) for a in adj_lists) // 2)
    stack = [start]
    circuit = []
    pointer = [0] * n                                  # current iter position per vertex
    while stack:
        u = stack[-1]
        # advance to the next unused edge from u
        while pointer[u] < len(adj_lists[u]) and used[adj_lists[u][pointer[u]][1]]:
            pointer[u] += 1
        if pointer[u] == len(adj_lists[u]):
            circuit.append(u); stack.pop()
        else:
            v, eid = adj_lists[u][pointer[u]]
            used[eid] = True
            stack.append(v)
    if any(not u for u in used): return None           # disconnected
    return circuit[::-1]
```

> Iterative Hierholzer using a vertex stack and a per-vertex pointer = **O(V + E)**. The pointer trick is essential — without it, Python's deletion is too slow.

#### Directed-graph variant

Same idea; track outgoing edges and walk forward only. Use `in_deg[v] == out_deg[v]` precondition and pick the right start (the unique vertex with `out − in = 1` for a path; otherwise any vertex on the tour).

#### Chinese Postman Problem (CPP)

**When:** traverse every edge at least once, minimizing total weight. Classic mail-route / snow-plow problem.

| Graph | Algorithm |
|---|---|
| Eulerian (all even / in = out) | Just an Euler circuit; total = sum of weights |
| Has 2k odd-degree vertices | Find min-weight perfect matching among odd-degree vertices; **double** those edges; resulting graph is Eulerian |
| Directed | Min-cost flow on the imbalance graph |
| Mixed (directed + undirected) | NP-hard in general |

#### De Bruijn graph (genome assembly)

Treat each (k-1)-mer as a vertex; each k-mer as an edge. **Eulerian path** = string that contains every k-mer once. Used in genome assembly with NGS reads.

#### Bridge-finding (related, not the same)

A **bridge** is an edge whose removal disconnects the graph. Tarjan's DFS with low-link finds them in O(V + E). Eulerian / Hierholzer doesn't need bridge-finding directly, but **Fleury's algorithm** (an alternative to Hierholzer) avoids crossing bridges.

#### Use cases

| Problem | Use |
|---|---|
| Snow-plow route covering every street | Chinese Postman |
| One-stroke drawing puzzle | Existence: degree check; construction: Hierholzer |
| Genome assembly from k-mers | De Bruijn + Eulerian path |
| Codeforces / contest "is it possible to traverse all edges" | Existence check + Hierholzer |
| Print all bridges | Tarjan low-link (different problem) |
| Word ladder closures (every pair of consecutive words differ by one) | Eulerian path |
| Domino arrangement (each domino once) | Multigraph Eulerian path on digit nodes |

#### Hierholzer vs Fleury

| Aspect | Hierholzer | Fleury |
|---|---|---|
| Time | **O(V + E)** | O(E²) |
| Implementation | Stack + pointer | Repeated bridge check |
| Default | ✓ | Educational only |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Linear scan / `list.remove(...)` per edge | O(V·E) worst — use **per-vertex pointer** |
| Confusing Eulerian (edges) with Hamiltonian (vertices) | Eulerian is polynomial; Hamiltonian is NP-complete |
| Forgetting connectivity precondition | Vertices with edges must form one component |
| Building circuit in correct order | Hierholzer's stack produces **reverse** order — reverse before returning |
| Multi-graph (parallel edges) | Use edge IDs, not (u, v) pairs, to track usage |
| Self-loops | Each contributes 2 to degree — still must be even |
| Directed graph with isolated SCCs | All edges must lie in one SCC (over edges) |

#### Complexity

| Op | Cost |
|---|---|
| Existence check (degree-counting + connectivity BFS) | O(V + E) |
| Hierholzer construction | O(V + E) |
| Chinese postman (general) | Bipartite matching on odd vertices: O(V³) for Floyd + Hungarian / blossom |
| Memory | O(V + E) |

**Rule of thumb:** **Eulerian = every edge once**. Existence: **all even degrees** (undirected) or **in = out** (directed) plus connectivity over edges. Construction: **Hierholzer in O(V + E)** with a **stack and per-vertex pointer**. For minimum-cost edge-cover, that's **Chinese Postman**: turn the graph Eulerian by doubling a min-weight matching among odd-degree vertices.
