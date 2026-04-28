### DP — Knapsack (0/1, unbounded, subset sum, coin change, partition)

**When:** "pick items with weights / values to maximize value (or count ways) under a capacity constraint." The most-asked DP family — every variant is a tweak of two base templates.

**Schema (the two foundational variants):**

| Variant | Each item | `dp[w]` semantics | Loop direction (inner) |
|---|---|---|---|
| **0/1 knapsack** | Used at most once | Best value with capacity `w` | **Reverse** (high → low) |
| **Unbounded knapsack** | Reusable | Same | **Forward** (low → high) |

**Why direction matters:**

| Variant | If you iterate **wrong** way |
|---|---|
| 0/1 with forward loop | Item gets reused — becomes unbounded |
| Unbounded with reverse loop | Item used at most once — becomes 0/1 |

**0/1 knapsack — max value:**

```python
def knapsack_01(weights, values, W):
    dp = [0] * (W + 1)
    for w_i, v_i in zip(weights, values):
        for w in range(W, w_i - 1, -1):           # REVERSE
            dp[w] = max(dp[w], dp[w - w_i] + v_i)
    return dp[W]
```

**Unbounded knapsack — max value:**

```python
def knapsack_unbounded(weights, values, W):
    dp = [0] * (W + 1)
    for w_i, v_i in zip(weights, values):
        for w in range(w_i, W + 1):                # FORWARD
            dp[w] = max(dp[w], dp[w - w_i] + v_i)
    return dp[W]
```

**Subset sum (0/1 — can we hit exactly `target`?):**

```python
def subset_sum(nums, target):
    dp = [False] * (target + 1); dp[0] = True
    for x in nums:
        for s in range(target, x - 1, -1):         # REVERSE
            dp[s] = dp[s] or dp[s - x]
    return dp[target]
```

**Partition equal subset sum:**

```python
def can_partition(nums):
    total = sum(nums)
    if total % 2: return False
    return subset_sum(nums, total // 2)
```

**Count of subsets with sum = K (0/1):**

```python
def count_subsets(nums, K):
    dp = [0] * (K + 1); dp[0] = 1
    for x in nums:
        for s in range(K, x - 1, -1):              # REVERSE
            dp[s] += dp[s - x]
    return dp[K]
```

**Coin change — min coins (unbounded):**

```python
def coin_change_min(coins, amount):
    dp = [float('inf')] * (amount + 1); dp[0] = 0
    for c in coins:
        for a in range(c, amount + 1):             # FORWARD
            if dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
    return dp[amount] if dp[amount] != float('inf') else -1
```

**Coin change — number of ways (unbounded, **coins outer** matters!):**

```python
def coin_change_count(coins, amount):
    dp = [0] * (amount + 1); dp[0] = 1
    for c in coins:                                # OUTER: coins
        for a in range(c, amount + 1):             # FORWARD
            dp[a] += dp[a - c]
    return dp[amount]
```

> **Why "coins outer"?** If `amount` is outer, you'd count `[1,2]` and `[2,1]` separately (permutations, not combinations). Coins outer = each coin is "considered once", giving combinations.

**Permutation variant (when order matters):**

```python
# Combination Sum IV: how many sequences sum to target?
def perm_count(nums, target):
    dp = [0] * (target + 1); dp[0] = 1
    for a in range(1, target + 1):                 # OUTER: amount
        for x in nums:
            if x <= a: dp[a] += dp[a - x]
    return dp[target]
```

**Bounded knapsack (each item with quantity `k_i`):** convert each item into `log(k_i)` "virtual items" of sizes 1, 2, 4, … (binary decomposition), then run 0/1 knapsack.

**Variants — quick recognition:**

| Phrasing | Variant | Inner loop |
|---|---|---|
| "Each item used at most once" | 0/1 | Reverse |
| "Each item unlimited times" | Unbounded | Forward |
| "Each item up to k_i times" | Bounded | Binary split → 0/1 |
| "Count combinations" | Order doesn't matter | Items outer |
| "Count permutations / sequences" | Order matters | Amount outer |
| "Min number of items" | dp = ∞, dp[0] = 0 | min |
| "Max value / sum" | dp = 0 | max |
| "Is it possible" | dp = bool | OR |

**2D DP (when 1D rolling isn't enough):**

```python
def knapsack_01_2d(weights, values, W):
    n = len(weights)
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(W + 1):
            dp[i][w] = dp[i-1][w]
            if weights[i-1] <= w:
                dp[i][w] = max(dp[i][w], dp[i-1][w - weights[i-1]] + values[i-1])
    return dp[n][W]
```

> 2D is easier to debug; 1D is the optimization. Always derive 1D from the 2D recurrence.

**Complexity:** all knapsack variants are O(n · W) time, O(W) space (1D version).

**Important:** **W is the capacity, not the input size.** Knapsack is *pseudo-polynomial* — when `W` is huge (e.g., 10¹⁰), DP is infeasible regardless of `n`.

**Patterns map:**

| Problem | Variant |
|---|---|
| 0/1 knapsack | 0/1, max value |
| Subset sum | 0/1, boolean |
| Partition equal subset sum | 0/1 with target = sum/2 |
| Count subsets with sum K | 0/1, count |
| Target sum (assign + or -) | Convert to subset sum: P - N = target, P + N = sum |
| Coin change min | Unbounded, min |
| Coin change count (combinations) | Unbounded, count, items outer |
| Combination sum IV (permutations) | Unbounded, count, amount outer |
| Last stone weight II | 0/1 with target = sum/2; minimize abs diff |
| Ones and zeroes (2D capacity) | 2D 0/1 knapsack |

**Pitfalls:**

| Mistake | Fix |
|---|---|
| 0/1 with forward inner loop | Becomes unbounded — iterate **reverse** |
| Counting permutations as combinations (or vice versa) | Loop nesting determines this; coins outer = combinations |
| `dp[0] = 0` for "is possible" | Should be `True` — there's always one way to make 0 (empty subset) |
| Pseudo-polynomial pitfall | If `W = 10⁹`, DP is too slow regardless of `n` |
| Forgetting the second dimension cap | "0s and 1s constraint" needs 2D dp |

**Rule of thumb:** **0/1 → reverse, unbounded → forward.** **Coins outer = combinations**, **amount outer = permutations**. Most "pick items with weight/value/capacity" problems are knapsack in disguise — recognize the shape and pick the right inner-loop direction.
