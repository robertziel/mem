### Self-balancing BSTs (AVL, Red-Black, B-tree, Splay)

**When:** ordered keys with guaranteed O(log n) ops — `TreeMap`, `std::map`, database indices, OS schedulers. You almost never code these from scratch in interviews; you describe them.

**Why balance matters:** unbalanced BST degenerates to O(n). Self-balancing trees enforce a height invariant via **rotations** on insert / delete.

**Comparison:**

| Tree | Balance rule | Worst height | Rotations | Where used |
|---|---|---|---|---|
| AVL | `|h(L) - h(R)| ≤ 1` strictly | ≤ 1.44·log₂(n+2) | Up to O(log n) per op | Read-heavy workloads |
| Red-Black | Black-height equal; constraints on red nodes | ≤ 2·log₂(n+1) | ≤ 3 per insert/delete | **Java TreeMap, C++ std::map, Linux CFS scheduler, Linux epoll** |
| B-tree / B+ | Branch factor `t`; all leaves same depth | log_t(n) | Splits & merges | **Databases, filesystems** (disk-page friendly) |
| Splay | Recently accessed → root | Amortized log n | Splay = double rotation | Caches with locality |
| Treap | Heap on random priorities | Probabilistic O(log n) | Single rotation | Competitive programming |

**Why interview-relevant differences:**

| Property | AVL | Red-Black |
|---|---|---|
| Strict balance | ✓ | Loose (factor 2 height ratio) |
| Insert/delete rotations | More | Fewer (≤ 3) |
| Search speed | Slightly faster | Slightly slower |
| Implementation | Simpler invariant, harder rebalance | More cases, but well-bounded |
| Default in libraries | Rare | **Most language standard libs** |

**Rotation primitive (the building block):**

```
        x                  y
       / \                / \
      A   y     ⇒        x   C
         / \            / \
        B   C          A   B
   (left rotation around x)
```

**Red-Black properties (memorize):**

| # | Property |
|---|---|
| 1 | Every node is **red or black** |
| 2 | Root is **black** |
| 3 | Every leaf (NIL) is black |
| 4 | Red node has only black children (no two reds in a row) |
| 5 | Every path from a node to descendant NIL contains the same number of black nodes |

These five together force `height ≤ 2·log₂(n+1)`.

**B-tree / B+ tree (database indices):**

| Aspect | B-tree | B+ tree |
|---|---|---|
| Data storage | Internal nodes hold values too | Values **only in leaves** |
| Leaf links | None | Linked list — fast range scan |
| Used by | MongoDB (older), some FS | **MySQL InnoDB, PostgreSQL, SQLite** |

> B-trees minimize **disk I/O**. Each node = one disk page; branching factor in the hundreds means trees are very shallow (height 3–4 for billions of rows).

**Splay tree:** every accessed node is rotated to the root. Recently accessed items become fast to access again — natural cache behavior. Amortized O(log n); worst case per op O(n).

**Operations cost (all balanced variants):**

| Op | Time |
|---|---|
| Search | O(log n) |
| Insert | O(log n) |
| Delete | O(log n) |
| In-order traversal | O(n) |
| K-th smallest (size-augmented) | O(log n) |
| Range query | O(log n + k) |

**When to pick which:**

| Need | Pick |
|---|---|
| Default ordered map | Red-Black (the standard-library default) |
| Frequent searches, fewer modifications | AVL |
| Disk-resident / huge data | B+ tree |
| Workload with locality (LRU-like) | Splay |
| Quick to implement in contest | Treap |
| O(1) amortized for skewed / biased keys | Splay |

**Pitfalls:**

| Mistake | Fix |
|---|---|
| "Just sort then binary-search" with frequent inserts | Use balanced BST — O(log n) per insert beats O(n) shifts |
| Implementing AVL in interview | Almost never asked; describe the invariant instead |
| Confusing B-tree with binary tree | B-tree has high branching factor (hundreds) |

**Rule of thumb:** when the question says **"ordered map"**, **"sorted by key with O(log n) ops"**, or **"like a database index"** — that's a balanced BST. Don't reach for one when a hash map / heap / sorted array suffices: balanced BSTs are correct but rarely the simplest answer.
