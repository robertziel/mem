### Bidirectional Dijkstra (meet-in-the-middle, shortest path, two searches)

**When:** shortest path between **two specific nodes** `s, t` on a non-negative-weighted graph — much faster than running full Dijkstra from `s`. Used in route planning, navigation (with A* or contraction hierarchies).

**Schema:**

| Concept | Detail |
|---|---|
| **Forward search** | Standard Dijkstra from `s` (on original graph) |
| **Backward search** | Dijkstra from `t` (on **reversed** graph; or treat edges as if entering `t`) |
| **Meeting point** | Some vertex `m` settled by both sides |
| **Best path** | `min over m of (dist_F[m] + dist_B[m])` after they meet |
| **Termination** | When the sum of mins of the two priority queues exceeds the current best, stop |

> Intuition: standard Dijkstra explores a "ball" of radius `d(s, t)` around `s`. Bidirectional explores **two smaller balls** (radius `d(s, t) / 2` each) — exponentially fewer nodes when branching is uniform.

#### Implementation

```python
import heapq
INF = float('inf')

def bidirectional_dijkstra(graph, rev_graph, s, t):
    if s == t: return 0
    dist_f = {s: 0}; dist_b = {t: 0}
    pq_f = [(0, s)];  pq_b = [(0, t)]
    settled_f = set(); settled_b = set()
    best = INF

    while pq_f and pq_b:
        # Termination: if sum of front mins ≥ best, no improvement possible
        if pq_f[0][0] + pq_b[0][0] >= best: break

        # Pick the smaller side to process this step (alternation works too)
        if pq_f[0][0] <= pq_b[0][0]:
            d, u = heapq.heappop(pq_f)
            if u in settled_f: continue
            settled_f.add(u)
            if u in dist_b: best = min(best, d + dist_b[u])
            for v, w in graph[u]:
                nd = d + w
                if nd < dist_f.get(v, INF):
                    dist_f[v] = nd
                    heapq.heappush(pq_f, (nd, v))
        else:
            d, u = heapq.heappop(pq_b)
            if u in settled_b: continue
            settled_b.add(u)
            if u in dist_f: best = min(best, d + dist_f[u])
            for v, w in rev_graph[u]:
                nd = d + w
                if nd < dist_b.get(v, INF):
                    dist_b[v] = nd
                    heapq.heappush(pq_b, (nd, v))

    return best if best < INF else None
```

> **Reversed graph:** for directed graphs, the backward search runs on the **graph with edges reversed** (`rev_graph[u].append((v, w))` for each original edge `v → u`).

#### Why the meeting test must consider all m

It's tempting to terminate as soon as a vertex appears in both `dist_f` and `dist_b`. **That's wrong.** The correct path through `m` may be `dist_f[m] + dist_b[m]`, which can be larger or smaller than another `m'`. The proper termination is:

> **When `top(pq_f).dist + top(pq_b).dist ≥ best`, stop.** No path through any unprocessed node can beat the current best.

#### Bidirectional vs alternatives

| Algorithm | Constraint | Practical speedup over plain Dijkstra |
|---|---|---|
| **Bidirectional Dijkstra** | Single pair `(s, t)` | ~√ speedup (2× on uniform branching) |
| **A\*** | Single pair, good heuristic | Up to orders of magnitude (with strong `h`) |
| **Bidirectional A\*** | Single pair, **consistent heuristic** | Combines both — fastest practical |
| **Contraction hierarchies** (preprocessed) | Static graphs (road networks) | Microsecond queries on continental graphs |
| **ALT (A\* with landmarks)** | Static graphs | Strong heuristic via triangle inequality |

#### Bidirectional A* — pitfalls

For A* in both directions to be correct, the heuristics from each side must be **consistent**. A common technique:

```
h_f(v) = (h_forward(v) − h_backward(v) + h_backward(s)) / 2
h_b(v) = (h_backward(v) − h_forward(v) + h_forward(t)) / 2
```

Most implementations **don't get this right** — be careful.

#### Use cases

| Problem | Reason for bidirectional |
|---|---|
| Driving directions between two cities | Single pair, large graph |
| Subway / route shortest path | Same |
| Computer network shortest path with high diameter | Halves explored nodes |
| Word ladder between two specific words | Implicit large graph |
| Game pathfinding when goal is fixed | Pair query |
| Edit-distance shortest edit sequence (when modeled as graph) | Bidirectional shaves work |

#### When NOT to use

| Situation | Use instead |
|---|---|
| Single-source-many-targets | Plain Dijkstra (full SSSP) |
| Static graph, billions of queries | Contraction hierarchies / hub labeling |
| Negative weights | Bellman-Ford (Dijkstra wrong) |
| Online graph that changes between queries | Plain Dijkstra (overhead not worth it) |
| Tiny graph (V ≤ 100) | Plain Dijkstra is simpler |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Terminating on first meeting vertex | Wrong — keep going until `top_f + top_b ≥ best` |
| Using same `dist` map for both sides | Must be **separate** `dist_f` and `dist_b` |
| Forgetting reversed graph in directed case | Backward search needs the reversed adjacency |
| Comparing `pq_f[0][0]` to a stale entry | Skip-on-pop with `if u in settled: continue` |
| Implementing on graph with negative edges | Both forward and backward Dijkstras are wrong |
| Updating `best` only when popping | Update on **settling** in both directions |

#### Complexity

| Aspect | Cost |
|---|---|
| Worst case | Same as single Dijkstra: O((V + E) log V) |
| Practical (uniform branching) | √V improvement; ~half the queue depth |
| Memory | 2× Dijkstra (two `dist`, two `pq`) |
| With reversed graph | Build once at O(V + E) |

**Rule of thumb:** **bidirectional Dijkstra ≈ 2× to √× faster** for single-pair shortest path on large graphs. **Termination = when `top_f + top_b ≥ best`**, **not** when the searches first meet. For static graphs queried billions of times, **preprocess with contraction hierarchies** instead.
