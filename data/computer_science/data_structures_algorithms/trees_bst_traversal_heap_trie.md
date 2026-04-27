### Trees

**Binary tree terminology:**
- **Root** - top node, no parent
- **Leaf** - node with no children
- **Height** - longest path from node to leaf
- **Depth** - path length from root to node
- **Balanced** - height difference between subtrees <= 1

**Binary Search Tree (BST):**
- Left child < node < right child (for all nodes)
- Search/insert/delete: O(h), h = height
- Balanced BST: O(log n), Degenerate (linked list): O(n)

**Tree traversals:**
```
        1
       / \
      2   3
     / \
    4   5

Inorder   (LNR): 4, 2, 5, 1, 3   <- BST gives sorted order
Preorder  (NLR): 1, 2, 4, 5, 3   <- copy/serialize tree
Postorder (LRN): 4, 5, 2, 3, 1   <- delete tree, evaluate expression
Level-order (BFS): 1, 2, 3, 4, 5 <- level by level
```

**Recursive traversal:**
```python
def inorder(node):
    if not node: return
    inorder(node.left)
    process(node.val)
    inorder(node.right)
```

**Level-order (BFS):**
```python
from collections import deque
queue = deque([root])
while queue:
    node = queue.popleft()
    process(node.val)
    if node.left: queue.append(node.left)
    if node.right: queue.append(node.right)
```

**Self-balancing BSTs:**
- **AVL tree** - strictly balanced (height diff <= 1), rotations on insert/delete
- **Red-Black tree** - relaxed balance, fewer rotations (Java TreeMap, C++ std::map)
- **B-tree / B+ tree** - used in databases and filesystems, optimized for disk I/O

**Trie (prefix tree):**
- Each node represents a character, paths form words
- O(word length) insert/search
- Use for: autocomplete, spell check, IP routing, prefix matching

**Common tree problems:**
- Max depth / min depth
- Validate BST (inorder must be sorted)
- Lowest Common Ancestor (LCA)
- Serialize / deserialize
- Path sum, diameter of binary tree
- Invert binary tree (swap left and right recursively)

**Heap (priority queue):**
- Complete binary tree stored as array
- Max-heap: parent >= children. Min-heap: parent <= children
- Insert: O(log n), Extract min/max: O(log n), Peek: O(1)
- Use for: top-K elements, merge K sorted lists, median finder

```
Array representation: parent(i) = (i-1)/2, left(i) = 2i+1, right(i) = 2i+2
```

**Rule of thumb:** DFS (recursive/stack) for path-based problems, BFS (queue) for level-based or shortest path. BST inorder = sorted. Heap for top-K and scheduling. Trie for prefix operations.
