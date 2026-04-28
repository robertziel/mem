### Binary Tree Traversal (pre / in / post / level, DFS, BFS)

**When:** any tree problem — first decision is "which traversal?". Pre/in/post differ only by *when* the node is processed relative to its children.

**Schema (the four orders):**

```
        1
       / \
      2   3
     / \
    4   5
```

| Order | Sequence on this tree | When to use |
|---|---|---|
| Pre-order (NLR) | 1, 2, 4, 5, 3 | Copy / serialize tree, prefix expressions |
| In-order (LNR) | 4, 2, 5, 1, 3 | **BST → sorted output**, validate BST |
| Post-order (LRN) | 4, 5, 2, 3, 1 | Delete tree, evaluate expression, return-up DP |
| Level-order (BFS) | 1, 2, 3, 4, 5 | Shortest path, level grouping, level averages |

**Recursive DFS:**

```python
def preorder(node):
    if not node: return
    process(node.val)
    preorder(node.left); preorder(node.right)

def inorder(node):
    if not node: return
    inorder(node.left); process(node.val); inorder(node.right)

def postorder(node):
    if not node: return
    postorder(node.left); postorder(node.right); process(node.val)
```

**Iterative in-order (when recursion depth too deep):**

```python
stack = []; node = root
while stack or node:
    while node:
        stack.append(node); node = node.left
    node = stack.pop()
    process(node.val)
    node = node.right
```

**Level-order (BFS) with level grouping:**

```python
from collections import deque
q = deque([root]) if root else deque()
levels = []
while q:
    level = []
    for _ in range(len(q)):                  # snapshot — process current level only
        n = q.popleft()
        level.append(n.val)
        if n.left:  q.append(n.left)
        if n.right: q.append(n.right)
    levels.append(level)
```

**Tree node:**

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val; self.left = left; self.right = right
```

**Common tree problems:**

| Problem | Traversal | Returns up |
|---|---|---|
| Max depth | Post-order | `1 + max(left, right)` |
| Min depth | Post-order or BFS | First leaf in BFS = early exit |
| Diameter | Post-order | (height, best diameter so far) |
| Validate BST | In-order monotonic check | Track previous value |
| LCA | Post-order | Node if both subtrees match |
| Path sum (root → leaf) | Pre-order with running sum | Boolean |
| All root-to-leaf paths | Pre-order with path stack | Append on leaf |
| Symmetric tree | Mirror DFS | Compare `(L.left, R.right)` and `(L.right, R.left)` |
| Invert tree | Post-order swap | Swap children |
| Serialize / deserialize | Pre-order with `null` markers | String |
| Right side view | BFS, take last of each level | — |
| Zigzag level order | BFS, alternate reverse | — |

**Diameter template (post-order returning two things):**

```python
def diameter(root):
    best = 0
    def height(n):
        nonlocal best
        if not n: return 0
        l, r = height(n.left), height(n.right)
        best = max(best, l + r)
        return 1 + max(l, r)
    height(root); return best
```

**Morris traversal (O(1) extra space, in-order):** thread the predecessor's right pointer to current; restore on second visit. Used when stack space matters.

**Pitfalls:**

| Mistake | Fix |
|---|---|
| Recursion depth > 10⁴ | Convert to iterative with explicit stack |
| Forgetting `null` check | First line of every recursive helper: `if not node: return ...` |
| Confusing pre vs post order | Post = "compute children first, then me"; needed when parent uses child results |
| BFS without level snapshot | Use `for _ in range(len(q))` to bound a level |

**Rule of thumb:** for tree problems — **DFS post-order if the parent uses child answers** (height, diameter, LCA), **DFS pre-order if you build a path or copy**, **BFS for level / shortest** problems. **In-order on a BST gives sorted output** — this is the validate-BST trick.
