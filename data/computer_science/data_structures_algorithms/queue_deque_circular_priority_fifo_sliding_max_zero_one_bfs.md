### Queue, Deque, Circular Queue, Priority Queue

**When:** FIFO (queue), both-ends in O(1) (deque), priority order (heap), or fixed-buffer ring (circular).

**Schema (variants):**

| Variant | Order | O(1) ops | Python |
|---|---|---|---|
| Queue (FIFO) | Insertion | enqueue tail, dequeue head | `collections.deque` |
| Deque | Both ends | append/appendleft/pop/popleft | `collections.deque` |
| Priority queue | Highest priority | push, pop-min | `heapq` (min-heap) |
| Circular queue | FIFO, fixed cap | Same as queue | Manual `arr[idx % cap]` |

> Don't use Python `list` as a queue — `pop(0)` is O(n). Use `deque`.

**Queue (BFS skeleton):**

```python
from collections import deque
q = deque([start])
visited = {start}
while q:
    node = q.popleft()
    for nb in graph[node]:
        if nb not in visited:
            visited.add(nb); q.append(nb)
```

**Deque — sliding window max:**

```python
from collections import deque
def sliding_max(arr, k):
    dq = deque()                    # stores indices, decreasing values
    out = []
    for i, x in enumerate(arr):
        while dq and dq[0] <= i - k: dq.popleft()        # drop out-of-window
        while dq and arr[dq[-1]] <= x: dq.pop()           # drop smaller
        dq.append(i)
        if i >= k - 1: out.append(arr[dq[0]])
    return out
```

**Deque — 0-1 BFS:**

```python
from collections import deque
def zero_one_bfs(graph, src):
    dist = {src: 0}; dq = deque([src]); seen = set()
    while dq:
        u = dq.popleft()
        if u in seen: continue          # settled — skip stale entries
        seen.add(u)
        for v, w in graph[u]:
            nd = dist[u] + w
            if nd < dist.get(v, float('inf')):
                dist[v] = nd
                if w == 0: dq.appendleft(v)
                else:      dq.append(v)
    return dist
```

**Priority queue (min-heap):**

```python
import heapq
heap = []
heapq.heappush(heap, (priority, item))
prio, item = heapq.heappop(heap)

# Max-heap: negate the priority
heapq.heappush(heap, (-priority, item))
```

**Circular queue (fixed-capacity ring buffer):**

```python
class CircularQueue:
    def __init__(self, k):
        self.q = [0] * k; self.k = k
        self.head = 0; self.size = 0
    def enqueue(self, x):
        if self.size == self.k: return False
        tail = (self.head + self.size) % self.k
        self.q[tail] = x; self.size += 1; return True
    def dequeue(self):
        if self.size == 0: return False
        self.head = (self.head + 1) % self.k; self.size -= 1; return True
    def front(self): return self.q[self.head] if self.size else -1
```

**Patterns map:**

| Problem | Use |
|---|---|
| Shortest path, unit weights | BFS with queue |
| Level-order tree traversal | Queue; mark level by `len(q)` snapshot |
| Sliding-window max / min | Monotonic deque |
| Top-K elements | Min-heap of size K |
| Merge K sorted lists / arrays | Min-heap of head pointers |
| Median from data stream | Two heaps (max + min) |
| Task scheduler | PQ ordered by next available time |
| 0-1 BFS (weights ∈ {0,1}) | Deque (front for 0, back for 1) |
| Dijkstra | Min-heap |

**Distributed-queue gotcha:** FIFO does **not** mean globally ordered across all workers. Order may be per queue, partition, or message group; retries can perturb it.

**Rule of thumb:** **`deque` for FIFO and sliding windows** — never `list.pop(0)`. **Heap for priority** (top-K, scheduling, Dijkstra). **Two heaps for streaming median.**
