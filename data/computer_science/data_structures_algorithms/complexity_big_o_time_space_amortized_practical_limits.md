### Complexity (Big-O, time, space, amortized)

**When:** every algorithm question — state both time and space before writing code.

**Big-O scale (fast → slow):**

| Big-O | Name | Example | Max N for ~1s |
|---|---|---|---|
| O(1) | Constant | Hash lookup, array index | — |
| O(log n) | Logarithmic | Binary search, balanced BST op | ~10¹⁸ |
| O(n) | Linear | Single pass | ~10⁸ |
| O(n log n) | Linearithmic | Comparison sort | ~10⁷ |
| O(n²) | Quadratic | Nested loop | ~10⁴ |
| O(n³) | Cubic | Triple loop, Floyd-Warshall | ~500 |
| O(2ⁿ) | Exponential | Subsets, recursive Fibonacci | ~25 |
| O(n!) | Factorial | Permutations, brute TSP | ~12 |

**How to analyze:**

| Step | Action |
|---|---|
| 1 | Count dominant operation (compare, assign, recursion call) |
| 2 | Express as f(input size) |
| 3 | Drop constants and lower-order terms — `O(2n + 5) = O(n)` |
| 4 | Check: iterating? nesting? halving? branching? |

**Amortized vs worst-case:**

| Operation | Worst | Amortized |
|---|---|---|
| Dynamic-array append | O(n) on resize | **O(1)** |
| Hash map insert | O(n) on resize / collision | **O(1)** |
| Splay tree access | O(n) on degenerate | O(log n) |
| Union-Find op (compression + rank) | O(log n) | **~O(α(N)) ≈ O(1)** |

**Space complexity gotchas:**

| Source | Cost |
|---|---|
| Recursion stack | O(h) for tree DFS, O(n) for linear |
| Copy of input | O(n) |
| In-place algorithm | O(1) extra |
| Memoization table | O(state space) |
| String concat in loop | O(n²) total — use `''.join(...)` |

**Rule of thumb:** if N ≤ 10⁴ → O(n²) fine. If N ≤ 10⁷ → need O(n log n). If N ≤ 10⁹ → need O(n) or O(log n). Drop constants; lead with the dominant term.
