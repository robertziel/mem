### Dijkstra (single-source shortest path, non-negative weights, heap)

**When:** shortest path from one source to all (or one) destination, with **non-negative** edge weights. Wrong for negative edges — use Bellman-Ford instead.

**Schema:**

| Component | Detail |
|---|---|
| `dist[u]` | Best known distance from source (initially ∞, source = 0) |
| Priority queue | Min-heap of `(dist[u], u)` |
| Visited / settled | Optional set; can also use **stale-entry guard** instead |
| Invariant | When you pop `u`, `dist[u]` is final |

**Why non-negative:** Dijkstra commits a distance as final on pop. A later negative edge could improve it, breaking the commitment.

**Template (with stale-entry guard, no decrease-key needed):**

```python
import heapq
def dijkstra(graph, src):
    dist = {src: 0}
    pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist.get(u, float('inf')): continue   # stale entry — skip
        for v, w in graph[u]:
            nd = d + w
            if nd < dist.get(v, float('inf')):
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    return dist
```

> The stale-entry guard `if d > dist[u]: continue` skips outdated heap entries — that's why we don't need a separate decrease-key.

**With path reconstruction:**

```python
def dijkstra_path(graph, src, dst):
    dist = {src: 0}; parent = {src: None}
    pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if u == dst: break
        if d > dist[u]: continue
        for v, w in graph[u]:
            nd = d + w
            if nd < dist.get(v, float('inf')):
                dist[v] = nd; parent[v] = u
                heapq.heappush(pq, (nd, v))
    # walk back
    path = []
    while dst is not None:
        path.append(dst); dst = parent.get(dst)
    return path[::-1], dist.get(path[0], float('inf'))
```

**Early exit when only one target:** stop popping once you pop `dst`.

**Complexity:**

| Implementation | Time | Space |
|---|---|---|
| Binary heap (Python `heapq`) | O((V + E) log V) | O(V) |
| Fibonacci heap (theoretical) | O(E + V log V) | O(V) |
| O(V²) on dense + matrix | O(V²) | O(V²) |

**0-1 BFS replaces Dijkstra** when all weights ∈ {0, 1}: linear time with a deque.

**Patterns map:**

| Problem | Setup |
|---|---|
| Network delay time | Standard Dijkstra; answer = max of all `dist[v]` |
| Cheapest flights with K stops | Modify state to `(node, stops_used)`; or Bellman-Ford bounded |
| Path with min effort (max-edge minimization) | Replace `+` with `max` in relaxation |
| Swim in rising water | "Cost" = max elevation along path |
| Shortest path in matrix | 4-neighbor implicit graph |
| Modified shortest path with constraints | Add to state tuple (e.g., `(dist, used_pass)`) |

**Variant — minimize max-edge along path (modified relaxation):**

```python
# dist[v] = the smallest "max edge" you'd ever encounter on a path src→v
import heapq
def min_max_edge(graph, src):
    best = {src: 0}
    pq = [(0, src)]
    while pq:
        m, u = heapq.heappop(pq)
        if m > best[u]: continue
        for v, w in graph[u]:
            nm = max(m, w)
            if nm < best.get(v, float('inf')):
                best[v] = nm
                heapq.heappush(pq, (nm, v))
    return best
```

**Pitfalls:**

| Mistake | Fix |
|---|---|
| Negative edges | Use Bellman-Ford |
| Marking visited on push (instead of pop) | Wrong distances; mark on **pop** (or use stale-entry guard) |
| Not adding stale-entry guard | Each node's "final" pop wastes time |
| Reusing the same `dist` after early exit | Other vertices' `dist` are not final |
| Mutable state in heap entries | Use immutable `(dist, node)` tuples |

**Rule of thumb:** Dijkstra = **non-negative weights, single source**. Stale-entry guard avoids decrease-key. For weights ∈ {0,1} use **0-1 BFS** (linear). For negatives, **Bellman-Ford**. For all-pairs on dense small graphs, **Floyd-Warshall**.
