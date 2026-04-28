### String Matching (KMP, Rabin-Karp, Z-algorithm, failure function)

**When:** find a pattern `p` of length `m` in a text `t` of length `n` faster than the naive O(n·m) — or solve "does this string contain X" / "all occurrences" / "longest border" problems.

**Schema:**

| Algorithm | Preprocess | Match | Idea |
|---|---|---|---|
| Naive | — | O(n·m) | Compare from each text index |
| KMP | O(m) | O(n) | Use failure function to skip matched prefix |
| Rabin-Karp | O(m) | O(n) avg, O(n·m) worst | Rolling hash; compare hashes first |
| Z-algorithm | O(n+m) | O(n+m) | Z-array on `p + '#' + t` |
| Aho-Corasick | O(Σ|p_i|) | O(n + #matches) | Multi-pattern via trie + failure links |
| Boyer-Moore | O(m + σ) | O(n/m) avg | Skip from right; bad-character heuristic |
| Suffix array / suffix automaton | O(n log n) | O(m log n) | Heavyweight; many string queries |

#### KMP (Knuth-Morris-Pratt)

**Failure (longest-proper-prefix-suffix) function:**

```python
def build_lps(p):
    lps = [0] * len(p); k = 0
    for i in range(1, len(p)):
        while k > 0 and p[k] != p[i]:
            k = lps[k - 1]
        if p[k] == p[i]: k += 1
        lps[i] = k
    return lps
```

**Match:**

```python
def kmp(t, p):
    if not p: return 0
    lps = build_lps(p); k = 0; out = []
    for i, ch in enumerate(t):
        while k > 0 and p[k] != ch:
            k = lps[k - 1]
        if p[k] == ch: k += 1
        if k == len(p):
            out.append(i - k + 1)
            k = lps[k - 1]
    return out
```

**`lps[i]` = length of the longest proper prefix of `p[:i+1]` that is also a suffix.** When a mismatch happens after `k` chars matched, jump pattern pointer to `lps[k-1]` (don't move text pointer back).

**KMP applications:**

| Problem | Trick |
|---|---|
| Substring search | Standard KMP |
| Repeated string pattern | `n % (n - lps[n-1]) == 0` and `lps[n-1] > 0` |
| Shortest palindrome (prepend chars) | KMP on `s + '#' + reversed(s)` |
| Count occurrences | Standard KMP, count matches |
| Period of a string | `n - lps[n-1]` is the smallest period |

#### Rabin-Karp (rolling hash)

```python
def rabin_karp(t, p):
    n, m = len(t), len(p)
    if m > n: return []
    BASE, MOD = 256, 10 ** 9 + 7
    p_hash = t_hash = 0
    h = pow(BASE, m - 1, MOD)
    for i in range(m):
        p_hash = (p_hash * BASE + ord(p[i])) % MOD
        t_hash = (t_hash * BASE + ord(t[i])) % MOD
    out = []
    for i in range(n - m + 1):
        if p_hash == t_hash and t[i:i + m] == p:           # verify (collisions)
            out.append(i)
        if i < n - m:
            t_hash = (t_hash - ord(t[i]) * h) * BASE + ord(t[i + m])
            t_hash %= MOD
    return out
```

**Why hashes collide:** even with mod 10⁹+7, adversarial input can produce many collisions. Use **double hashing** (two different MODs / BASEs) when robustness matters.

**Rolling hash applications:**

| Problem | Use |
|---|---|
| Substring search | Rabin-Karp |
| Longest duplicate substring | Binary search on length + rolling hash |
| Repeated DNA sequences | Rolling hash of fixed-length windows |
| Distinct substrings | Hash all suffixes' prefixes → set size |
| Compare two substrings | Precompute hash array; query in O(1) |

#### Z-algorithm

**Z-array:** `z[i]` = length of the longest substring starting at `i` that matches a prefix of `s`.

```python
def z_function(s):
    n = len(s); z = [0] * n
    l = r = 0
    for i in range(1, n):
        if i < r: z[i] = min(r - i, z[i - l])
        while i + z[i] < n and s[z[i]] == s[i + z[i]]:
            z[i] += 1
        if i + z[i] > r:
            l, r = i, i + z[i]
    return z
```

**Pattern matching with Z:** compute `z` on `p + '#' + t` (where `#` ∉ alphabet). Any `i` with `z[i] == len(p)` corresponds to a match in `t`.

#### Aho-Corasick (multiple patterns)

**Idea:** build a trie of patterns + "failure links" (analogous to KMP's lps). Single pass over `t` finds **all** occurrences of **all** patterns in O(n + #matches).

| Use case | Example |
|---|---|
| Spam / virus / profanity filter | Match many forbidden words |
| Bioinformatics — find any of K motifs | DNA scanning |
| Replace word II / multi-pattern replacement | Single-pass replacement |

#### Pattern picker

| Need | Use |
|---|---|
| Find single pattern in text | KMP |
| Find single pattern, allow randomness | Rabin-Karp |
| Find any of K patterns | Aho-Corasick |
| Many substring queries on same string | Suffix array / automaton |
| Shortest period of string | KMP `lps`: `n - lps[n-1]` |
| Count distinct substrings | Suffix array, or rolling hashes |
| Longest palindromic substring | Manacher's algorithm — O(n) |

#### Manacher's algorithm (palindromes in O(n))

**Idea:** for each center, expand symmetrically; reuse mirrored info to skip work — analogous to Z's `[l, r]` window. Treats odd and even centers uniformly by inserting separators (`#a#b#a#`).

#### Pitfalls

| Mistake | Fix |
|---|---|
| Using KMP without verifying lps array | Trace through small example |
| Rabin-Karp without final string compare | Hash collisions cause false positives — always verify |
| Single hash on adversarial input | Use double hashing |
| Reaching for suffix array on a single-pattern-match problem | KMP / Rabin-Karp / Z is enough |
| Forgetting separator (`'#'`) in Z-pattern-match | Without it, `p` could match across the boundary |

#### Complexity summary

| Algorithm | Preprocess | Match | Space |
|---|---|---|---|
| Naive | — | O(n·m) | O(1) |
| KMP | O(m) | O(n) | O(m) |
| Rabin-Karp | O(m) | O(n) avg, O(n·m) worst | O(1) |
| Z-algorithm | O(n+m) | O(n+m) | O(n+m) |
| Aho-Corasick | O(Σ\|p\|) | O(n + #matches) | O(Σ\|p\|) |
| Boyer-Moore | O(m + σ) | O(n/m) avg, O(n·m) worst | O(σ) |
| Suffix array | O(n log n) | O(m log n) | O(n) |

**Rule of thumb:** **KMP** for a single pattern with worst-case guarantees. **Rabin-Karp** when you can verify and want simplicity (good for "compare two substrings in O(1) after prep"). **Aho-Corasick** for many patterns at once. The **failure function = period detection** — most KMP applications other than substring search rely on that.
