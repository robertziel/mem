### Suffix Array + LCP (Kasai, sorted suffixes, string queries, longest repeated substring)

**When:** lots of string queries on a single text — substring search, longest repeated substring, distinct substring count, lexicographic minimum rotation. Suffix array + LCP is the lighter cousin of suffix automaton / suffix tree.

**Schema:**

| Concept | Definition |
|---|---|
| **Suffix array `SA[i]`** | Index in `s` where the i-th lexicographically smallest suffix starts |
| **Rank array `rank[i]`** | The lexicographic position of suffix starting at `i` (inverse of SA) |
| **LCP array `lcp[i]`** | Length of longest common prefix between `s[SA[i-1]..]` and `s[SA[i]..]` |

> Knowing **SA + LCP** turns most "all substrings of `s`" problems into 1D array problems.

#### Construction

| Algorithm | Time | Notes |
|---|---|---|
| Naive sort | O(n² log n) | Sort all suffixes by string compare |
| Prefix doubling (manual) | O(n log² n) | Iteratively rank by 2ᵏ-prefixes |
| SA-IS / DC3 | **O(n)** | Linear; complex to implement |
| Sufix array via Python `sorted` of suffixes | O(n² log n) | Easy but slow |

**Prefix-doubling construction (clean, O(n log² n)):**

```python
def suffix_array(s):
    n = len(s)
    sa = list(range(n))
    rank = [ord(c) for c in s]
    tmp = [0] * n
    k = 1
    while True:
        def key(i):
            return (rank[i], rank[i + k] if i + k < n else -1)
        sa.sort(key=key)
        tmp[sa[0]] = 0
        for i in range(1, n):
            tmp[sa[i]] = tmp[sa[i-1]] + (1 if key(sa[i]) != key(sa[i-1]) else 0)
        rank = tmp[:]
        if rank[sa[n-1]] == n - 1: break
        k *= 2
    return sa
```

**Kasai's algorithm — LCP from SA in O(n):**

```python
def kasai_lcp(s, sa):
    n = len(s)
    rank = [0] * n
    for i in range(n): rank[sa[i]] = i
    lcp = [0] * n                                # lcp[0] is conventionally 0
    h = 0
    for i in range(n):
        if rank[i] > 0:
            j = sa[rank[i] - 1]
            while i + h < n and j + h < n and s[i + h] == s[j + h]:
                h += 1
            lcp[rank[i]] = h
            if h > 0: h -= 1
        else:
            h = 0
    return lcp
```

#### Substring search (binary search on SA)

```python
import bisect
def contains(s, sa, p):
    lo, hi = 0, len(sa)
    while lo < hi:
        mid = (lo + hi) // 2
        if s[sa[mid]:sa[mid] + len(p)] < p:
            lo = mid + 1
        else:
            hi = mid
    return lo < len(sa) and s[sa[lo]:sa[lo] + len(p)] == p
```

> O((m + log n) · log n) with naive substring compare; O(m + log n) with augmented LCP.

#### Patterns map (the SA + LCP toolkit)

| Problem | Reduction |
|---|---|
| Substring search | Binary search on SA |
| **Longest repeated substring** | `max(lcp)` |
| Number of distinct substrings | `n(n+1)/2 − sum(lcp)` |
| K-th lexicographically smallest substring | Walk SA accumulating new substrings (length − lcp) |
| Longest common substring of two strings | Concatenate `s + '#' + t`; max `lcp[i]` over indices straddling `#` |
| Longest common substring of K strings | Generalized SA over `s₁ + sep₁ + s₂ + sep₂ + …` |
| Lexicographic minimum rotation (Booth) | SA over `s + s` |
| Compare two substrings in O(1) | Sparse-table RMQ over LCP |
| Count occurrences of pattern in text | Lower-bound + upper-bound binary searches |
| Longest palindrome substring | Manacher (different tool) |
| Longest k-repeating substring | Sliding window over LCP array |

#### LCP queries — RMQ for substring LCP

`LCP(suffix i, suffix j) = min(lcp[rank_low+1 .. rank_high])` where `rank_low, rank_high = sorted(rank[i], rank[j])`. Build a sparse table over `lcp` for **O(1) per query**.

#### Suffix array vs alternatives

| Need | Suffix array | Suffix automaton | Suffix tree |
|---|---|---|---|
| Memory | **O(n)** | O(n·σ) | O(n·σ) |
| Construction | O(n log² n) easy / O(n) hard | O(n) | O(n) Ukkonen |
| Substring search | O(m log n) | O(m) | O(m) |
| Distinct substrings | `n(n+1)/2 − Σ lcp` | Σ `(len(v) − len(link(v)))` | Edge labels sum |
| Online (insert chars) | ✗ | ✓ | ✓ |
| LCP between two suffixes | RMQ on lcp | Walk suffix link | LCA in tree |
| Implementation difficulty | Medium | Hard | Hardest |

> **Suffix array is the practical default** — easier to memorize, less memory, fast enough for nearly everything.

#### Pitfalls

| Mistake | Fix |
|---|---|
| Forgetting `'$'` sentinel | Some constructions need it; some don't — pick a convention |
| Off-by-one in `lcp[0]` | Conventionally `lcp[0] = 0` (no predecessor) |
| Comparing substrings by slicing in inner loop | Use SA + sparse-table RMQ for O(1) compare |
| Using SA for very long string in pure Python | Use C++ / `pydivsufsort` for speed |
| Forgetting that suffixes include the empty suffix or not | Pick `n` or `n+1` suffixes consistently |

#### Complexity

| Op | Cost |
|---|---|
| Build SA (prefix doubling) | O(n log² n) — practical |
| Build SA (SA-IS / DC3) | O(n) |
| Build LCP (Kasai) | O(n) given SA |
| Substring search | O(m log n) naive, O(m + log n) with LCP RMQ |
| Range LCP query | O(1) with sparse table on LCP |

**Rule of thumb:** **SA + LCP is the universal substring toolkit**. **Longest repeated substring = max(lcp)**, **distinct substring count = n(n+1)/2 − Σ lcp**, **LCS of two strings = max lcp straddling separator**. Build SA in O(n log² n) (easy) or O(n) (hard); compute LCP in O(n) via Kasai. For online / insertion problems, switch to suffix automaton.
