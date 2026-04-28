### Heap / Priority Queue (binary, top-K, merge K, median, two heaps)

**When:** repeatedly extract min/max — top-K, merge K sorted, scheduling, Dijkstra, Prim, streaming median.

**Schema (binary heap, array-backed):**

| Element | Index formula |
|---|---|
| Parent of `i` | `(i - 1) // 2` |
| Left child | `2*i + 1` |
| Right child | `2*i + 2` |

**Min-heap:** parent ≤ children. **Max-heap:** parent ≥ children.

**Operations:**

| Op | Cost | What |
|---|---|---|
| Insert (push) | O(log n) | Append, sift up |
| Extract min/max (pop) | O(log n) | Swap root/last, sift down |
| Peek | O(1) | `heap[0]` |
| Build heap (heapify) | O(n) | Sift down from middle backward |
| Decrease-key | O(log n) | Sift up — but Python `heapq` lacks it (use lazy delete) |

**Python `heapq` is min-heap:**

```python
import heapq
heap = []
heapq.heappush(heap, x)
m = heapq.heappop(heap)
heapq.heapify(arr)                      # in-place, O(n)

# Max-heap: negate
heapq.heappush(heap, -x)
m = -heapq.heappop(heap)

# Heap of tuples — sorted by first element
heapq.heappush(heap, (priority, item))
```

**Top-K largest:**

```python
import heapq
def top_k(arr, k):
    return heapq.nlargest(k, arr)        # O(n log k)

# Manual: maintain min-heap of size k
heap = []
for x in arr:
    heapq.heappush(heap, x)
    if len(heap) > k: heapq.heappop(heap)
return list(heap)                        # the k largest, unordered
```

**Merge K sorted lists / arrays:**

```python
import heapq
def merge_k(lists):
    heap = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]
    heapq.heapify(heap)
    out = []
    while heap:
        val, i, j = heapq.heappop(heap)
        out.append(val)
        if j + 1 < len(lists[i]):
            heapq.heappush(heap, (lists[i][j + 1], i, j + 1))
    return out
```

**Streaming median (two heaps):**

```python
import heapq
class MedianFinder:
    def __init__(self):
        self.lo = []      # max-heap of smaller half (negated)
        self.hi = []      # min-heap of larger half
    def addNum(self, x):
        heapq.heappush(self.lo, -x)
        heapq.heappush(self.hi, -heapq.heappop(self.lo))
        if len(self.hi) > len(self.lo):
            heapq.heappush(self.lo, -heapq.heappop(self.hi))
    def findMedian(self):
        if len(self.lo) > len(self.hi): return -self.lo[0]
        return (-self.lo[0] + self.hi[0]) / 2
```

**Patterns map:**

| Problem | Heap trick |
|---|---|
| Top-K largest / smallest | Min-heap of size K (or `nlargest`) |
| K-th largest in stream | Min-heap of size K; root is answer |
| Merge K sorted lists | Heap of head pointers |
| Median in stream | Two heaps (max for lower, min for upper) |
| Task scheduler | PQ of `(next_available_time, task)` |
| Reorganize string | Max-heap of counts, alternate |
| Meeting rooms II | Min-heap of meeting end times |
| Dijkstra / Prim | Min-heap of `(dist, node)` |
| K closest points | Max-heap of size K, keyed by dist |

**Lazy deletion (when you can't decrease-key):**

```python
heapq.heappush(heap, (new_priority, item))
# When popping, skip if the popped (priority, item) is stale
while heap and is_stale(heap[0]):
    heapq.heappop(heap)
```

**Heap vs sorted list vs balanced BST:**

| | Heap | Sorted list | Balanced BST |
|---|---|---|---|
| Min/max | O(1) peek, O(log n) pop | O(1) at one end | O(log n) |
| Arbitrary delete | O(n) | O(n) | O(log n) |
| Range query | ✗ | O(n) scan | O(log n + k) |
| Build | O(n) | O(n log n) | O(n log n) |

**Rule of thumb:** use a **min-heap of size K** for top-K (O(n log K) beats sort O(n log n)). **Two heaps** for streaming median. **Lazy delete** when you can't update keys (Python `heapq` doesn't support decrease-key).
