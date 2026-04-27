### Dynamic Programming

**When to use DP:**
- Problem has **optimal substructure** (optimal solution built from optimal sub-solutions)
- Problem has **overlapping subproblems** (same sub-problem solved multiple times)
- Usually: "find the minimum/maximum", "count the number of ways", "is it possible"

**Top-down (memoization):**
```python
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n <= 1: return n
    return fib(n-1) + fib(n-2)
```
- Start from the big problem, recurse down
- Cache results of sub-problems
- Easier to write, uses call stack

**Bottom-up (tabulation):**
```python
def fib(n):
    dp = [0] * (n + 1)
    dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i-1] + dp[i-2]
    return dp[n]
```
- Build solution from smallest sub-problems up
- No recursion overhead
- Can often optimize space

**Common DP patterns:**

**1. Linear DP (1D):**
- Climbing stairs, house robber, coin change (min coins)
- `dp[i] = f(dp[i-1], dp[i-2], ...)`

**2. Grid DP (2D):**
- Unique paths, minimum path sum, edit distance
- `dp[i][j] = f(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])`

**3. Knapsack:**
- 0/1 Knapsack: each item used once
- Unbounded Knapsack: each item used unlimited times (coin change)
```python
# 0/1 Knapsack
for i in range(n):
    for w in range(W, weights[i]-1, -1):  # reverse to avoid reuse
        dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
```

**4. Longest subsequence:**
- LIS (Longest Increasing Subsequence): O(n log n) with binary search
- LCS (Longest Common Subsequence): O(n*m) 2D DP
```python
# LCS
for i in range(1, m+1):
    for j in range(1, n+1):
        if s1[i-1] == s2[j-1]:
            dp[i][j] = dp[i-1][j-1] + 1
        else:
            dp[i][j] = max(dp[i-1][j], dp[i][j-1])
```

**5. Interval DP:**
- Matrix chain multiplication, burst balloons
- `dp[i][j] = best answer for subarray [i..j]`

**Space optimization:**
- If `dp[i]` only depends on `dp[i-1]`, use two rows or a single array
- Fibonacci: only need prev two values -> O(1) space
- 2D grid: only need previous row -> O(n) space

**DP problem-solving steps:**
1. Define state: what does `dp[i]` represent?
2. Find recurrence: how does `dp[i]` relate to smaller sub-problems?
3. Identify base cases: what are the starting values?
4. Determine order: which sub-problems must be solved first?
5. Optimize space if possible

**Rule of thumb:** If the problem says "minimum", "maximum", "count ways", or "is it possible" and has overlapping sub-problems, think DP. Start with top-down (easier) then convert to bottom-up for efficiency. Define the state clearly before writing code.
