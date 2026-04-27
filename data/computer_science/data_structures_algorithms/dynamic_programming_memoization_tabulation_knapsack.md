### Dynamic Programming (Memoization, Tabulation, Knapsack)

**When DP applies — both must hold:**

| Property | Test |
|---|---|
| **Optimal substructure** | Optimal answer built from optimal answers to smaller subproblems |
| **Overlapping subproblems** | The same subproblem appears repeatedly in the recursion tree |

> If only **optimal substructure** holds, you might want **divide & conquer** (e.g. mergesort) instead.

**Question phrasings → DP:**

| Phrasing | Likely DP |
|---|---|
| "Minimum / maximum cost / length / value …" | ✅ |
| "Count the number of ways …" | ✅ |
| "Is it possible to … under constraint …" | ✅ |
| "Longest / shortest …" | ✅ |
| "Find ALL solutions" | Backtracking (not DP) |

**Top-down vs bottom-up — same answer, different mechanics:**

| | **Top-down (memoization)** | **Bottom-up (tabulation)** |
|---|---|---|
| Direction | Big → small (recurse) | Small → big (loop) |
| Stack | Uses call stack | Iterative — no stack |
| First write | Easier — start from recursion + cache | Requires order knowledge |
| Space | Only computes states actually reached | Fills entire table |
| Optimization | Hard to roll table | Easy to compress dimensions |
| Python version | `@lru_cache(maxsize=None)` on the recursion | Explicit `dp = [...]` array |

> **Strategy:** write the top-down version first (easier to think about), then convert to bottom-up only if you need the speed/space win.

**Five-step recipe:**

| Step | Question to answer |
|---|---|
| 1 | **State** — what does `dp[i]` (or `dp[i][j]`) represent? Be specific: "the minimum cost to reach state X" |
| 2 | **Recurrence** — `dp[i] = f(smaller dp[...])`. Express the choice at each step |
| 3 | **Base cases** — which states are seeded directly? |
| 4 | **Order** — which subproblems are needed first? Determines loop direction |
| 5 | **Space optimization** — can old rows / dimensions be dropped? |

**Common DP patterns — match by shape:**

| Pattern | Shape | Examples | Recurrence shape |
|---|---|---|---|
| **Linear (1D)** | `dp[i]` over a single sequence | Climbing stairs, House robber, Decode ways, Coin change | `dp[i] = f(dp[i-1], dp[i-2], ...)` |
| **Grid (2D)** | `dp[i][j]` over a grid | Unique paths, Min path sum, Edit distance | `dp[i][j] = f(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])` |
| **0/1 Knapsack** | Choose each item at most once | 0/1 Knapsack, Subset sum, Partition equal subset | Iterate weight **reverse** to avoid reuse |
| **Unbounded knapsack** | Choose items unlimited times | Coin change (count / min coins), Rod cutting | Iterate weight **forward** |
| **LIS** (longest increasing subseq) | Build relative to previous picks | LIS, Russian doll envelopes | O(n²) DP or O(n log n) patience sort |
| **LCS** (longest common subseq) | Two-string DP | LCS, Edit distance, Distinct subsequences | `dp[i][j] = match? dp[i-1][j-1]+1 : max(dp[i-1][j], dp[i][j-1])` |
| **Interval DP** | `dp[i][j]` = best on subarray `[i..j]` | Matrix chain mul, Burst balloons, Min cost merge stones | Iterate by length first, then start |
| **Tree DP** | Recursion over subtree | Diameter, House robber III, Tree max sum | Post-order traversal returning multiple states |
| **Bitmask DP** | State includes a bitmask of visited / chosen items | TSP, Assignment, Min-cost subset | `dp[mask][last]` — O(2ⁿ · n²) or similar |
| **Digit DP** | Count numbers with property up to N | Numbers with digit sum k | State: position + tight + accumulator |
| **State-machine DP** | Multiple states per index | Buy/sell stock with cooldown / k transactions | `dp[i][state]` |
| **Probability DP** | Expected value / probability | Knight on chessboard, Dice rolls | Floating-point recurrence |

**0/1 knapsack vs unbounded — the **iteration direction** matters:**

