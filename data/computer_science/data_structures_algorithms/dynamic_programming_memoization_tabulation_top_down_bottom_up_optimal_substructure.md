### Dynamic Programming (memoization, tabulation, top-down, bottom-up, optimal substructure)

**When:** find an **optimal value** (min / max / count) where the problem has both:

| Property | Test |
|---|---|
| **Optimal substructure** | Optimal whole built from optimal subparts |
| **Overlapping subproblems** | Same subproblem hit repeatedly |

> Only the first → divide & conquer (mergesort). Both → DP. "Find ALL solutions" → backtracking.

**Question phrasings → DP:**

| Phrasing | DP? |
|---|---|
| Min / max / longest / shortest of … | ✓ |
| Count number of ways | ✓ |
| Is it possible to … under constraint | ✓ |
| Find ALL solutions | ✗ → backtracking |

**Top-down (memoization) vs bottom-up (tabulation):**

| | Top-down | Bottom-up |
|---|---|---|
| Direction | Big → small (recurse) | Small → big (loop) |
| Stack | Recursion | Iterative — none |
| First write | **Easier** | Needs order knowledge |
| Computes | Only states actually reached | Fills entire table |
| Space optimization | Hard | Easy (rolling rows) |
| Python helper | `@lru_cache(maxsize=None)` | Explicit `dp = [...]` array |

> **Strategy:** write top-down first; convert to bottom-up only for speed/space win.

**Five-step recipe:**

| Step | Question to answer |
|---|---|
| 1 | **State** — what does `dp[i]` (or `dp[i][j]`) represent? Be precise: "the min cost to reach state X" |
| 2 | **Recurrence** — `dp[i] = f(smaller dp[...])`; express the choice at each step |
| 3 | **Base cases** — which states are seeded directly? |
| 4 | **Order** — which subproblems are needed first? Determines loop direction |
| 5 | **Space optimization** — can old rows / dimensions be dropped? |

**Top-down skeleton:**

```python
from functools import lru_cache
@lru_cache(maxsize=None)
def f(state):
    if base(state): return base_value
    return combine(f(smaller_state) for smaller_state in choices(state))
```

**Bottom-up skeleton:**

```python
dp = [0] * (n + 1)                              # or 2D, 3D
dp[0] = base_value
for i in range(1, n + 1):
    dp[i] = combine(dp[smaller] for smaller in choices(i))
return dp[n]
```

**Climbing stairs (canonical 1D DP):**

```python
def climb(n):
    if n <= 2: return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b
```

**Unique paths (2D DP, optimized to 1D):**

```python
def unique_paths(m, n):
    dp = [1] * n
    for i in range(1, m):
        for j in range(1, n):
            dp[j] += dp[j - 1]
    return dp[-1]
```

**House robber (1D, choice per element):**

```python
def rob(nums):
    prev = curr = 0
    for x in nums:
        prev, curr = curr, max(curr, prev + x)
    return curr
```

**Coin change (unbounded — min coins):**

```python
def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1); dp[0] = 0
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1
```

**DP pattern catalog (match by shape):**

| Pattern | Shape | Examples |
|---|---|---|
| Linear 1D | `dp[i]` over a sequence | Climbing stairs, House robber, Decode ways |
| Grid 2D | `dp[i][j]` over a grid | Unique paths, Min path sum, Edit distance |
| 0/1 knapsack | Each item once; iterate W reverse | 0/1 knapsack, Subset sum, Partition |
| Unbounded knapsack | Items unlimited; iterate W forward | Coin change, Rod cutting |
| LIS | Build relative to previous picks | LIS — O(n²) DP or O(n log n) patience |
| LCS | Two-string DP | LCS, Edit distance |
| Interval DP | `dp[i][j]` over `[i..j]`; iterate length | Matrix chain, Burst balloons |
| Tree DP | Post-order; return multiple states | Diameter, House robber III |
| Bitmask DP | `dp[mask][last]` | TSP, Assignment |
| Digit DP | (position, tight, accumulator) | Digit-sum constraints |
| State-machine | `dp[i][state]` | Stock cooldown, k transactions |
| Probability | Float recurrence | Knight on chessboard, dice |

**Space optimization:**

| If `dp[i]` depends only on… | Use |
|---|---|
| `dp[i-1]` | Two scalars |
| `dp[i-1]`, `dp[i-2]` | Three scalars |
| `dp[i-1][*]` (2D) | Two rows |
| 0/1 knapsack | 1D, iterate reverse |

**Reconstruct the solution (not just the value):**

| Approach | Cost |
|---|---|
| Store choice at each cell (`parent[i][j] = "diag" / "up" / "left"`) | O(table) extra space |
| Recompute by walking the table at the end | O(longer dim) walk |

**Common mistakes:**

| Mistake | Fix |
|---|---|
| Wrong state definition | Be precise: write it down before coding |
| Off-by-one in base case | Index from 0 vs 1; draw the table |
| Memoizing on mutable state (lists, dicts) | Convert to tuple / frozenset before caching |
| Recursion depth > Python default | Convert to bottom-up, or `sys.setrecursionlimit(10⁶)` |
| Computing answer that's not in `dp[final]` | Track max-so-far / count along the way |
| Inserting state, then recursing on the same state | Infinite recursion |

**Rule of thumb:** if the problem asks **min / max / count / "is possible"** with **overlapping subproblems**, reach for DP. **Define the state precisely first** — the recurrence usually writes itself once the state is right. **Top-down with `@lru_cache` to ship**, **bottom-up with rolling arrays to optimize**.
