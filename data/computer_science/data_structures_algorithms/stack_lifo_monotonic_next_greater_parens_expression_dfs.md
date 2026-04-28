### Stack (LIFO, monotonic, next greater, parens, expression, DFS)

**When:** "last in, first out" matches the problem — undo, function calls, nested structure validation, next-greater scans, iterative DFS.

**Schema:**

| Op | Cost | Python |
|---|---|---|
| Push | O(1) | `stack.append(x)` |
| Pop | O(1) | `stack.pop()` |
| Peek (top) | O(1) | `stack[-1]` |
| Size | O(1) | `len(stack)` |
| Empty? | O(1) | `not stack` |

**Patterns by question signature:**

| Pattern | Question signature | What you push |
|---|---|---|
| Monotonic increasing | Next smaller / previous smaller | Indices, popping while top is larger |
| Monotonic decreasing | Next greater / previous greater | Indices, popping while top is smaller |
| Parens / brackets | Balanced sequence | Open brackets; pop on close, check match |
| Expression evaluation | Infix → result | Operands and operators |
| Iterative DFS | Tree / graph traversal | Nodes (or `(node, state)` for post-order) |
| Histogram / rectangle | Largest rectangle in histogram | Index of bars |

**Valid parentheses:**

```python
pairs = {')': '(', ']': '[', '}': '{'}
stack = []
for ch in s:
    if ch in '([{': stack.append(ch)
    elif not stack or stack.pop() != pairs[ch]: return False
return not stack
```

**Monotonic stack — next greater element to the right:**

```python
n = len(arr); res = [-1] * n
stack = []                     # stores indices, values decreasing
for i in range(n):
    while stack and arr[stack[-1]] < arr[i]:
        res[stack.pop()] = arr[i]
    stack.append(i)
return res
```

**Largest rectangle in histogram:**

```python
stack = []; best = 0
heights = arr + [0]            # sentinel
for i, h in enumerate(heights):
    while stack and heights[stack[-1]] > h:
        top = stack.pop()
        left = stack[-1] if stack else -1
        best = max(best, heights[top] * (i - left - 1))
    stack.append(i)
return best
```

**Min stack (push / pop / top / getMin in O(1)):**

```python
class MinStack:
    def __init__(self): self.s = []; self.m = []
    def push(self, x):
        self.s.append(x)
        self.m.append(x if not self.m else min(x, self.m[-1]))
    def pop(self):  self.s.pop(); self.m.pop()
    def top(self):  return self.s[-1]
    def getMin(self): return self.m[-1]
```

**Iterative DFS post-order (when recursion would overflow):**

```python
stack = [(root, False)]
while stack:
    node, visited = stack.pop()
    if not node: continue
    if visited: process(node); continue
    stack.append((node, True))
    stack.append((node.right, False))
    stack.append((node.left, False))
```

**Classic problems:**

| Problem | Stack content | Pop trigger |
|---|---|---|
| Valid parens | Open brackets | Mismatched close |
| Daily temperatures | Indices, decreasing temps | Current > top |
| Trapping rain water (stack version) | Indices, decreasing heights | Current > top → fill basin |
| Decode string `3[a2[b]]` | Counts and prefixes | `]` triggers expansion |
| Asteroid collision | Surviving asteroids | New negative meets positive top |
| Simplify Unix path | Path components | `..` pops the top |

**Complexity:** O(n) for monotonic stack patterns (each index pushed/popped once).

**Rule of thumb:** if "last in, first out" or "match nested structure" — stack. **Monotonic stack** turns most "next greater / previous smaller" problems from O(n²) brute force into **O(n)**.
