### Stoer-Wagner (global min cut, undirected, no flow, phase / contraction)

**When:** find the **global minimum cut** of an **undirected, weighted, connected** graph — partition the vertices into two non-empty sets minimizing total cut-edge weight. **No source / sink** required (unlike s-t min cut). Used for: clustering, image segmentation, network reliability.

**Schema:**

| Concept | Detail |
|---|---|
| Goal | Partition `V` into `(S, V \ S)` minimizing `Σ w(u, v)` for `u ∈ S, v ∈ V \ S` |
| Phase | Run a "maximum-adjacency" (max-cardinality / Prim-like) ordering; **last two added vertices give a candidate cut** |
| Contraction | Merge those two vertices into one; restart the next phase |
| Total | Repeat n − 1 phases; min over phase cuts is the answer |
| Time | O(V³) or O(V·E + V² log V) with heap |

> Stoer-Wagner avoids the "n choose 2" runs of s-t min cut you'd otherwise need — finds the global cut directly in O(V³).

#### Algorithm outline

| Step | Action |
|---|---|
| 1 | Pick any starting vertex `a`; initialize `A = {a}`, weights to others = `w(a, v)` |
| 2 | Repeatedly pick the vertex `v` outside `A` with **max sum of weights to `A`**; add to `A`; update other weights |
| 3 | The **last two vertices added** are `s, t`; the **cut** separating `t` from `V \ {t}` has weight = sum of `w(t, ·)` to `A` (the "cut-of-the-phase") |
| 4 | **Contract `s` and `t`** into one vertex (sum their edge weights to others) |
| 5 | Repeat for `n − 1` phases; return minimum cut-of-the-phase across all phases |

#### Implementation (O(V³))

```python
def stoer_wagner(graph):
    """graph: weight matrix [n][n], symmetric, 0 on diagonal. Returns min-cut weight."""
    n = len(graph)
    g = [row[:] for row in graph]
    co = [[i] for i in range(n)]                     # contracted-vertex tracking
    best = float('inf'); best_cut = None
    active = list(range(n))

    while len(active) > 1:
        a = active[0]
        w = [0] * n
        added = [False] * n
        added[a] = True
        prev = a
        last = a
        for _ in range(len(active) - 1):
            for v in active:
                if not added[v]:
                    w[v] += g[prev][v]
            mx = -1; sel = -1
            for v in active:
                if not added[v] and w[v] > mx:
                    mx = w[v]; sel = v
            added[sel] = True
            prev, last_prev, last = prev, prev, sel  # track last two
            last_prev = prev if False else last_prev
            # ↑ we want s = second-to-last added, t = last added; tracked separately:
            second_last = last_prev
        # cut-of-phase weight = w[last]
        if w[last] < best:
            best = w[last]; best_cut = list(co[last])
        # contract second_last and last
        for v in active:
            if v != last:
                g[second_last][v] += g[last][v]
                g[v][second_last] = g[second_last][v]
        co[second_last].extend(co[last])
        active.remove(last)

    return best, best_cut
```

> Production code uses a more careful "last two" tracking + a heap for O(V·E + V² log V). The above is the readable O(V³) reference.

#### Stoer-Wagner vs s-t min cut

| Property | Stoer-Wagner | s-t min cut (max flow) |
|---|---|---|
| Specific endpoints | No (global) | **Yes** |
| Directed graph | Undirected only | Directed or undirected |
| Weighted | Yes | Yes |
| Time | O(V³) | O(V · E²) per pair × O(V²) pairs = O(V³ · E²) for global via flow |
| Simplicity | **Self-contained** (no flow infra) | Needs max-flow code |
| Min global cut | **Direct** | Run max-flow over many (s, t) pairs |

> **For global min cut on undirected graphs, Stoer-Wagner beats running max-flow many times.**

#### Karger's randomized min cut (alternative)

| Property | Stoer-Wagner | Karger |
|---|---|---|
| Type | Deterministic | Randomized (Monte Carlo) |
| Time | O(V³) | O(V² log V) per run; need O(V² log² V) runs for high probability |
| Simplicity | Direct | Edge contraction is one-liner; analysis is hard |
| Best for | "I need it to be right" | "I need it to be fast and approximate is OK" |

```python
# Karger sketch — O(V²) per run
import random
def karger(adj):
    while len(adj) > 2:
        u = random.choice(list(adj))
        v = random.choice(adj[u])
        # contract u and v
        # ... (multigraph contraction)
        ...
    return cut_size
```

#### Use cases

| Problem | Reduction |
|---|---|
| Network reliability (lowest-bandwidth bottleneck) | Min cut |
| Image segmentation | Min cut on pixel-similarity graph |
| Community detection | Min cut on social graph |
| Tournament bracketing | Cluster fewest matches between groups |
| Sparsest cut | NP-hard variant — but min cut is the LP relaxation |
| 2-edge-connectivity check | Min cut weight ≥ 2 |
| Cheapest way to disconnect a network | Min cut |

#### Patterns map

| Phrasing | Use |
|---|---|
| "Minimum cost to disconnect this graph" | Stoer-Wagner |
| "Min cut between specific s and t" | Max-flow / min-cut |
| "Random min cut very fast" | Karger / Karger-Stein |
| "K-cut (partition into K pieces)" | NP-hard for K ≥ 3 in general; specialized algorithms |
| "Min bisection (equal-sized halves)" | NP-hard — heuristics |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Using on directed graphs | Stoer-Wagner is **undirected**; for directed, use other algorithms |
| Using on disconnected graph | Min cut is 0 (the empty cut between components); preprocess components |
| Tracking second-to-last incorrectly | Bug source — verify with tiny inputs |
| Contraction with multi-edges as separate | Sum weights; treat as one edge |
| Running on huge V | O(V³) — too slow above ~1000 |
| Confusing global cut with bisection | Bisection (equal sides) is NP-hard |

#### Complexity

| Op | Cost |
|---|---|
| Time (matrix version) | **O(V³)** |
| Time (heap version) | O(V · E + V² log V) |
| Memory | O(V²) for matrix, O(V + E) for adjacency |
| Karger (random) | O(V²) per run, O(V² log V) for high-probability optimum |

**Rule of thumb:** **Stoer-Wagner = global min cut on undirected weighted graphs in O(V³)**, no source / sink required. Each "phase" picks a candidate cut via max-adjacency ordering; contract the last two added vertices and repeat. For **specific (s, t)** pairs, use **max flow / min cut**. For **randomized fast** min cut, use **Karger / Karger-Stein**.
