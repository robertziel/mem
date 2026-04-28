### Manacher's Algorithm (longest palindromic substring, linear time, palindrome radii)

**When:** find the longest palindromic substring (or all palindrome radii) in **O(n)**. Beats the O(n²) expand-around-center approach.

**Schema:**

| Concept | Detail |
|---|---|
| Transformed string `T` | Insert `#` between every pair of chars (and at ends) so odd / even palindromes become **uniformly odd** in `T` |
| Radius array `p[i]` | Half-length (excluding center) of the longest palindrome centered at `T[i]` |
| Current rightmost palindrome | Center `c`, right boundary `r`, both maintained as we sweep |
| Mirror trick | When `i < r`, initialize `p[i] = min(r − i, p[2c − i])` — reuse the mirror's radius |

**Why the transformation:** "abba" (even) and "aba" (odd) are both palindromes but require different center handling. Inserting separators turns both into odd-length palindromes in `T`:

```
s = abba          T = #a#b#b#a#
s = aba           T = #a#b#a#
```

In `T`, every palindrome is odd-length and centered on a character.

#### Implementation

```python
def manacher(s):
    if not s: return ""
    T = '#' + '#'.join(s) + '#'                  # length 2n+1
    n = len(T)
    p = [0] * n
    c = r = 0                                    # current center, right boundary
    for i in range(n):
        mirror = 2 * c - i
        if i < r:
            p[i] = min(r - i, p[mirror])
        # Try to expand around i
        a, b = i + p[i] + 1, i - p[i] - 1
        while a < n and b >= 0 and T[a] == T[b]:
            p[i] += 1; a += 1; b -= 1
        # Update center / right if expanded past current boundary
        if i + p[i] > r:
            c = i; r = i + p[i]
    # Find max p[i] and convert back to s coordinates
    best_i = max(range(n), key=lambda i: p[i])
    start = (best_i - p[best_i]) // 2
    return s[start:start + p[best_i]]
```

**Returns the longest palindromic substring of `s`.**

#### How to read the radius array `p`

| Concept | In `T` | In `s` |
|---|---|---|
| Center `i` of `T` | `T[i]` | If `i` even → between two chars (even-length pal); if odd → at a char (odd-length) |
| Palindrome length in `s` | `p[i]` | Same as `p[i]` (the `#` count cancels with `/2`) |
| Start in `s` | — | `(i − p[i]) // 2` |

> The fact that **`p[i]` directly equals the palindrome length in the original string** is the small magic of Manacher.

#### Manacher vs alternatives

| Approach | Time | Idea |
|---|---|---|
| Brute force | O(n³) | Check every substring |
| Expand around center | O(n²) | 2n centers, expand each |
| **Manacher** | **O(n)** | Mirror trick + boundary maintenance |
| DP `dp[i][j] = is_palindrome(s[i..j])` | O(n²) | Easier to extend (count, all distinct, etc.) |
| Eertree (palindrome tree) | O(n) | Counts distinct palindromes, harder to code |
| Hashing + binary search | O(n log n) | Polynomial hash + bisect on radius |

**Why O(n):** the right boundary `r` only ever moves forward. Each time we expand past `r`, the work is amortized to that single `r` advance — total work is bounded by `r` reaching `n`.

#### Patterns map

| Problem | Use |
|---|---|
| Longest palindromic substring | Manacher (O(n)) or expand-around-center (O(n²)) |
| Count of palindromic substrings | Sum `(p[i] + 1) // 2` over all `i` (with separators) |
| All palindrome radii | Just return the `p` array |
| Shortest palindrome by prepending | Find longest palindrome prefix; answer = reverse of leftover + s |
| Longest palindromic subsequence | **DP**: `LCS(s, reverse(s))` (subsequence ≠ substring) |
| Palindromic partitioning | DP using `is_palindrome` table from Manacher |
| Distinct palindromic substrings | Eertree (palindrome tree); Manacher doesn't give distinct count |

#### Substring vs subsequence — common mix-up

| Property | Substring | Subsequence |
|---|---|---|
| Contiguous | ✓ | ✗ |
| Longest palindromic | **Manacher** O(n) | LCS(s, reverse(s)) — **DP** O(n²) |
| Count | Sum `(p[i]+1)//2` | Different DP recurrence |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Forgetting separator at the ends | Use `'#' + '#'.join(s) + '#'` (both `#a#b#a#` patterns work) |
| Off-by-one between `T` index and `s` index | `(i - p[i]) // 2` is the start in `s` |
| Treating odd / even palindromes separately | Don't — Manacher unifies them |
| Using Manacher for subsequences | Subsequence is a different problem — use LCS DP |
| Picking a separator that's in `s` | Use `\x00` or any char known to be absent |

**Complexity:** O(n) time, O(n) space.

**Rule of thumb:** **Manacher = O(n) longest palindromic substring**, plus all palindrome radii for free. The trick is the **`#` separator** that makes odd/even palindromes uniform, and the **mirror reuse** that bounds total work to O(n). For subsequence problems, use the **LCS(s, reverse(s))** DP instead.
