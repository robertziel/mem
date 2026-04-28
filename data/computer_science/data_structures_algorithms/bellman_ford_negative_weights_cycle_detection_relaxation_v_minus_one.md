### Bellman-Ford (negative weights, cycle detection, relaxation)

**When:** single-source shortest path with **possibly negative weights**, and / or you need to **detect a negative cycle**. Slower than Dijkstra but handles what Dijkstra can't.

**Schema:**

| Concept | Detail |
|---|---|
| `dist[u]` | Best known distance from source |
| Edge list | All `(u, v, w)` tuples |
| Pass | One sweep over **all** edges, relaxing each |
| #Passes | `V - 1` for shortest paths; one extra to detect negative cycle |
| Relaxation | `if dist[u] + w < dist[v]: dist[v] = dist[u] + w` |

**Why V-1 passes:** any shortest path has at most V-1 edges. Relaxing all edges V-1 times guarantees shortest distances **unless** a negative cycle exists.

**Template:**

```python
def bellman_ford(V, edges, src):
    dist = [float('inf')] * V
    dist[src] = 0
    for _ in range(V - 1):
        updated = False
        for u, v, w in edges:
            if dist[u] != float('inf') and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                updated = True
        if not updated: break              # early exit (no improvement)
    # one more pass — if anything still relaxes, negative cycle exists
    for u, v, w in edges:
        if dist[u] != float('inf') and dist[u] + w < dist[v]:
            return None                    # negative cycle reachable from src
    return dist
```

**With path reconstruction:**

```python
parent = [-1] * V
# ... in relaxation
parent[v] = u
```

Walk `parent` backward from `dst` to `src` for the path.

**Complexity:**

| Aspect | Cost |
|---|---|
| Time | O(V · E) |
| Space | O(V) |
| Edge structure | Edge list — no need for adjacency list |

**Bellman-Ford vs Dijkstra:**

| Property | Dijkstra | Bellman-Ford |
|---|---|---|
| Negative edges | ✗ Wrong | ✓ Handles |
| Negative cycle | N/A | ✓ Detects |
| Time | O((V+E) log V) | O(V·E) |
| Data structure | Min-heap | Edge list |
| Distributed-friendly | No | **Yes** (basis for distance-vector routing protocols, e.g., RIP) |

**SPFA (Shortest Path Faster Algorithm — queue-based optimization):**

```python
from collections import deque
def spfa(graph, V, src):
    dist = [float('inf')] * V
    dist[src] = 0
    in_queue = [False] * V; count = [0] * V
    q = deque([src]); in_queue[src] = True
    while q:
        u = q.popleft(); in_queue[u] = False
        for v, w in graph[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                count[v] += 1
                if count[v] >= V: return None    # negative cycle
                if not in_queue[v]:
                    q.append(v); in_queue[v] = True
    return dist
```

> Average-case faster than Bellman-Ford; worst case is the same. Adversarial inputs can force O(V·E).

**Bounded version — at most K edges:**

```python
def at_most_k_edges(V, edges, src, dst, K):
    dist = [float('inf')] * V
    dist[src] = 0
    for _ in range(K):
        prev = dist[:]                     # snapshot — relax with prev only
        for u, v, w in edges:
            if prev[u] + w < dist[v]:
                dist[v] = prev[u] + w
    return dist[dst] if dist[dst] != float('inf') else -1
```

**Patterns map:**

| Problem | Bellman-Ford trick |
|---|---|
| Cheapest flights ≤ K stops | Bounded K+1 passes with snapshot |
| Currency arbitrage (negative log of rates) | Detect negative cycle in product-of-rates → log gives sum |
| Constraint propagation (difference constraints) | Convert to graph; check feasibility = no negative cycle |
| Distance-vector routing | Each node runs Bellman-Ford locally |
| Shortest path with one negative edge | Same as general — Dijkstra is wrong |

**Detect negative cycle anywhere (not just reachable from src):**

```python
# Add a virtual source connected to every node with weight 0; run BF from it
edges_aug = edges + [(V, u, 0) for u in range(V)]
return bellman_ford(V + 1, edges_aug, V) is None
```

**Pitfalls:**

| Mistake | Fix |
|---|---|
| Forgetting `dist[u] != ∞` guard | Adding ∞ + w wraps weirdly; must guard |
| Mixing iterations (no snapshot in bounded variant) | Use `prev = dist[:]` for bounded-edge variant |
| Treating all negatives the same | A negative edge is fine; a **negative cycle reachable from src** makes shortest path undefined |
| Using on a graph with 10⁶ edges | O(V·E) is too slow — use Dijkstra if no negatives |

**Rule of thumb:** Bellman-Ford = **handle negatives + detect negative cycles**. Use it for **bounded-K shortest path** (with snapshot) and **constraint problems** like currency arbitrage. If no negative weights — just use Dijkstra.
