### Skip List / Treap (randomized balanced BSTs, probabilistic O(log n))

**When:** ordered set / map with O(log n) expected ops, **without** the implementation pain of Red-Black or AVL trees. Skip lists power **Redis sorted sets**, LevelDB MemTable, ConcurrentSkipListMap. Treaps are the contest-default randomized BST.

**Schema (skip list):**

| Concept | Detail |
|---|---|
| Levels | Each node has a tower of forward pointers; height drawn from `Geometric(1/2)` |
| Search | Start at top-left; move right while next ≤ target; drop down |
| Expected height | O(log n) |
| Each level | Has half the nodes of the level below (in expectation) |
| Insert / delete | Search + relink at every level reached |

**Schema (treap):**

| Concept | Detail |
|---|---|
| Each node has | A **key** (BST property) and a **random priority** (heap property) |
| Tree shape | Determined entirely by priorities — random priorities → expected balanced |
| Rotations | Maintain heap invariant after insert / delete |
| Operations | Insert, delete, lookup, **split by key**, **merge** — all O(log n) expected |

#### Skip list — minimal implementation

```python
import random

class SkipNode:
    __slots__ = ("key", "next")
    def __init__(self, key, height):
        self.key = key; self.next = [None] * height

class SkipList:
    MAX_H = 32; P = 0.5
    def __init__(self):
        self.head = SkipNode(None, self.MAX_H)
        self.h = 1                                   # current max height in use

    def _rand_height(self):
        h = 1
        while h < self.MAX_H and random.random() < self.P: h += 1
        return h

    def search(self, k):
        x = self.head
        for i in range(self.h - 1, -1, -1):
            while x.next[i] and x.next[i].key < k: x = x.next[i]
        x = x.next[0]
        return x is not None and x.key == k

    def insert(self, k):
        update = [self.head] * self.MAX_H
        x = self.head
        for i in range(self.h - 1, -1, -1):
            while x.next[i] and x.next[i].key < k: x = x.next[i]
            update[i] = x
        h = self._rand_height()
        if h > self.h: self.h = h
        new = SkipNode(k, h)
        for i in range(h):
            new.next[i] = update[i].next[i]
            update[i].next[i] = new
```

> Range queries: walk level-0 from the search-start node — O(log n + r).

#### Treap — split / merge are the workhorses

```python
import random

class TNode:
    __slots__ = ("key", "prio", "left", "right", "size")
    def __init__(self, key):
        self.key = key; self.prio = random.random()
        self.left = self.right = None; self.size = 1

def upd(t):
    if t: t.size = 1 + (t.left.size if t.left else 0) + (t.right.size if t.right else 0)

def split(t, k):                                     # split by key: < k vs ≥ k
    if not t: return None, None
    if t.key < k:
        a, b = split(t.right, k); t.right = a; upd(t); return t, b
    else:
        a, b = split(t.left, k); t.left = b; upd(t); return a, t

def merge(a, b):                                     # all keys in a < all in b
    if not a or not b: return a or b
    if a.prio > b.prio:
        a.right = merge(a.right, b); upd(a); return a
    else:
        b.left = merge(a, b.left); upd(b); return b

def insert(t, k):
    a, b = split(t, k)
    return merge(merge(a, TNode(k)), b)

def remove(t, k):
    a, b = split(t, k)
    _, c = split(b, k + 1)                           # remove all == k
    return merge(a, c)
```

> **Implicit treap** (key = position) supports `O(log n)` insert / delete at any index, range reverse, and persistent variants — exactly the trick behind contest "rope" data structures.

#### Skip list vs Treap vs Red-Black

| Aspect | Skip list | Treap | Red-Black |
|---|---|---|---|
| Worst case | Expected O(log n) | Expected O(log n) | **Worst-case O(log n)** |
| Implementation | Easy | Medium | Hard |
| Range queries | Easy (level-0 walk) | Tree traversal | Tree traversal |
| Concurrency | **Easy** (locks per level / lock-free) | Hard | Very hard |
| Split / merge by key | Hard | **Easy** | Hard |
| Memory per node | Variable (tower) | Fixed (priority + ptrs) | Fixed (color + ptrs) |
| Used in | **Redis ZSET**, LevelDB MemTable, ConcurrentSkipListMap | Competitive coding | C++ std::map, Java TreeMap |

#### Implicit treap — the contest superpower

By using **subtree size** as the implicit key:

| Operation | Cost |
|---|---|
| Insert at index `i` | O(log n) |
| Delete at index `i` | O(log n) |
| Sum / max on range `[l, r]` | O(log n) (with augmentation) |
| Reverse range `[l, r]` | O(log n) (with reverse-flag lazy) |
| Cyclic shift | Two splits + a merge |
| Split / concat sequences | O(log n) |

> Like a "rope" or **Splay tree of an array** — but easier to implement.

#### Use cases

| Application | Structure |
|---|---|
| Redis sorted sets (ZADD / ZRANGE) | Skip list |
| LevelDB / RocksDB MemTable | Skip list |
| Java ConcurrentSkipListMap | Skip list |
| Competitive programming ordered set | Treap |
| Persistent ordered map | Persistent treap (priorities + path copy) |
| Range reverse / array-rotation problems | Implicit treap |
| Heaviest-element queries with order-statistics | Treap with size augmentation |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Same priority for two nodes (treap) | Use 64-bit floats / ints; collisions vanishingly rare |
| Skip-list height too low | `MAX_H = 32` supports 4 × 10⁹ nodes safely |
| Skip-list `P` too high | `P = 0.5` is the standard sweet spot |
| Building treap with same-tree priorities | Always re-sample priorities |
| Forgetting to update `size` after split/merge | `upd(t)` after every restructure |
| Using treap where worst-case matters (real-time) | Use Red-Black / AVL instead |
| Concurrent treap | Skip list is far easier to make lock-free |

#### Complexity (all expected)

| Op | Skip list | Treap |
|---|---|---|
| Search | O(log n) | O(log n) |
| Insert | O(log n) | O(log n) |
| Delete | O(log n) | O(log n) |
| Split / merge by key | O(n) (linked list level 0) | **O(log n)** |
| Range query | O(log n + r) | O(log n + r) |
| Concurrency | **Built-in friendly** | Hard |

**Rule of thumb:** **skip list = simplest production-quality ordered structure**, especially for **concurrency** (Redis, ConcurrentSkipListMap). **Treap = simplest contest-quality ordered structure**, especially when you need **split / merge by key** or **implicit-key array operations** (range reverse, insert anywhere). Use **Red-Black / AVL** only when **worst-case** O(log n) is required.
