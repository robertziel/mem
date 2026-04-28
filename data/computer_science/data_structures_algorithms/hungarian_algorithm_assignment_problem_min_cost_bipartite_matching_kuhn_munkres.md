### Hungarian Algorithm (assignment problem, min-cost bipartite matching, Kuhn-Munkres)

**When:** **minimum-cost perfect matching** in a complete bipartite graph — assign N workers to N tasks minimizing total cost. Classic OR / scheduling / image-correspondence problem. O(n³) by Kuhn-Munkres.

**Schema:**

| Concept | Detail |
|---|---|
| Cost matrix `C[i][j]` | Cost of assigning worker `i` to task `j` (n × n) |
| Goal | Permutation `π` minimizing `Σᵢ C[i][π(i)]` |
| Potentials `u[i], v[j]` | Dual variables; reduced cost `C[i][j] − u[i] − v[j] ≥ 0` always |
| Tight edge | Reduced cost = 0; matching uses only tight edges |

> Hungarian = primal-dual algorithm: maintain dual feasibility (`u`, `v`) and a partial matching of tight edges; iterate until matching is perfect.

#### Kuhn-Munkres (O(n³) DP-style)

```python
def hungarian(cost):
    n = len(cost)
    u = [0] * (n + 1); v = [0] * (n + 1)
    p = [0] * (n + 1); way = [0] * (n + 1)            # p[j] = row matched to col j; 0 = unmatched
    INF = float('inf')

    for i in range(1, n + 1):
        p[0] = i
        j0 = 0
        minv = [INF] * (n + 1)
        used = [False] * (n + 1)
        while True:
            used[j0] = True
            i0 = p[j0]; j1 = 0; delta = INF
            for j in range(1, n + 1):
                if not used[j]:
                    cur = cost[i0 - 1][j - 1] - u[i0] - v[j]
                    if cur < minv[j]:
                        minv[j] = cur; way[j] = j0
                    if minv[j] < delta:
                        delta = minv[j]; j1 = j
            for j in range(n + 1):
                if used[j]:
                    u[p[j]] += delta; v[j] -= delta
                else:
                    minv[j] -= delta
            j0 = j1
            if p[j0] == 0: break
        # augment along the path back to j0
        while j0 != 0:
            j1 = way[j0]
            p[j0] = p[j1]; j0 = j1

    # p[j] = row matched to col j
    assignment = [0] * n
    for j in range(1, n + 1):
        if p[j] != 0:
            assignment[p[j] - 1] = j - 1
    total_cost = sum(cost[i][assignment[i]] for i in range(n))
    return assignment, total_cost
```

> The above is the canonical compact Hungarian — `O(n³)` worst case, very fast in practice.

#### Naive O(n⁴) version (cleaner — useful to memorize)

| Step | Action |
|---|---|
| 1 | Subtract row mins from each row, then column mins from each column |
| 2 | Cover all zeros with the minimum number of horizontal / vertical lines |
| 3 | If `#lines == n`: matching of zeros exists — done |
| 4 | Else find `δ` = smallest uncovered entry; subtract from uncovered, add to doubly-covered; goto 2 |

#### Hungarian vs alternatives

| Need | Use |
|---|---|
| Min-cost **perfect** matching | Hungarian |
| Min-cost **non-perfect** | Min-cost max-flow |
| Max-cost matching | Negate costs, then Hungarian |
| **Unweighted** max bipartite matching | Hopcroft-Karp |
| Matching in **general** graphs | Blossom (Edmonds) |
| Cost matrix is **rectangular** (m ≠ n) | Pad with dummy rows/cols at zero cost |
| Online / dynamic assignment | Auction algorithm; or rerun Hungarian |

#### Use cases

| Problem | Cost matrix |
|---|---|
| Workers → jobs minimizing total time | `C[i][j]` = worker i's time on job j |
| Image keypoint matching | Pairwise distances |
| Tracking-by-detection (multi-object tracking) | Detection ↔ track distance |
| Vehicle routing / dispatch | Driver ↔ trip cost |
| Pixel correspondence (stereo) | Photo-similarity distance |
| Probabilistic graph alignment | Negative log-likelihood |
| Optimal transport (small n) | Earth mover's distance — Hungarian special case |

#### Properties

| Property | Detail |
|---|---|
| Optimality | Returns global minimum cost |
| Polynomial | O(n³) |
| Integer | If costs are integers, optimal matching is integer |
| Complement | Total = `Σ row mins + Σ col mins + Σ (final reductions)` |
| LP duality | Hungarian solves the LP relaxation; integer optimum coincides |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Rectangular cost matrix without padding | Pad with rows / cols of zero cost up to square |
| Negative costs | Subtract a constant to make all non-negative; doesn't change optimum |
| Min-cost perfect for **assignment with sizes** (one-to-many) | Use min-cost max-flow |
| Confusing it with Hopcroft-Karp (no costs) | Hopcroft-Karp = unweighted; Hungarian = weighted |
| Implementing the n⁴ version on n = 500 | Use the n³ version |
| Forgetting that "task can stay unassigned" needs a dummy column | Add column of zeros (or other sentinel) |

#### Complexity

| Op | Cost |
|---|---|
| Time | **O(n³)** (Kuhn-Munkres) |
| Memory | O(n²) for cost matrix |
| Naive O(n⁴) variant | O(n⁴) |
| Sparse Hungarian | O(n·m + n²·log n) (Edmonds-Karp on the LP) |

**Rule of thumb:** Hungarian = **min-cost perfect matching in O(n³)**. Pad to square; subtract row / column mins as warm-up; primal-dual augment with potentials. For **non-perfect** or capacity ≠ 1, fall back to **min-cost max-flow**. For **unweighted** matching, use **Hopcroft-Karp**.
