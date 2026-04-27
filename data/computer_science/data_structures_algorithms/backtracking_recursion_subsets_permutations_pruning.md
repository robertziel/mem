### Backtracking & Recursion (Subsets, Permutations, Pruning)

**The pattern in one sentence:** *choose → explore → un-choose.* Build a partial solution incrementally; abandon any path that can't lead to a valid answer.

**Skeleton:**

```python
def backtrack(state, path, result):
    if is_complete(path):
        result.append(path[:])      # snapshot — list is mutated below
        return
    for candidate in candidates(state):
        if not is_valid(candidate, path):
            continue                 # prune
        path.append(candidate)       # choose
        backtrack(next(state), path, result)
        path.pop()                   # un-choose
```

> The `path[:]` copy is essential — appending the live list captures whatever it ends up as later. Forgetting this is the #1 backtracking bug.

**Backtracking vs DP — pick by question shape:**

| | **Backtracking** | **Dynamic Programming** |
|---|---|---|
| Goal | Find **all** valid solutions | Find **optimal** value (min / max / count) |
| Mechanism | Search tree with pruning | Combine overlapping subproblems |
| Typical complexity | Exponential in path length | Polynomial in state space |
| Example problems | Subsets, permutations, N-queens, Sudoku, word search | Knapsack, coin change, edit distance, LIS |
| State stored | Current path on stack | Memo table / DP array |

**Classic backtracking templates — what's `state` for each:**

| Problem | Decision per step | Pruning |
|---|---|---|
| **Subsets** of `n` items | Include / skip current item | None — emit at every node |
| **Subsets II** (with duplicates) | Same, but skip duplicates at same depth | Sort + `if i > start and a[i]==a[i-1]: continue` |
| **Permutations** | Pick a still-unused element | `used[i]` boolean per position |
| **Permutations II** (with duplicates) | Same, but skip duplicate at same depth | Sort + `if i>0 and a[i]==a[i-1] and not used[i-1]: continue` |
| **Combination sum** | Pick same or higher index, accumulate sum | Stop when sum exceeds target; sort for early break |
| **N-queens** | Place queen in next row | Skip columns/diagonals already attacked (`set()` of cols + diags) |
| **Sudoku** | Fill next empty cell | Skip digits violating row / col / 3×3 box |
| **Word search** | Move into adjacent cell | Mark visited; backtrack to unmark |
| **Palindrome partitioning** | Cut at next index | Cut only if substring is palindrome |
| **Letter combinations of phone number** | Pick a letter for current digit | None — fixed branching factor |

**Subsets (most-asked variant) — minimal:**

```python
def subsets(nums):
    res = []
    def bt(start, path):
        res.append(path[:])                  # every node = a subset
        for i in range(start, len(nums)):
            path.append(nums[i])
            bt(i + 1, path)                  # i+1 = no reuse
            path.pop()
    bt(0, [])
    return res
```

**Permutations (use a `used` array, not slicing):**

```python
def permute(nums):
    res, used = [], [False] * len(nums)
    def bt(path):
        if len(path) == len(nums):
            res.append(path[:]); return
        for i in range(len(nums)):
            if used[i]: continue
            used[i] = True; path.append(nums[i])
            bt(path)
            path.pop(); used[i] = False
    bt([])
    return res
```

**Pruning techniques (each cuts the tree):**

| Technique | Effect |
|---|---|
| **Constraint check first** | Reject candidate before recursing |
| **Sort the input** | Enables early termination when sum exceeds target / when next candidate too large |
| **Skip duplicates at same depth** | After sorting, `if i > start and a[i]==a[i-1]: continue` |
| **Domain reduction** (Sudoku) | Track allowed values per row/col/box as sets; pick the most-constrained cell first |
| **Memoize signature** of partial state | Borderline DP — only when state is hashable and overlap is real |
| **Branch & bound** | Track best-so-far; prune any branch whose lower bound ≥ best |
| **Symmetry breaking** | Generate canonical form (e.g. first column < second column for grids) |

**Choose data structures that backtrack cheaply:**

| Structure | Add | Remove | Notes |
|---|---|---|---|
| `list` (used as stack) | `path.append(x)` | `path.pop()` | The default |
| `dict` (visited / counts) | `d[k] = v` | `del d[k]` (or sentinel) | Use `defaultdict(int)` + decrement |
| `set` (visited cells, used columns) | `s.add(x)` | `s.discard(x)` | O(1) lookup |
| Bitmask integer | `mask \| (1<<i)` | `mask & ~(1<<i)` | Fastest for ≤ 64 elements |
| Sorted state | re-sort | tricky | Avoid if you must un-do; prefer immutable / re-derive |

**Complexity intuition (B = branch factor, D = depth):**

| Pattern | Time |
|---|---|
| Subsets of n | O(2ⁿ · n) — n for the copy of each path |
| Permutations of n | O(n! · n) |
| Combinations C(n, k) | O(C(n,k) · k) |
| N-queens (n) | Exponential, but pruning cuts it dramatically |
| Word search in m × n grid | O(m·n·4ᴸ) where L is word length |

> Backtracking is **exponential in the worst case** by definition. Pruning is the difference between "1 second" and "heat death of the universe" on the same code.

**Recursion mechanics — what to watch:**

| Concern | Detail |
|---|---|
| Call stack depth | Python default 1000; can `sys.setrecursionlimit(10⁶)` for competitive code |
| Tail-call optimization | **Python and Java don't do it.** Convert deep tail recursion to a loop |
| Mutable shared state | `path` is mutated — always copy on append-to-result |
| Iterative conversion | Replace recursion with explicit stack of `(state, action)` tuples for very deep trees |

**Common mistakes:**

| Mistake | Fix |
|---|---|
| `result.append(path)` instead of `path[:]` | Copy on append — list is mutated below |
| Not popping after recursive call | Path "leaks" into other branches |
| Re-checking validity inside `is_complete` instead of in the loop | Wastes the recursion frame |
| Ignoring duplicates in input | Sort + skip-equal-at-same-depth |
| Using `+` to extend path (creates copies but not the right snapshot) | Mutate-in-place + pop is faster and clearer |
| Forgetting symmetry — generating mirror solutions | Add canonical-form constraint |
| Recursing when iteration is fine (Fibonacci, sum) | Save the stack frames |

**When to reach for backtracking:**

| Question phrasing | Strategy |
|---|---|
| "Find all subsets / permutations / combinations" | Backtracking |
| "Place / arrange under constraints" | Backtracking with pruning |
| "Solve this puzzle / grid" | Backtracking with constraint propagation |
| "Find the **best** value" | DP (or BFS for shortest path) |
| "Count the number of ways" | DP (often) |

**Rule of thumb:** **choose → explore → un-choose.** Always **copy** before appending a path to the result. **Sort inputs** to enable early-break and duplicate-skip pruning. **Prune the moment a path can't be valid** — pruning is what makes backtracking actually fast. If the question asks for *all* solutions, backtrack; if it asks for the *best* one, reach for DP.
