### Backtracking (subsets, permutations, N-queens, Sudoku, pruning, choose / un-choose)

**When:** generate / count / enumerate **all** valid solutions to a constraint problem. Build incrementally; abandon any path that can't be valid.

**The pattern in one sentence:** *choose → explore → un-choose.*

**Backtracking vs DP — pick by question shape:**

| | Backtracking | DP |
|---|---|---|
| Goal | Find **all** valid | Optimal **value** |
| Mechanism | Search tree + pruning | Combine overlapping subproblems |
| Complexity | Exponential | Polynomial in state space |
| Example | Subsets, permutations, N-queens, Sudoku | Knapsack, coin change, edit distance |

**Schema:**

```python
def backtrack(state, path, result):
    if is_complete(path):
        result.append(path[:])               # SNAPSHOT — list is mutated below
        return
    for cand in candidates(state):
        if not is_valid(cand, path): continue # PRUNE
        path.append(cand)                     # CHOOSE
        backtrack(next(state), path, result)
        path.pop()                            # UN-CHOOSE
```

> The `path[:]` copy is **essential**. Appending the live `path` captures whatever it ends up as — the #1 backtracking bug.

**Subsets (every node = a subset):**

```python
def subsets(nums):
    res = []
    def bt(start, path):
        res.append(path[:])
        for i in range(start, len(nums)):
            path.append(nums[i])
            bt(i + 1, path)                  # i+1 = no reuse
            path.pop()
    bt(0, [])
    return res
```

**Subsets with duplicates (skip-equal-at-same-depth):**

```python
def subsets_with_dup(nums):
    nums.sort()
    res = []
    def bt(start, path):
        res.append(path[:])
        for i in range(start, len(nums)):
            if i > start and nums[i] == nums[i-1]: continue   # skip dup
            path.append(nums[i])
            bt(i + 1, path)
            path.pop()
    bt(0, [])
    return res
```

**Permutations (use a `used` array):**

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

**Permutations with duplicates:**

```python
# After sort: skip if same as left neighbor AND left neighbor not yet used at this level
if i > 0 and nums[i] == nums[i-1] and not used[i-1]: continue
```

**Combination sum (reuse allowed):**

```python
def combination_sum(candidates, target):
    candidates.sort()
    res = []
    def bt(start, remain, path):
        if remain == 0: res.append(path[:]); return
        for i in range(start, len(candidates)):
            if candidates[i] > remain: break               # sort + early break
            path.append(candidates[i])
            bt(i, remain - candidates[i], path)            # i (not i+1) — reuse same index
            path.pop()
    bt(0, target, [])
    return res
```

**N-queens:**

```python
def solve_n_queens(n):
    cols, diag1, diag2 = set(), set(), set()
    res = []
    def bt(row, board):
        if row == n: res.append(board[:]); return
        for c in range(n):
            if c in cols or (row - c) in diag1 or (row + c) in diag2: continue
            cols.add(c); diag1.add(row - c); diag2.add(row + c)
            board.append(c); bt(row + 1, board); board.pop()
            cols.remove(c); diag1.remove(row - c); diag2.remove(row + c)
    bt(0, [])
    return res
```

**Word search:** standard DFS in grid; mark cell `'#'` before recursing into 4 neighbors, restore on return. Same `choose / un-choose` shape applied to a 2D board.

**Pruning techniques (each cuts the search tree):**

| Technique | Effect |
|---|---|
| Constraint check first | Reject candidate **before** recursing |
| Sort the input | Enables early break + dup skip |
| Skip duplicates at same depth | After sort: `if i > start and a[i]==a[i-1]: continue` |
| Domain reduction (Sudoku) | Track allowed digits per row/col/box; pick most-constrained cell first |
| Branch & bound | Track best-so-far; prune branches whose lower bound ≥ best |
| Symmetry breaking | Generate only canonical-form solutions |

**Backtracking-friendly structures (cheap to undo):**

| Structure | Add | Remove |
|---|---|---|
| `list` (stack) | `path.append(x)` | `path.pop()` |
| `set` (visited) | `s.add(x)` | `s.discard(x)` |
| Bitmask integer | `mask \| (1 << i)` | `mask & ~(1 << i)` |

**Complexity intuition:**

| Pattern | Time |
|---|---|
| Subsets of n | O(2ⁿ · n) |
| Permutations of n | O(n! · n) |
| Combinations C(n, k) | O(C(n, k) · k) |
| N-queens | Exponential; pruning critical |
| Word search in m × n grid | O(m · n · 4ᴸ), L = word length |

**Common mistakes:**

| Mistake | Fix |
|---|---|
| `result.append(path)` | Use `path[:]` to copy |
| Not popping after recursion | Path "leaks" into other branches |
| Forgetting to mark visited | Word search produces wrong matches |
| Re-checking validity inside `is_complete` | Check before recursing — saves a frame |
| Generating mirror solutions | Add canonical-form constraint |
| Recursing for problems iteration handles | Save the stack frames |

**Rule of thumb:** **choose → explore → un-choose**. **Always copy** the path before appending to the result. **Sort inputs** to enable early break and dup skip. **Prune the moment a path can't be valid.** If the question asks for **all** solutions, backtrack; if it asks for the **best** one, reach for **DP**.
