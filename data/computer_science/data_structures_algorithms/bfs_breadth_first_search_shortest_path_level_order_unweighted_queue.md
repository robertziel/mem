### BFS (Breadth-First Search)

**When:** shortest path on **unweighted** graphs, level-order traversal, "minimum number of steps", connected components, bipartite check, word-ladder / maze.

**Schema:**

| Component | Detail |
|---|---|
| Frontier | FIFO queue (`collections.deque`) |
| Mark visited | **On push, not on pop** (avoids duplicate enqueues) |
| Distance / parent | Tracked alongside or in a dict |
| Termination | Queue empty, or target found |

**BFS template:**

```python
from collections import deque
def bfs(graph, src):
    dist = {src: 0}
    q = deque([src])
    while q:
        u = q.popleft()
        for v in graph[u]:
            if v not in dist:                    # mark on push
                dist[v] = dist[u] + 1
                q.append(v)
    return dist
```

**BFS with target (early exit):**

```python
def shortest_path(graph, src, dst):
    if src == dst: return 0
    seen = {src}
    q = deque([(src, 0)])
    while q:
        u, d = q.popleft()
        for v in graph[u]:
            if v == dst: return d + 1
            if v not in seen:
                seen.add(v); q.append((v, d + 1))
    return -1
```

**Level-order (process one level at a time):**

```python
q = deque([root]) if root else deque()
levels = []
while q:
    level = []
    for _ in range(len(q)):                      # snapshot length
        u = q.popleft()
        level.append(u)
        for v in graph[u]:
            if v not in seen:
                seen.add(v); q.append(v)
    levels.append(level)
```

**Reconstruct path with parent map:**

```python
parent = {src: None}
q = deque([src])
while q:
    u = q.popleft()
    if u == dst: break
    for v in graph[u]:
        if v not in parent:
            parent[v] = u; q.append(v)

path = []
while dst is not None:
    path.append(dst); dst = parent[dst]
return path[::-1]
```

**Multi-source BFS (start from many sources at once):**

```python
# Distance from each cell to the nearest "1" in a grid
q = deque()
dist = [[float('inf')] * cols for _ in range(rows)]
for r in range(rows):
    for c in range(cols):
        if grid[r][c] == 1:
            dist[r][c] = 0; q.append((r, c))
while q:
    r, c = q.popleft()
    for dr, dc in [(-1,0),(1,0),(0,-1),(0,1)]:
        nr, nc = r+dr, c+dc
        if 0 <= nr < rows and 0 <= nc < cols and dist[nr][nc] > dist[r][c] + 1:
            dist[nr][nc] = dist[r][c] + 1
            q.append((nr, nc))
```

**0-1 BFS** (weights ∈ {0, 1}): use a **deque**, push 0-weight to front, 1-weight to back. Linear time, like BFS but for binary weights.

**Bipartite check (2-color):**

```python
def is_bipartite(graph, n):
    color = [-1] * n
    for s in range(n):
        if color[s] != -1: continue
        color[s] = 0; q = deque([s])
        while q:
            u = q.popleft()
            for v in graph[u]:
                if color[v] == -1:
                    color[v] = 1 - color[u]; q.append(v)
                elif color[v] == color[u]:
                    return False
    return True
```

**Patterns map:**

| Problem | BFS variant |
|---|---|
| Shortest path, unit weights | Standard BFS |
| Min steps in maze / grid | BFS from start |
| Word ladder | BFS over implicit word graph |
| Number of islands | BFS / DFS for each unvisited cell |
| Rotting oranges (multi-source) | Multi-source BFS |
| Knight's shortest path on board | BFS with 8 moves |
| Tree level order | BFS with level snapshot |
| Right side view / level averages | BFS with level snapshot |
| Bipartite graph check | BFS 2-coloring |
| Cheapest flights ≤ K stops | BFS with state `(node, stops)` (or Bellman-Ford) |

**Complexity:** O(V + E) time, O(V) space.

**Pitfalls:**

| Mistake | Fix |
|---|---|
| Marking visited on pop | Same node pushed many times; use **mark on push** |
| BFS for weighted shortest path | Wrong — only correct for unit weights; use Dijkstra |
| Not tracking distance / parent | Add `dist` map or `(node, depth)` tuples |
| Confusing "level" with "step" in implicit graphs | Increment dist when you add to queue, not when you pop |

**Rule of thumb:** BFS = **shortest path in number of edges** on unweighted graphs. **Mark visited on push.** For weights ∈ {0,1}, use **0-1 BFS** with a deque. For arbitrary positive weights, **Dijkstra**.
