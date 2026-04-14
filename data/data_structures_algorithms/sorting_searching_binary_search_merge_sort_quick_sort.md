### Sorting and Searching

**Sorting algorithm comparison:**
| Algorithm | Best | Average | Worst | Space | Stable | Notes |
|-----------|------|---------|-------|-------|--------|-------|
| Bubble Sort | O(n) | O(n^2) | O(n^2) | O(1) | Yes | Educational only |
| Selection Sort | O(n^2) | O(n^2) | O(n^2) | O(1) | No | Fewest swaps |
| Insertion Sort | O(n) | O(n^2) | O(n^2) | O(1) | Yes | Good for nearly sorted |
| Merge Sort | O(n log n) | O(n log n) | O(n log n) | O(n) | Yes | Divide & conquer, predictable |
| Quick Sort | O(n log n) | O(n log n) | O(n^2) | O(log n) | No | Fastest in practice, cache-friendly |
| Heap Sort | O(n log n) | O(n log n) | O(n log n) | O(1) | No | In-place, not cache-friendly |
| Counting Sort | O(n+k) | O(n+k) | O(n+k) | O(k) | Yes | Integer keys, small range k |
| Radix Sort | O(nk) | O(nk) | O(nk) | O(n+k) | Yes | Fixed-length keys |

**Merge Sort (divide and conquer):**
```python
def merge_sort(arr):
    if len(arr) <= 1: return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)
```

**Quick Sort (in-place partition):**
```python
def quicksort(arr, lo, hi):
    if lo < hi:
        pivot = partition(arr, lo, hi)
        quicksort(arr, lo, pivot - 1)
        quicksort(arr, pivot + 1, hi)
```

**Binary Search:**
```python
def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if arr[mid] == target: return mid
        elif arr[mid] < target: lo = mid + 1
        else: hi = mid - 1
    return -1  # not found (lo = insertion point)
```

**Binary search variants:**
- **Find leftmost**: `if arr[mid] >= target: hi = mid` (bisect_left)
- **Find rightmost**: `if arr[mid] <= target: lo = mid` (bisect_right)
- **Search in rotated sorted array**: compare with endpoints to decide which half
- **Search on answer space**: binary search on the answer, not the array

**Search on answer space pattern:**
```python
# "What is the minimum X such that condition(X) is true?"
lo, hi = min_possible, max_possible
while lo < hi:
    mid = (lo + hi) // 2
    if condition(mid):
        hi = mid
    else:
        lo = mid + 1
return lo
```

**Which sort to use:**
- Language built-in (Timsort in Python, dual-pivot quicksort in Java) - default choice
- Merge sort - when stability needed, for linked lists, external sort
- Quick sort - fastest in-place for arrays
- Counting/Radix sort - when keys are integers in small range
- Heap sort - when O(1) extra space required and stability doesn't matter

**Rule of thumb:** Use the language's built-in sort (optimized Timsort or similar). Binary search on sorted data. Recognize "binary search on the answer" pattern for optimization problems. Merge sort for linked lists, counting sort for small integer ranges.