| Variant | Each item | Inner loop direction | Why |
|---|---|---|---|
| 0/1 (`dp[w]`) | Used once | **Reverse** (high → low) | Prevents reading a value already updated this iteration |
| Unbounded (`dp[w]`) | Reusable | **Forward** (low → high) | Lets the same item contribute multiple times |

```python
# 0/1
for w_i, v_i in zip(weights, values):
    for w in range(W, w_i - 1, -1):
        dp[w] = max(dp[w], dp[w - w_i] + v_i)

# Unbounded
for w_i, v_i in zip(weights, values):
    for w in range(w_i, W + 1):
        dp[w] = max(dp[w], dp[w - w_i] + v_i)
```

**Space optimization tricks:**

| Pattern | Optimization |
|---|---|
| `dp[i]` depends only on `dp[i-1]` | Use two scalars |
| `dp[i]` depends on `dp[i-1]` and `dp[i-2]` | Three scalars (rolling) |
| 2D `dp[i][j]` depends only on `dp[i-1][j*]` | Two rows |
| 0/1 knapsack | Compress to 1D, iterate reverse |
| Tree DP | Reuse the recursion frame; no extra table |

**LIS in O(n log n) — patience sorting:**

```python
import bisect
def lis(a):
    tails = []
    for x in a:
        i = bisect.bisect_left(tails, x)
        if i == len(tails): tails.append(x)
        else: tails[i] = x
    return len(tails)
```

> `tails[k]` = smallest tail of any increasing subsequence of length `k+1`. Length of `tails` is the answer.

**LCS / edit-distance template (2D):**

```python
def lcs(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0]*(n+1) for _ in range(m+1)]
    for i in range(1, m+1):
        for j in range(1, n+1):
            if s1[i-1] == s2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    return dp[m][n]
```

**Complexity intuition:**

| Pattern | Typical time | Typical space (after optimization) |
|---|---|---|
| Linear 1D | O(n) | O(1) |
| Grid 2D | O(m·n) | O(min(m,n)) |
| 0/1 knapsack | O(n·W) | O(W) |
| LIS | O(n log n) | O(n) |
| LCS / edit distance | O(m·n) | O(min(m,n)) |
| Interval DP | O(n³) | O(n²) |
| Bitmask DP | O(2ⁿ · n) or n² | O(2ⁿ) |
| Tree DP | O(n) | O(h) recursion |

**DP vs greedy vs backtracking — pick by problem:**

| If you need… | Use |
|---|---|
| Optimal value, overlapping subproblems | DP |
| Optimal value, no overlap (each step locally optimal proves global) | Greedy |
| **All** solutions / arrangements | Backtracking |
| Optimal value, polynomial state space | DP |
| Optimal value, state explodes (e.g. NP-hard at general n) | Backtracking + branch-and-bound, or approximation |

**Common mistakes:**

| Mistake | Fix |
|---|---|
| Wrong state definition | Be precise: "min cost to reach `i` having used `j` items" — write it down |
| Off-by-one in base case | Index from 0 vs 1; draw the table on paper |
| Forgetting to iterate from smallest | Print `dp` after each step until you see the bug |
| Reverse vs forward in knapsack | Pick by reuse semantics — see table above |
| 2D DP with insufficient base cases | First row + first column often need explicit seeding |
| Memoizing on mutable state (lists, dicts) | Convert to tuple/frozenset before caching |
| Recursion depth > Python limit | Convert to bottom-up, or `sys.setrecursionlimit(10**6)` |
| Computing answer that's not in `dp[final state]` | Track the answer along the way (max-so-far, count) |

**Reconstructing the solution (not just the value):**

| Approach | Cost |
|---|---|
| Store **choice** at each cell (e.g. `parent[i][j] = "diag" / "up" / "left"`) | O(table) extra space; backtrack from the end |
| Recompute by walking the table at the end | No extra storage; O(longer dim) walk |
| For LIS: store predecessor index when extending | Re-walk linked list at the end |

**Rule of thumb:** if the problem asks for **min / max / count / "is possible"** and has **overlapping subproblems**, reach for DP. **Define the state precisely first** — the recurrence usually writes itself once the state is right. **Top-down with `@lru_cache` to ship**, **bottom-up with rolling arrays to optimize**. The two staples that come up endlessly are **knapsack** (0/1 reverse, unbounded forward) and **LCS / edit-distance** (the 2D match-or-skip recurrence).
