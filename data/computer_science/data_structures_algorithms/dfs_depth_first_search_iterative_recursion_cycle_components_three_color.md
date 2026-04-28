### DFS (Depth-First Search, iterative, recursion, cycle, components, three-color)

**When:** explore "all the way down" — cycle detection, topological sort, connected components, paths, bridges/articulation, tree post-order DP.

**Schema:**

| Component | Detail |
|---|---|
| Frontier | LIFO stack (or recursion's call stack) |
| Mark visited | Before / after recursive call (depending on need) |
| Output | Pre-order, post-order, or both |

**Recursive DFS (default):**

```python
def dfs(graph, u, seen):
    seen.add(u)
    for v in graph[u]:
        if v not in seen:
            dfs(graph, v, seen)
```

**Iterative DFS (when recursion depth too large):**

```python
def dfs_iter(graph, src):
    seen = set(); stack = [src]
    while stack:
        u = stack.pop()
        if u in seen: continue
        seen.add(u)
        for v in graph[u]:
            if v not in seen:
                stack.append(v)
```

**Iterative DFS with post-order action (for topo sort, etc.):**

```python
def dfs_post(graph, src):
    seen = set(); stack = [(src, False)]
    order = []
    while stack:
        u, processed = stack.pop()
        if processed: order.append(u); continue
        if u in seen: continue
        seen.add(u)
        stack.append((u, True))                  # post-order placeholder
        for v in graph[u]:
            if v not in seen:
                stack.append((v, False))
    return order                                 # post-order
```

**Cycle detection — directed graph (3-color):**

```python
WHITE, GRAY, BLACK = 0, 1, 2
def has_cycle_directed(graph, V):
    color = [WHITE] * V
    def dfs(u):
        color[u] = GRAY
        for v in graph[u]:
            if color[v] == GRAY: return True     # back edge → cycle
            if color[v] == WHITE and dfs(v): return True
        color[u] = BLACK
        return False
    return any(color[u] == WHITE and dfs(u) for u in range(V))
```

**Cycle detection — undirected graph (parent pointer):**

```python
def has_cycle_undirected(graph, V):
    seen = set()
    def dfs(u, parent):
        seen.add(u)
        for v in graph[u]:
            if v not in seen:
                if dfs(v, u): return True
            elif v != parent:                    # back edge to non-parent
                return True
        return False
    return any(u not in seen and dfs(u, -1) for u in range(V))
```

**Connected components count:**

```python
def count_components(graph, V):
    seen = set(); count = 0
    for u in range(V):
        if u not in seen:
            count += 1; dfs(graph, u, seen)
    return count
```

**Bridges (Tarjan low-link):**

```python
def bridges(graph, V):
    timer = [0]
    disc = [0] * V; low = [0] * V; seen = [False] * V
    res = []
    def dfs(u, parent):
        seen[u] = True
        timer[0] += 1
        disc[u] = low[u] = timer[0]
        for v in graph[u]:
            if not seen[v]:
                dfs(v, u)
                low[u] = min(low[u], low[v])
                if low[v] > disc[u]:             # bridge condition
                    res.append((u, v))
            elif v != parent:
                low[u] = min(low[u], disc[v])
    for u in range(V):
        if not seen[u]: dfs(u, -1)
    return res
```

**Patterns map:**

| Problem | DFS use |
|---|---|
| Connected components | DFS each unseen vertex |
| Cycle in directed graph | DFS 3-color |
| Cycle in undirected graph | DFS with parent pointer |
| Topological sort | DFS post-order, reversed |
| Number of islands | DFS per unvisited land cell |
| Path exists from A to B | DFS with target check |
| All paths from A to B (DAG) | DFS with backtracking |
| Strongly connected components | Tarjan / Kosaraju (DFS-based) |
| Bridges / articulation points | DFS with low-link |
| Tree DP (diameter, etc.) | Post-order returning multiple values |

**DFS vs BFS:**

| Aspect | DFS | BFS |
|---|---|---|
| Data structure | Stack (or recursion) | Queue |
| Memory | O(h) — depth | O(w) — width |
| Shortest path (unweighted) | ✗ Wrong — first found ≠ shortest | ✓ Correct |
| Cycle detection | ✓ Natural | Possible but awkward |
| Topological sort | ✓ Post-order | ✓ Kahn |
| Tree post-order DP | ✓ Natural | Awkward |

**Pitfalls:**

| Mistake | Fix |
|---|---|
| Recursion overflow on huge graph | Switch to iterative DFS with explicit stack |
| Marking visited only after popping (iterative) | Skip already-seen nodes when popping |
| Confusing back-edge vs cross-edge | Use 3-color: gray = on current DFS path |
| Counting parent as cycle in undirected | Pass `parent` and skip `v == parent` |

**Rule of thumb:** DFS for **paths, components, cycles, topo, post-order DP**. **Three-color** for directed cycle detection. **Switch to iterative** when V > ~10⁴ to avoid stack overflow (Python default limit = 1000).
