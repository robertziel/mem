### Branch and Bound (lower bound pruning, optimization, TSP, knapsack, NP-hard)

**When:** find the **exact optimum** of an NP-hard combinatorial problem when the input is small enough that pruning makes search tractable — TSP up to ~30 cities, knapsack with huge weights, integer programming, scheduling, graph coloring. Backtracking with **provable lower bounds** that prune entire subtrees.

**Schema:**

| Concept | Detail |
|---|---|
| Search tree | Nodes = partial solutions; children = extensions |
| Bound | Optimistic estimate of best achievable value within this subtree |
| Best so far | Current best complete solution |
| Prune | If `bound(node) ≥ best` (for minimization), discard the subtree |
| Branching strategy | DFS / BFS / best-first (priority queue keyed by bound) |

> **Branch & bound = backtracking + admissible bounds.** Without bounds, you have plain backtracking; with tight bounds, you prune exponentially fast.

#### Generic skeleton

```python
import heapq

def branch_and_bound(initial_state, lower_bound, expand, complete, evaluate):
    best = float('inf')
    best_sol = None
    pq = [(lower_bound(initial_state), initial_state)]
    while pq:
        lb, state = heapq.heappop(pq)
        if lb >= best: continue                  # global prune
        if complete(state):
            v = evaluate(state)
            if v < best: best, best_sol = v, state
            continue
        for child in expand(state):
            cb = lower_bound(child)
            if cb < best:
                heapq.heappush(pq, (cb, child))
    return best_sol, best
```

> **Best-first** = pop the node with the smallest bound; finds promising regions first, sharpens `best` quickly, allowing more pruning.

#### Knapsack (0/1) with linear-relaxation bound

```python
def knapsack_bb(weights, values, W):
    n = len(weights)
    # sort by value/weight desc — used both in greedy bound and in branching
    order = sorted(range(n), key=lambda i: -values[i] / weights[i])
    w = [weights[i] for i in order]
    v = [values[i] for i in order]

    def bound(taken_value, taken_weight, idx):
        # fractional relaxation gives an upper bound
        if taken_weight > W: return -float('inf')
        b = taken_value
        rem = W - taken_weight
        i = idx
        while i < n and w[i] <= rem:
            b += v[i]; rem -= w[i]; i += 1
        if i < n: b += rem * (v[i] / w[i])
        return b

    best = 0
    def dfs(idx, taken_v, taken_w):
        nonlocal best
        if idx == n:
            if taken_w <= W: best = max(best, taken_v)
            return
        if bound(taken_v, taken_w, idx) <= best: return       # prune
        # take
        if taken_w + w[idx] <= W:
            dfs(idx + 1, taken_v + v[idx], taken_w + w[idx])
        # skip
        dfs(idx + 1, taken_v, taken_w)

    dfs(0, 0, 0)
    return best
```

> The fractional knapsack relaxation gives a tight upper bound. Most branches get pruned quickly.

#### TSP (Held-Karp lower bound + B&B)

| Bound source | Quality |
|---|---|
| Sum of two cheapest edges per vertex / 2 | Easy, loose |
| **MST + cheapest two edges from start** | Better |
| **1-tree** (Held-Karp) | Very tight; basis of Concorde solver |
| LP relaxation of subtour-elimination | Strongest, expensive |

For small TSP (n ≤ 20), bitmask DP (Held-Karp) is faster. B&B shines for n in the 20–60 range with strong bounds.

#### Strategies

| Strategy | Pro | Con |
|---|---|---|
| **DFS** | Low memory; quickly finds *some* solution | Bad initial bound = lots of late pruning |
| **BFS** | All nodes at depth `d` before `d+1` | Memory blows up |
| **Best-first** (priority queue by bound) | Finds high-quality solution early → tight `best` → strong pruning | Memory grows; no upper bound on queue size |
| **Iterative deepening** | DFS-like memory + best-first quality | Re-explores nodes |
| **DFS with restart** | Heuristic for initial `best`, then DFS | Common in practice |

#### Bounding techniques

| Technique | Where |
|---|---|
| **LP relaxation** | Replace integer constraints with `[0, 1]`; solve LP |
| **Lagrangian relaxation** | Move hard constraints into the objective with multipliers |
| **Combinatorial bounds** | Problem-specific (MST for TSP, fractional knapsack for KP) |
| **Cutting planes** (Branch & Cut) | Add inequalities to tighten LP |
| **Column generation** (Branch & Price) | Generate variables on demand for large LPs |

#### Branching strategies (which child to expand first)

| Strategy | Effect |
|---|---|
| Most-constrained variable | Reduces tree depth |
| Most-promising direction | Sharpens `best` early |
| Strong branching | Try both branches at low depth, pick the more informative |
| Pseudo-cost | Learn from past branches |
| Heuristic-guided | Domain-specific |

#### Use cases

| Problem | Bound |
|---|---|
| TSP | MST or 1-tree |
| 0/1 knapsack | Fractional relaxation |
| Bin packing | First-fit-decreasing relaxation |
| Job-shop scheduling | LP relaxation of disjunctive constraints |
| Integer programming | LP relaxation (Branch & Bound is the engine of CPLEX / Gurobi) |
| Graph coloring | Greedy upper bound; clique number lower bound |
| Vertex cover | LP-based lower bound |
| Maximum independent set | Sum of degrees / 2; greedy |
| Quadratic assignment | Linear assignment relaxation |
| SAT (CDCL = a B&B variant) | Implication graph + clause learning |

#### B&B vs alternatives

| Need | Use |
|---|---|
| Exact, NP-hard, small input | **B&B** |
| Exact, polynomial | DP / greedy / matching |
| Approximate, fast | Greedy / heuristic |
| Approximate, very large | Local search / SA / GA |
| LP without integrality | Simplex / interior-point |
| MIP at scale | Branch & cut & price (commercial solvers) |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Bound that overestimates (for minimization) | **Inadmissible** — kills correctness; verify on tiny instances |
| Loose bound | Tightens nothing — algorithm degenerates to brute force |
| Best-first with weak bound | Memory explosion; switch to DFS or limited best-first |
| Building bound recomputation into hot loop | Cache where possible |
| Confusing minimization vs maximization conventions | Pick one; flip signs consistently |
| Treating B&B as polynomial | Worst-case still exponential; bounds give average-case wins |
| No initial heuristic for `best` | Run a fast greedy first to seed `best` |

#### Complexity

| Aspect | Cost |
|---|---|
| Worst case | Exponential (NP-hard) |
| Best case | Polynomial when bounds are very tight |
| Memory (DFS) | O(depth) |
| Memory (best-first) | O(open nodes) — can blow up |
| Practical | Highly problem-dependent |

**Rule of thumb:** **B&B = backtracking + admissible bounds**. **Tighter bound = exponentially fewer explored nodes.** Use **best-first** when memory allows; **DFS with a heuristic seed for `best`** otherwise. Standard pattern: **(1) compute a quick heuristic `best`, (2) compute a tight bound at each node, (3) prune anything with bound ≥ best**. The bound is the algorithm — everything else is bookkeeping.
