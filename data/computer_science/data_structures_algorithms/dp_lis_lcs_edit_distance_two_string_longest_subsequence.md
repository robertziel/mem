### DP — LIS, LCS, Edit Distance (two-string, longest subsequence)

**When:** subsequence / common-subsequence problems on **one or two sequences**. The two staples that come up endlessly.

**Schema:**

| Family | State | Recurrence shape |
|---|---|---|
| LIS (single sequence) | `dp[i]` = longest IS ending at `i` | Look back at all `j < i` with `arr[j] < arr[i]` |
| LCS (two strings) | `dp[i][j]` = LCS of `s1[:i]` and `s2[:j]` | Match → diag+1; else max(left, up) |
| Edit distance | `dp[i][j]` = ops to convert `s1[:i] → s2[:j]` | 0 if match; else 1 + min(insert, delete, replace) |

#### LIS (Longest Increasing Subsequence)

**O(n²) DP:**

```python
def lis_n2(arr):
    if not arr: return 0
    dp = [1] * len(arr)
    for i in range(len(arr)):
        for j in range(i):
            if arr[j] < arr[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)
```

**O(n log n) — patience sort:**

```python
import bisect
def lis(arr):
    tails = []
    for x in arr:
        i = bisect.bisect_left(tails, x)
        if i == len(tails): tails.append(x)
        else:               tails[i] = x
    return len(tails)
```

> `tails[k]` = smallest tail of any increasing subsequence of length `k + 1`. The length of `tails` is the LIS length.

**Reconstruct the LIS:** in the n² version, save `parent[i] = best j`; walk back from `argmax(dp)`.

**Variants:**

| Problem | Tweak |
|---|---|
| Longest non-decreasing | `bisect_right` instead of `bisect_left` |
| Longest decreasing | Negate values, then LIS |
| Russian doll envelopes | Sort by width asc, height desc; LIS on heights |
| Longest bitonic subsequence | LIS forward + LIS backward, combine at peak |
| Number of LIS of max length | `count[i]` alongside `dp[i]` |
| Box stacking, weighted job scheduling | Sort + DP |

#### LCS (Longest Common Subsequence)

**Template (2D, O(m·n)):**

```python
def lcs(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0]*(n+1) for _ in range(m+1)]
    for i in range(1, m+1):
        for j in range(1, n+1):
            if s1[i-1] == s2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    return dp[m][n]
```

**Space-optimized to O(min(m,n)):** keep two rows.

**Reconstruct the LCS string (walk the table):**

```python
def lcs_string(s1, s2, dp):
    i, j = len(s1), len(s2); out = []
    while i > 0 and j > 0:
        if s1[i-1] == s2[j-1]: out.append(s1[i-1]); i -= 1; j -= 1
        elif dp[i-1][j] >= dp[i][j-1]: i -= 1
        else: j -= 1
    return ''.join(reversed(out))
```

**LCS variants:**

| Problem | Tweak |
|---|---|
| Longest common substring | Same DP but reset to 0 on mismatch; track running max |
| Shortest common supersequence | `m + n - LCS(s1, s2)` |
| Min insertions/deletions to convert s1 → s2 | `m + n - 2 · LCS(s1, s2)` |
| Min insertions to make palindrome | `n - LCS(s, reversed(s))` |
| Longest palindromic subsequence | LCS of `s` and `reversed(s)` |
| Distinct subsequences (count of subseq of s1 equal to s2) | Different recurrence: count rather than max |

#### Edit Distance (Levenshtein)

**Operations:** insert, delete, replace — each cost 1.

```python
def edit_distance(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0]*(n+1) for _ in range(m+1)]
    for i in range(m+1): dp[i][0] = i
    for j in range(n+1): dp[0][j] = j
    for i in range(1, m+1):
        for j in range(1, n+1):
            if s1[i-1] == s2[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = 1 + min(dp[i-1][j],     # delete from s1
                                    dp[i][j-1],     # insert into s1
                                    dp[i-1][j-1])   # replace
    return dp[m][n]
```

**Edit distance variants:**

| Problem | Tweak |
|---|---|
| One edit distance | Early exit if more than one diff |
| Edit distance with custom costs | Replace `1 + min(...)` with weighted versions |
| Regex match `'.' '*'` | Different recurrence; case on pattern char |
| Wildcard match `'?' '*'` | Same idea, simpler than regex |

#### State diagram

```
  match:        replace:
  s1[i-1]=s2[j-1]   s1[i-1]≠s2[j-1]
  dp[i][j]            dp[i][j]
       ↖                ↖↑←
   dp[i-1][j-1]   dp[i-1][j-1]   dp[i-1][j]   dp[i][j-1]
```

#### Distinct subsequences

```python
# Number of subsequences of s1 equal to s2
def num_distinct(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0]*(n+1) for _ in range(m+1)]
    for i in range(m+1): dp[i][0] = 1            # empty target
    for i in range(1, m+1):
        for j in range(1, n+1):
            dp[i][j] = dp[i-1][j]
            if s1[i-1] == s2[j-1]: dp[i][j] += dp[i-1][j-1]
    return dp[m][n]
```

#### Complexity

| Problem | Time | Space (1D / 2D opt) |
|---|---|---|
| LIS DP | O(n²) | O(n) |
| LIS patience | O(n log n) | O(n) |
| LCS | O(m·n) | O(min(m, n)) |
| Edit distance | O(m·n) | O(min(m, n)) |
| Distinct subsequences | O(m·n) | O(min(m, n)) |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Confusing subsequence with substring | Subsequence is **non-contiguous** (LCS); substring is contiguous (different DP) |
| Off-by-one between 0-indexed string and 1-indexed dp | Use `s1[i-1]`, `s2[j-1]` consistently |
| LIS with `bisect_right` (allows ties) | Strict LIS uses `bisect_left`; non-decreasing uses `bisect_right` |
| Reconstructing without saving parents | Walk the table at the end (no extra storage) |
| Forgetting base row / column | Edit distance: `dp[i][0] = i` (delete all), `dp[0][j] = j` (insert all) |

**Rule of thumb:** **subsequence + one sequence → LIS**. **Common subsequence + two sequences → LCS** (and the longest-palindrome trick = `LCS(s, reversed(s))`). **Insert/delete/replace cost = edit distance**. The patience-sort O(n log n) LIS is the only DP-related algorithm where bisect beats the obvious DP.
