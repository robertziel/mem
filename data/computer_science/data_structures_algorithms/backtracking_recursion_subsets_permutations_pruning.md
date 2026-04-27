### Backtracking and Recursion

**Recursion pattern:**
```python
def solve(state):
    if base_case(state):
        return result
    # break into sub-problems
    return combine(solve(sub_problem_1), solve(sub_problem_2))
```

**Backtracking pattern:**
- Build solution incrementally, abandon paths that can't lead to valid solution
- Systematic exploration of all possibilities with pruning
```python
def backtrack(candidates, path, result):
    if is_complete(path):
        result.append(path[:])    # found a valid solution
        return
    for candidate in candidates:
        if is_valid(candidate, path):
            path.append(candidate)       # choose
            backtrack(candidates, path, result)  # explore
            path.pop()                   # un-choose (backtrack)
```

**Classic backtracking problems:**

**Subsets (all combinations):**
```python
def subsets(nums):
    result = []
    def backtrack(start, path):
        result.append(path[:])
        for i in range(start, len(nums)):
            path.append(nums[i])
            backtrack(i + 1, path)
            path.pop()
    backtrack(0, [])
    return result
```

**Permutations:**
```python
def permutations(nums):
    result = []
    def backtrack(path, used):
        if len(path) == len(nums):
            result.append(path[:])
            return
        for i in range(len(nums)):
            if used[i]: continue
            used[i] = True
            path.append(nums[i])
            backtrack(path, used)
            path.pop()
            used[i] = False
    backtrack([], [False] * len(nums))
    return result
```

**N-Queens, Sudoku, word search, combination sum** all follow the same pattern.

**When to use backtracking vs DP:**
| Backtracking | Dynamic Programming |
|-------------|-------------------|
| Find ALL solutions | Find OPTIMAL solution |
| Constraint satisfaction | Optimization (min/max/count) |
| Pruning reduces search space | Overlapping subproblems |
| Subsets, permutations, N-queens | Knapsack, shortest path, coin change |

**Pruning (making backtracking efficient):**
- Skip invalid candidates early (don't explore dead-end paths)
- Sort candidates to enable early termination
- Use constraints to reduce search space

**Recursion complexity:**
- Each call branches B ways, depth D: time O(B^D)
- Subsets: O(2^n), Permutations: O(n!), Combinations: O(C(n,k))
- Space: O(D) for call stack (depth of recursion)

**Tail recursion:**
- Last operation is the recursive call (can be optimized to iteration by some compilers)
- Not all languages optimize (Python and Java do not)

**Rule of thumb:** Backtracking = "choose, explore, un-choose". Use for generating all valid solutions. Prune early to avoid unnecessary work. If you only need the optimal answer (not all answers), prefer DP.
