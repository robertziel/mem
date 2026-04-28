### A* Search (heuristic, admissible, consistent, pathfinding, Dijkstra extension)

**When:** shortest path with a useful heuristic — game pathfinding, robotics, sliding puzzles, route planning. Dijkstra explores blindly; A* explores **toward the goal** using a heuristic estimate.

**Schema:**

| Symbol | Meaning |
|---|---|
| `g(n)` | Cost from start to `n` (known) |
| `h(n)` | Heuristic estimate of cost from `n` to goal |
| `f(n) = g(n) + h(n)` | Priority key in the open set |
| Open set | Min-heap keyed by `f` |
| Closed set | Settled nodes (`g(n)` is final) |

**Heuristic properties:**

| Property | Definition | Guarantee |
|---|---|---|
| **Admissible** | `h(n) ≤ true cost from n to goal` (never overestimates) | A* finds the **optimal** path |
| **Consistent (monotone)** | `h(n) ≤ cost(n, n') + h(n')` for every neighbor `n'` | A* never re-opens a closed node |
| Zero | `h(n) = 0` always | A* degenerates to Dijkstra |
| Inadmissible | Overestimates sometimes | Faster but **not guaranteed** optimal |

> Consistent ⇒ admissible. Most reasonable heuristics (Manhattan / Euclidean / Chebyshev) on grids are both.

**Standard heuristics:**

| Movement | Heuristic | Formula |
|---|---|---|
| 4-direction grid | Manhattan | `|x₁-x₂| + |y₁-y₂|` |
| 8-direction grid (uniform cost) | Chebyshev | `max(|x₁-x₂|, |y₁-y₂|)` |
| Free 2D / Euclidean | Euclidean | `√((x₁-x₂)² + (y₁-y₂)²)` |
| 8-puzzle | Misplaced tiles or Manhattan sum | Per-tile distance |
| Graph with landmarks | ALT (A* + Landmarks + Triangle ineq.) | `|d(L, n) - d(L, goal)|` |

**Template:**

```python
import heapq
def a_star(start, goal, neighbors, h):
    g = {start: 0}
    pq = [(h(start), 0, start)]                  # (f, g, node)
    parent = {start: None}
    while pq:
        f, gn, u = heapq.heappop(pq)
        if u == goal:
            path = []
            while u is not None: path.append(u); u = parent[u]
            return path[::-1], gn
        if gn > g.get(u, float('inf')): continue   # stale (consistent: never triggers)
        for v, w in neighbors(u):
            ng = gn + w
            if ng < g.get(v, float('inf')):
                g[v] = ng; parent[v] = u
                heapq.heappush(pq, (ng + h(v), ng, v))
    return None, float('inf')
```

**A\* on a grid (4-neighbor with Manhattan):**

```python
def grid_a_star(grid, start, goal):
    R, C = len(grid), len(grid[0])
    def h(p): return abs(p[0]-goal[0]) + abs(p[1]-goal[1])
    def neigh(p):
        for dr, dc in ((-1,0),(1,0),(0,-1),(0,1)):
            nr, nc = p[0]+dr, p[1]+dc
            if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 0:
                yield (nr, nc), 1
    return a_star(start, goal, neigh, h)
```

**A\* vs Dijkstra vs BFS:**

| | BFS | Dijkstra | A* |
|---|---|---|---|
| Edge weights | Unit | Non-negative | Non-negative |
| Heuristic | None | None | `h(n)` |
| Goal-directed | No | No | Yes |
| Optimal | Yes | Yes | **Iff `h` is admissible** |
| Time | O(V+E) | O((V+E) log V) | Same as Dijkstra worst case; usually much faster |

**Variants:**

| Variant | Use |
|---|---|
| **IDA*** (iterative deepening A*) | Memory-bounded; useful for puzzles like 15-puzzle |
| **Weighted A*** (`f = g + w·h`, `w > 1`) | Faster, suboptimal-but-bounded |
| **Bidirectional A*** | Search from both ends; meet in the middle |
| **D* / Lite** | Re-plan when graph changes (robotics) |
| **Anytime A*** | Returns a solution quickly, then improves |
| **JPS (Jump Point Search)** | A* on uniform grids; skips colinear nodes |

**Patterns map:**

| Problem | Heuristic |
|---|---|
| Shortest path in maze | Manhattan / Euclidean |
| 8-puzzle / 15-puzzle | Sum of Manhattan distances per tile |
| N-puzzle | Linear conflict + Manhattan |
| Word ladder (with hint) | Letters-different count |
| Robot motion | Distance to goal (Euclidean) |
| Game NPC pathing | Manhattan + tie-breaker |
| Route planning | Great-circle distance / haversine |

**Tie-breaking (when `f(a) == f(b)`):**

| Strategy | Effect |
|---|---|
| Prefer larger `g` (smaller `h`) | Pushes search closer to goal |
| Add small `+ ε · h(n)` to `f` | Breaks ties toward goal-direction |
| Random | Avoids pathological grid patterns |

**Pitfalls:**

| Mistake | Fix |
|---|---|
| Inadmissible heuristic | A* may return suboptimal — verify `h ≤ true cost` |
| Heuristic not consistent | May re-expand nodes; track `closed` set carefully |
| Floating-point `h` causing instability | Use integer heuristics where possible |
| Forgetting tie-breaking | Pathological zig-zags on grids |
| Dijkstra on grid where Manhattan-heuristic A* would be 100× faster | Add the heuristic |

**Complexity:** worst case same as Dijkstra (O((V + E) log V)). With a strong heuristic, the effective branching factor drops dramatically — orders of magnitude faster in practice.

**Rule of thumb:** A* = **Dijkstra + a heuristic**. **Admissible** heuristic ⇒ optimal answer; **consistent** ⇒ no re-opens. On grids, **Manhattan for 4-direction, Chebyshev for 8-direction**. If you don't have a useful heuristic, just use Dijkstra — the heap overhead doesn't pay off without one.
