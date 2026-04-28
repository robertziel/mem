### Sorting (comparison: merge, quick, heap; non-comparison: counting, radix, Timsort)

**When:** preprocessing for binary search, two-pointer, greedy, or any "in order" requirement. The Ω(n log n) lower bound applies to comparison-based sorts; non-comparison sorts beat it under restricted input.

**Schema (algorithm comparison):**

| Algorithm | Best | Avg | Worst | Space | Stable | Notes |
|---|---|---|---|---|---|---|
| Bubble | O(n) | O(n²) | O(n²) | O(1) | ✓ | Educational only |
| Insertion | **O(n)** | O(n²) | O(n²) | O(1) | ✓ | **Best for nearly-sorted or small n** |
| Selection | O(n²) | O(n²) | O(n²) | O(1) | ✗ | Fewest swaps |
| Merge | O(n log n) | O(n log n) | O(n log n) | O(n) | ✓ | Predictable; **linked-list friendly** |
| Quick | O(n log n) | O(n log n) | O(n²) | O(log n) | ✗ | **Fastest in practice on arrays** |
| Heap | O(n log n) | O(n log n) | O(n log n) | O(1) | ✗ | **In-place, O(1) extra**; cache-unfriendly |
| Timsort (Python `sorted`, Java objects) | **O(n)** | O(n log n) | O(n log n) | O(n) | ✓ | **Default**; exploits runs |
| Counting | O(n+k) | O(n+k) | O(n+k) | O(k) | ✓ | Small integer range `k` |
| Radix | O(nk) | O(nk) | O(nk) | O(n+k) | ✓ | Fixed-length keys (digits / bytes) |
| Bucket | O(n+k) | O(n+k) | O(n²) | O(n+k) | ✓ | Uniform distribution |
| Shell | varies | O(n^1.3) | O(n²) | O(1) | ✗ | Insertion with gaps |

**Stability:** equal keys preserve relative input order. Matters when sorting by a secondary key after a primary key (compose sorts).

**Merge sort (canonical divide & conquer):**

```python
def merge_sort(arr):
    if len(arr) <= 1: return arr
    mid = len(arr) // 2
    L, R = merge_sort(arr[:mid]), merge_sort(arr[mid:])
    return merge(L, R)

def merge(L, R):
    out = []; i = j = 0
    while i < len(L) and j < len(R):
        if L[i] <= R[j]: out.append(L[i]); i += 1
        else:            out.append(R[j]); j += 1
    out.extend(L[i:]); out.extend(R[j:])
    return out
```

**Quick sort (Lomuto partition):**

```python
def quicksort(arr, lo=0, hi=None):
    if hi is None: hi = len(arr) - 1
    if lo >= hi: return
    pivot = arr[hi]
    i = lo
    for j in range(lo, hi):
        if arr[j] <= pivot:
            arr[i], arr[j] = arr[j], arr[i]; i += 1
    arr[i], arr[hi] = arr[hi], arr[i]
    quicksort(arr, lo, i - 1)
    quicksort(arr, i + 1, hi)
```

**Quickselect (k-th smallest in O(n) average):** Hoare partition + recurse on the side containing index `k`. Worst case O(n²), so pick a random pivot. In Python, prefer `heapq.nsmallest(k, arr)[-1]` (O(n log k)) — it's almost as fast and avoids the manual partition. Reach for hand-written quickselect only when you need true O(n) average and constants matter.

**Heap sort:**

```python
import heapq
def heap_sort(arr):
    heapq.heapify(arr)                           # O(n)
    return [heapq.heappop(arr) for _ in range(len(arr))]
```

**Counting sort (small integer range):**

```python
def counting_sort(arr, k):
    count = [0] * (k + 1)
    for x in arr: count[x] += 1
    out = []
    for v, c in enumerate(count):
        out.extend([v] * c)
    return out
```

**Radix sort (LSD — least significant digit first):**

```python
def radix_sort(arr):
    if not arr: return arr
    max_val = max(arr); exp = 1
    while max_val // exp > 0:
        buckets = [[] for _ in range(10)]
        for x in arr: buckets[(x // exp) % 10].append(x)
        arr = [x for b in buckets for x in b]
        exp *= 10
    return arr
```

**Pick by need:**

| Need | Pick |
|---|---|
| Default | **Built-in sort** (Timsort / dual-pivot quicksort) |
| Stability needed | Merge sort, Timsort |
| Linked list | **Merge sort** (no random access needed) |
| O(1) extra space, no stability | **Heap sort** |
| Small integer range (k ≤ n) | **Counting sort** |
| Fixed-length keys (digits, ASCII) | **Radix sort** |
| Nearly sorted | **Timsort, Insertion sort** |
| K-th element only | **Quickselect** (O(n) avg, no full sort) |
| External sort (data > RAM) | **Merge sort** with disk-resident runs |

**Lower bound:** comparison-based sort is Ω(n log n) (proof: decision tree height ≥ log₂(n!) ≈ n log n).

**Patterns map:**

| Problem | Trick |
|---|---|
| K largest / smallest | Quickselect, or heap of size K |
| Median in static array | Quickselect at k = n/2 |
| Sort linked list | Merge sort |
| Sort by frequency | Counter + sort by value |
| Sort dependent fields stably | Compose stable sorts (sort secondary first, then primary) |
| Sort 0/1/2 (Dutch flag) | Three-pointer partition in O(n) |
| Sort intervals by start | `sorted(intervals)` (default tuple compare) |

**Pitfalls:**

| Mistake | Fix |
|---|---|
| QuickSort on already-sorted with bad pivot | Use random / median-of-three pivot |
| Reaching for `O(n²)` sort on 10⁵ items | Built-in is O(n log n); use it |
| Using comparison sort for known-small-range integers | Counting / radix is O(n+k) |
| Recursion depth on adversarial input | QuickSort: tail-call optimize the larger half |
| Unstable sort when stability needed | Merge or Timsort, not heap or quick |

**Rule of thumb:** **use the built-in sort.** Reach for **counting / radix** only when integer keys have small range. **Quickselect** for "k-th element" without a full sort. **Merge sort** for linked lists and external sorting. **Stability matters** when you need a secondary order preserved.
