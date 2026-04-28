### Topological Sort (Kahn / DFS, DAG, dependencies, cycle, indegree)

**When:** order tasks given prerequisites (DAG required). Two equivalent algorithms — pick by need:

| Algorithm | Mechanism | Yields | Detects cycle |
|---|---|---|---|
| **Kahn (BFS)** | Repeatedly remove indegree-0 nodes | Valid topo order | If `len(order) < V` |
| **DFS post-order** | DFS, append on finish, reverse | Reverse post-order | If 3-color sees gray → gray edge |

**Schema (Kahn):**

| Component | Detail |
|---|---|
| `indeg[v]` | Number of incoming edges to `v` |
| Queue | Nodes with `indeg == 0` |
| Order | Append on dequeue |
| Cycle | After loop, if `len(order) < V` |

**Kahn's algorithm (BFS-based):**

```python
from collections import deque, defaultdict
def topo_kahn(graph, V):
    indeg = [0] * V
    for u in range(V):
        for v in graph[u]: indeg[v] += 1
    q = deque(u for u in range(V) if indeg[u] == 0)
    order = []
    while q:
        u = q.popleft()
        order.append(u)
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0: q.append(v)
    return order if len(order) == V else None     # None ⇒ cycle
```

**DFS post-order:**

```python
WHITE, GRAY, BLACK = 0, 1, 2
def topo_dfs(graph, V):
    color = [WHITE] * V
    order = []
    has_cycle = False
    def dfs(u):
        nonlocal has_cycle
        color[u] = GRAY
        for v in graph[u]:
            if color[v] == GRAY: has_cycle = True; return
            if color[v] == WHITE: dfs(v)
        color[u] = BLACK
        order.append(u)
    for u in range(V):
        if color[u] == WHITE: dfs(u)
    return None if has_cycle else order[::-1]
```

**Lexicographically smallest topo order:** replace the queue in Kahn with a min-heap.

```python
import heapq
heap = [u for u in range(V) if indeg[u] == 0]
heapq.heapify(heap)
order = []
while heap:
    u = heapq.heappop(heap)
    order.append(u)
    for v in graph[u]:
        indeg[v] -= 1
        if indeg[v] == 0: heapq.heappush(heap, v)
```

**Patterns map:**

| Problem | Topo trick |
|---|---|
| Course schedule (possible?) | Kahn; cycle if `len(order) < V` |
| Course schedule II (return order) | Kahn returns the order |
| Alien dictionary | Build graph from char comparisons; Kahn / DFS |
| Parallel courses (min semesters) | Layered Kahn — each level is one semester |
| Build order with concurrent workers | Layered Kahn |
| Find all reachable nodes for any source | Reverse-graph DFS / BFS |
| Longest path in DAG | DP in topological order |
| Compile order / dependency resolution | Kahn or DFS |
| SCC (strongly connected components) | Kosaraju: DFS post-order, reverse graph, second DFS |

**Counting topological orders:** number of distinct valid orders. Bitmask DP — `dp[mask]` = number of orders that schedule exactly the set `mask`. O(2ᵛ · V).

**Longest path in DAG (DP in topo order):**

```python
def longest_path(graph, V):
    order = topo_kahn(graph, V)
    dist = [0] * V
    for u in order:
        for v in graph[u]:
            if dist[u] + 1 > dist[v]:
                dist[v] = dist[u] + 1
    return max(dist)
```

**Kahn vs DFS — pick by need:**

| Concern | Kahn | DFS |
|---|---|---|
| Iterative (no stack overflow) | ✓ | Recursive (or convert to iterative) |
| Lexicographically smallest order | ✓ Easy (min-heap) | Awkward |
| Layered output (parallel scheduling) | ✓ Natural — process all indeg-0 at once | Awkward |
| Detect cycle | `len(order) < V` | 3-color: gray → gray |
| Build SCC algorithm (Kosaraju) | ✗ | ✓ Needs DFS post-order |

**Complexity:** O(V + E) for both.

**Pitfalls:**

| Mistake | Fix |
|---|---|
| Running on undirected graph | Topo only on **directed acyclic** graph |
| Forgetting to count nodes processed | Without it, you can't detect cycles |
| Confusing pre-order with post-order in DFS | Topo uses **reverse post-order** |
| Mutating indegrees on shared state | Reset / copy if running multiple times |

**Rule of thumb:** Kahn = **iterative + cycle-detect built in**, DFS = **post-order reversed**. If the problem says "tasks with prerequisites", "course order", "compile order", or "alien language", it's topo. **Cycle test:** Kahn yields fewer than V nodes; DFS sees a back edge.
