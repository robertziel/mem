### Prefix Sum (range query, difference array, 2D cumulative)

**When:** many range-sum queries over a static array, or range updates with batched query. Trades preprocessing for O(1) query.

**Schema (1D):**

| Symbol | Meaning |
|---|---|
| `prefix[0] = 0` | Sentinel for clean indexing |
| `prefix[i] = arr[0] + … + arr[i-1]` | Sum of first `i` elements |
| `range[l..r] = prefix[r+1] - prefix[l]` | O(1) range sum |

**1D template:**

```python
prefix = [0] * (len(arr) + 1)
for i, x in enumerate(arr):
    prefix[i + 1] = prefix[i] + x

def range_sum(l, r):                  # inclusive
    return prefix[r + 1] - prefix[l]
```

**2D prefix sum (matrix range sum):**

```python
m, n = len(M), len(M[0])
P = [[0] * (n + 1) for _ in range(m + 1)]
for i in range(m):
    for j in range(n):
        P[i+1][j+1] = M[i][j] + P[i][j+1] + P[i+1][j] - P[i][j]

# sum of rectangle (r1,c1)..(r2,c2), inclusive
def rect(r1, c1, r2, c2):
    return P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1]
```

**Difference array (range update + point query):**

```python
diff = [0] * (n + 1)
def update(l, r, v):                 # add v to arr[l..r]
    diff[l] += v
    diff[r + 1] -= v

# Final array: prefix sum of diff
out = [0] * n; running = 0
for i in range(n):
    running += diff[i]
    out[i] = running
```

**Pattern: subarray sum equals K (works with negatives):**

```python
# Number of subarrays with sum == K
from collections import Counter
counts = Counter({0: 1})           # empty prefix sum
total = res = 0
for x in arr:
    total += x
    res += counts[total - K]       # how many earlier prefixes leave us at K?
    counts[total] += 1
return res
```

**Use case map:**

| Problem | Trick |
|---|---|
| Range sum query (immutable) | 1D prefix sum |
| Range sum 2D (immutable) | 2D inclusion-exclusion |
| Range increment + final array | Difference array, then prefix sum |
| Subarray sum = K (negatives OK) | prefix-sum counter map |
| Subarray sum divisible by K | counter on `prefix % K` |
| Count "equal #0 / #1" subarrays | Map +1 / -1, prefix-sum equal indices |

**Complexity:** O(n) preprocess, O(1) query. 2D: O(m·n) preprocess, O(1) per rectangle.

**Mutable + range queries → use Fenwick or segment tree instead.**

**Rule of thumb:** if the array is **static** and you have **many range queries**, prefix sum is O(1) per query after O(n) prep. For **range update + range query**, jump to **segment tree (lazy)**. For **range update + point query**, **difference array** is the simplest tool.
