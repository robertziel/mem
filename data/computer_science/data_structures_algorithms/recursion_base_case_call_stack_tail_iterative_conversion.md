### Recursion (base case, call stack, iterative conversion)

**When:** problem decomposes into smaller self-similar subproblems (trees, divide & conquer, backtracking).

**Schema (every recursion has):**

| Component | Question to answer |
|---|---|
| Base case | When do I stop and return directly? |
| Recursive case | How do I reduce the problem? |
| Combine | How do I merge sub-answers into mine? |
| State | What's passed down vs computed up? |

**Skeleton:**

```python
def recurse(state):
    if base_condition(state):
        return base_value
    sub = recurse(reduce(state))
    return combine(state, sub)
```

**Top-down memo (recursion + cache):**

```python
from functools import lru_cache
@lru_cache(maxsize=None)
def f(state):
    if base(state): return base_value
    return combine(state, f(reduce(state)))
```

**Recursion mechanics:**

| Concern | Detail |
|---|---|
| Python stack default | 1000 frames; `sys.setrecursionlimit(10⁶)` for competitive code |
| Tail-call optimization | **Python and Java do NOT do it** — convert to loop |
| Mutable state | Always copy with `path[:]` before appending to result |
| Hashable state for memo | Convert lists / sets to tuple / frozenset |
| Deep recursion | Convert to iterative DFS with explicit stack of `(state, action)` |

**Iterative conversion pattern (when stack overflows):**

```python
stack = [(initial_state, "enter")]
while stack:
    state, phase = stack.pop()
    if phase == "enter":
        if base(state): continue
        stack.append((state, "exit"))                # come back after children
        for sub in reduce(state):
            stack.append((sub, "enter"))
    else:                                            # children done — post-order
        # combine sub-results here
        ...
```

**Common pitfalls:**

| Mistake | Fix |
|---|---|
| Missing base case | Infinite recursion → stack overflow |
| Modifying caller's data | Copy before mutate, or pass index |
| Recomputing same subproblem | Memoize |
| Quadratic by re-slicing | Pass `lo, hi` indices instead of `arr[lo:hi]` |
| Recursion when iteration fits (Fibonacci, sum) | Save stack frames |

**Rule of thumb:** **base case first**, then recursive case. **Memoize** if subproblems overlap. **Convert to iteration** if stack depth > 10⁴ or for tail-recursive shapes (Python / Java don't TCO).
