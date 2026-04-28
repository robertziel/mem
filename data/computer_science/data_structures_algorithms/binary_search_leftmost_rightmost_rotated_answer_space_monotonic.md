### Binary Search (leftmost, rightmost, rotated, answer space, monotonic)

**When:** sorted data, **or** a monotonic predicate `f: int → bool`. The recurring trick is "binary search on the answer".

**Schema:**

| Form | Loop guard | Invariant |
|---|---|---|
| Exact match | `lo <= hi` | Answer is in `[lo..hi]`; shrink by 1 each side |
| Leftmost (lower bound) | `lo < hi` | First index where `arr[i] >= target` |
| Rightmost (upper bound) | `lo < hi` | Last index where `arr[i] <= target` |
| Search on answer | `lo < hi` | Smallest X with `condition(X) = true` |

**Exact-match template:**

```python
def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if   arr[mid] == target: return mid
        elif arr[mid] <  target: lo = mid + 1
        else:                    hi = mid - 1
    return -1                                    # `lo` is the insertion point
```

**Leftmost (`bisect_left` equivalent):** smallest `i` with `arr[i] >= target`.

```python
def lower_bound(arr, target):
    lo, hi = 0, len(arr)                         # hi exclusive
    while lo < hi:
        mid = (lo + hi) // 2
        if arr[mid] >= target: hi = mid
        else:                  lo = mid + 1
    return lo
```

**Rightmost (`bisect_right` equivalent):** smallest `i` with `arr[i] > target`.

```python
def upper_bound(arr, target):
    lo, hi = 0, len(arr)
    while lo < hi:
        mid = (lo + hi) // 2
        if arr[mid] > target: hi = mid
        else:                 lo = mid + 1
    return lo
```

**Python `bisect` module (use it, don't reinvent):**

```python
import bisect
bisect.bisect_left(arr, x)        # first i with arr[i] >= x
bisect.bisect_right(arr, x)       # first i with arr[i] > x
bisect.insort(arr, x)             # insert keeping sorted (O(log n) search + O(n) shift)
```

**Search in rotated sorted array (no duplicates):**

```python
def rotated_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target: return mid
        if arr[lo] <= arr[mid]:                  # left half is sorted
            if arr[lo] <= target < arr[mid]: hi = mid - 1
            else:                            lo = mid + 1
        else:                                    # right half is sorted
            if arr[mid] < target <= arr[hi]: lo = mid + 1
            else:                            hi = mid - 1
    return -1
```

**Find peak element (any peak):**

```python
def find_peak(arr):
    lo, hi = 0, len(arr) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if arr[mid] > arr[mid + 1]: hi = mid
        else:                       lo = mid + 1
    return lo
```

**Search on answer (the most common interview pattern):**

```python
# "What is the smallest X such that condition(X) is true?"
def search_on_answer(lo, hi, condition):
    while lo < hi:
        mid = (lo + hi) // 2
        if condition(mid): hi = mid                 # answer is mid or earlier
        else:              lo = mid + 1             # answer is later
    return lo
```

**Concrete: Koko eating bananas (smallest speed `k` to finish in `H` hours):**

```python
import math
def min_eating_speed(piles, H):
    def can_finish(k):
        return sum(math.ceil(p / k) for p in piles) <= H
    lo, hi = 1, max(piles)
    while lo < hi:
        mid = (lo + hi) // 2
        if can_finish(mid): hi = mid
        else:               lo = mid + 1
    return lo
```

**Patterns map (search-on-answer):**

| Problem | Predicate `condition(X)` |
|---|---|
| Koko eating bananas | "Eat all in H hours at speed X?" |
| Ship within D days | "Capacity X ships in ≤ D days?" |
| Split array largest sum | "Splitting with each part ≤ X uses ≤ K parts?" |
| Aggressive cows | "Place K cows with min distance ≥ X?" |
| Min days to make M bouquets | "By day X, can we make M bouquets?" |
| Median of two sorted arrays | Partition both at indices summing to total/2 |
| Square root of N | "X² ≤ N?" |
| Find K-th smallest in sorted matrix | Count cells ≤ X = K |

**Pick the right template:**

| Goal | Template |
|---|---|
| Find target's index | Exact-match (`lo <= hi`, `mid ± 1`) |
| First index with property | Leftmost (`lo < hi`, `hi = mid`) |
| Last index with property | Rightmost (`lo < hi`, `mid = (lo+hi+1)//2`, `lo = mid`) |
| Smallest valid answer | Search on answer (`lo < hi`, `hi = mid`) |
| Largest valid answer | Search on answer flipped (`mid = (lo+hi+1)//2`, `lo = mid`) |

**Complexity:** O(log N) per search. For "binary search on answer", multiply by `O(condition)`: total O(log(range) · O(check)).

**Pitfalls:**

| Mistake | Fix |
|---|---|
| `mid = (lo + hi) // 2` overflow (other langs) | Use `lo + (hi - lo) // 2` |
| Infinite loop with `lo = mid` and even split | Use `mid = (lo + hi + 1) // 2` for "go right" |
| Off-by-one between inclusive `hi` and exclusive `hi` | Pick a convention and stick with it |
| Predicate not actually monotonic | Binary search needs monotonicity — verify! |
| Wrong loop guard (`lo <= hi` vs `lo < hi`) | Match it to the template |

**Rule of thumb:** if the array is sorted, **binary search**. If the input isn't an array but a **monotonic predicate** (over speed, capacity, distance, time, etc.), **binary search on the answer**. Use `bisect_left` / `bisect_right` to skip writing the loop. The hardest part is **proving monotonicity** — once you have it, the rest is templates.
