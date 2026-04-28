### Minimum Spanning Tree (MST — Kruskal, Prim)

**When:** connect all V vertices with V-1 edges of **minimum total weight**, on a connected, undirected, weighted graph. Two algorithms — same answer, different mechanics.

**Schema:**

| Property | MST has |
|---|---|
| Edges | Exactly V - 1 |
| Cycle-free | Spanning **tree**, no cycles |
| Connectivity | All V vertices reachable |
| Weight | **Minimum total** among all spanning trees |
| Uniqueness | Unique iff all edge weights distinct |

**Both algorithms are greedy and provably optimal** (cut property: the lightest edge crossing any cut is in some MST).

**Kruskal vs Prim:**

| Aspect | Kruskal | Prim |
|---|---|---|
| Mechanism | Sort all edges; pick lightest non-cycling | Grow one tree from a starting node |
| Data structure | **Edge list + Union-Find** | **Adjacency list + min-heap** |
| Time | O(E log E) | O(E log V) |
| Best for | **Sparse** graphs (E ≈ V) | **Dense** graphs (E ≈ V²) |
| Output edges in… | Sorted weight order | Order of attachment |
| Connected component requirement | Works on disconnected (returns minimum spanning forest) | Requires connected graph |

**Kruskal (sort + DSU):**

```python
def kruskal(V, edges):
    edges.sort(key=lambda e: e[2])              # ascending by weight
    parent = list(range(V)); rank = [0] * V
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    def union(x, y):
        rx, ry = find(x), find(y)
        if rx == ry: return False
        if rank[rx] < rank[ry]: rx, ry = ry, rx
        parent[ry] = rx
        if rank[rx] == rank[ry]: rank[rx] += 1
        return True

    cost = 0; mst = []
    for u, v, w in edges:
        if union(u, v):
            cost += w; mst.append((u, v, w))
            if len(mst) == V - 1: break
    return cost, mst
```

**Prim (start node + min-heap):**

```python
import heapq
def prim(graph, V, src=0):
    in_mst = [False] * V
    pq = [(0, src)]                              # (weight, node)
    cost = 0; edges_added = 0
    while pq and edges_added < V:
        w, u = heapq.heappop(pq)
        if in_mst[u]: continue
        in_mst[u] = True
        cost += w; edges_added += 1
        for v, vw in graph[u]:
            if not in_mst[v]:
                heapq.heappush(pq, (vw, v))
    return cost if edges_added == V else None    # None ⇒ disconnected
```

**Patterns map:**

| Problem | MST trick |
|---|---|
| Min cost to connect all cities | Standard MST |
| Min cost to connect points (Manhattan distance) | Compute pairwise edges (V²); Kruskal or Prim |
| Min cost to connect with optional new edges | Add new edges with their cost; MST as usual |
| Critical / pseudo-critical edges in MST | Run MST forcing each edge in / out; compare cost |
| Maximum spanning tree | Sort descending in Kruskal, or negate weights in Prim |
| Min spanning forest (disconnected) | Kruskal naturally yields this |
| Bottleneck path (min of max edges) | MST works — any tree path is bottleneck-optimal |
| Connect components with minimum cost | Kruskal across components (already a forest at start) |

**Cut property (the proof intuition):**

> For any partition of vertices into two non-empty sets, the **minimum-weight edge crossing the cut is in some MST**.

Both Kruskal (taking the global minimum that doesn't make a cycle) and Prim (taking the minimum edge crossing the current frontier cut) are direct applications.

**Cycle property (the dual):**

> The **maximum-weight edge in any cycle is NOT in any MST** (you can always swap it out for a lighter cycle edge).

**Boruvka's algorithm (third option, parallelism-friendly):** in each round, every component picks its lightest outgoing edge; merge. O(E log V), O(log V) rounds — used in distributed / parallel implementations.

**Complexity comparison (recap):**

| Algorithm | Time | Space |
|---|---|---|
| Kruskal | O(E log E) ≈ O(E log V) | O(V + E) |
| Prim (binary heap) | O(E log V) | O(V + E) |
| Prim (Fibonacci heap) | O(E + V log V) | O(V + E) |
| Boruvka | O(E log V) | O(V + E) |

**Pitfalls:**

| Mistake | Fix |
|---|---|
| Kruskal without DSU (re-checking each cycle) | Use Union-Find for O(α) cycle test |
| Prim without `in_mst` check on pop | Each node may be pushed multiple times; skip if already in MST |
| Running on directed graph | MST is for **undirected** graphs (for directed, see arborescence / Edmonds') |
| Forgetting MST is unique only with distinct weights | Tie-break consistently if you need a specific MST |

**Rule of thumb:** **Kruskal for sparse + edge list, Prim for dense + adjacency list**. Both are greedy, both are O(E log V). The recurring trick: **MST also gives the bottleneck path** (path minimizing max edge weight).
