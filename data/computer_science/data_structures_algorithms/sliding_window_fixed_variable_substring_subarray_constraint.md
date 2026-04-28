### Sliding Window

**When:** "longest / shortest / count of subarray (or substring) satisfying constraint". Window grows right, shrinks left to restore validity.

**Schema:**

| Variant | When |
|---|---|
| Fixed-size K | "Max sum of K consecutive elements", "average of size K" |
| Variable, max length | "Longest substring without repeat", "longest with at most K distinct" |
| Variable, min length | "Smallest subarray with sum ≥ S" |
| Count windows | "Number of subarrays with exactly K distinct" → use **at-most-K minus at-most-K-1** |

**Fixed-size template:**

```python
# Max sum of K consecutive elements
window_sum = sum(arr[:k])
best = window_sum
for right in range(k, len(arr)):
    window_sum += arr[right] - arr[right - k]
    best = max(best, window_sum)
return best
```

**Variable-size template (max length):**

```python
# Longest substring without repeating chars
seen = {}; left = best = 0
for right, ch in enumerate(s):
    if ch in seen and seen[ch] >= left:
        left = seen[ch] + 1
    seen[ch] = right
    best = max(best, right - left + 1)
return best
```

**Variable-size template (min length):**

```python
# Smallest subarray with sum >= S (positive ints)
left = total = 0; best = float('inf')
for right in range(len(arr)):
    total += arr[right]
    while total >= S:
        best = min(best, right - left + 1)
        total -= arr[left]; left += 1
return best if best != float('inf') else 0
```

**At-most-K trick (count exactly K distinct):**

```python
# exactly_k = at_most(k) - at_most(k - 1)
def at_most(k):
    count = {}; left = res = 0
    for right, x in enumerate(arr):
        count[x] = count.get(x, 0) + 1
        while len(count) > k:
            count[arr[left]] -= 1
            if count[arr[left]] == 0: del count[arr[left]]
            left += 1
        res += right - left + 1
    return res
```

**Classic problems:**

| Problem | Window state | Shrink condition |
|---|---|---|
| Longest substring no-repeat | char → last index | Char already in window |
| Min window substring | needed counts; have/missing | Window valid; shrink while valid |
| Longest with at most K distinct | char → count | distinct > K |
| Permutation in string (anagram) | freq array, fixed K | Move on each step |
| Max sum subarray of size K | running sum | None (fixed) |
| Subarrays product < K (positive) | running product | product ≥ K |

**Complexity:** O(n) time (each element enters/leaves once), O(K) space for window state.

**Pitfalls:**

| Mistake | Fix |
|---|---|
| Updating result before window valid | Update only after restoring validity |
| Using `if` instead of `while` for shrink | `while` until invariant holds |
| Counting "exactly K" directly | Use `at_most(k) - at_most(k-1)` |
| Negative numbers break monotonic shrink | Sliding window assumes monotonicity — use prefix sum + hash map |

**Rule of thumb:** if the question is about a **contiguous** subarray / substring with a constraint, sliding window gets it in **O(n)**. If the array can be **negative**, fall back to **prefix sum + hash map**.
