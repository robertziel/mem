### Binary Search Tree (BST, validate, in-order, LCA, balance check)

**When:** ordered keys with logarithmic insert / delete / search / range queries — and the order matters (predecessor / successor / k-th smallest).

**Schema:**

| Invariant | For every node X |
|---|---|
| Left subtree | All values **strictly less** than `X.val` |
| Right subtree | All values **strictly greater** than `X.val` |
| Recursive | Same property holds in both subtrees |

> In-order traversal yields a **strictly increasing** sequence — the universal BST validation trick.

**Operations:**

| Op | Balanced | Degenerate (sorted insert) |
|---|---|---|
| Search | O(log n) | O(n) |
| Insert | O(log n) | O(n) |
| Delete | O(log n) | O(n) |
| Min / max | O(log n) | O(n) |
| In-order successor / predecessor | O(log n) | O(n) |
| K-th smallest | O(log n) with size-augmented nodes | O(n) |

**Search:**

```python
def search(root, target):
    while root:
        if   target == root.val: return root
        elif target <  root.val: root = root.left
        else:                    root = root.right
    return None
```

**Insert (recursive):**

```python
def insert(root, x):
    if not root: return TreeNode(x)
    if x < root.val:  root.left  = insert(root.left,  x)
    elif x > root.val: root.right = insert(root.right, x)
    return root
```

**Delete (the tricky one — three cases):**

```python
def delete(root, x):
    if not root: return None
    if x < root.val:  root.left  = delete(root.left,  x)
    elif x > root.val: root.right = delete(root.right, x)
    else:
        # Case 1 / 2: at most one child
        if not root.left:  return root.right
        if not root.right: return root.left
        # Case 3: two children — replace with in-order successor
        succ = root.right
        while succ.left: succ = succ.left
        root.val = succ.val
        root.right = delete(root.right, succ.val)
    return root
```

**Validate BST (in-order monotonic):**

```python
def is_bst(root):
    prev = -float('inf')
    def inorder(n):
        nonlocal prev
        if not n: return True
        if not inorder(n.left): return False
        if n.val <= prev: return False
        prev = n.val
        return inorder(n.right)
    return inorder(root)
```

**Lowest Common Ancestor (BST version — O(h)):**

```python
def lca(root, p, q):
    while root:
        if   p.val < root.val and q.val < root.val: root = root.left
        elif p.val > root.val and q.val > root.val: root = root.right
        else: return root      # split point — this is the LCA
```

**K-th smallest (in-order, early exit):**

```python
def kth(root, k):
    stack = []; node = root
    while stack or node:
        while node:
            stack.append(node); node = node.left
        node = stack.pop()
        k -= 1
        if k == 0: return node.val
        node = node.right
```

**In-order successor / predecessor:**

| Goal | Algorithm |
|---|---|
| Successor (next larger) | If `node.right` exists → leftmost of `node.right`. Else walk up while node is the right child |
| Predecessor (next smaller) | Mirror: rightmost of `node.left`, or walk up while node is the left child |

**Balance check (height difference at every node ≤ 1):**

```python
def is_balanced(root):
    def height(n):
        if not n: return 0
        l = height(n.left); r = height(n.right)
        if l == -1 or r == -1 or abs(l - r) > 1: return -1
        return 1 + max(l, r)
    return height(root) != -1
```

**Pitfalls:**

| Mistake | Fix |
|---|---|
| Validating with only `node.left.val < node.val` | Must use **min/max bounds** (or full in-order) |
| Treating `<= , >=` as in-order strict | Strict BST has unique values; equal disallowed |
| Sorted insert without balancing | Degenerates to linked list; use AVL / Red-Black / treap |
| BST LCA with full DFS | Use the **walk-down** version — O(h), not O(n) |

**Rule of thumb:** in-order on BST = sorted. **Validate via in-order monotonicity** or recursive (min, max) bounds. **BST LCA walks down at O(h).** If keys are inserted in sorted order without balancing, you have a linked list — reach for **AVL / Red-Black / treap**.
