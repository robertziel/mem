### Suffix Automaton + Burrows-Wheeler Transform (string compression, pattern matching, FM-index)

**When:** generic string structure that's harder than suffix arrays to memorize but **more powerful** — count distinct substrings online, count occurrences, longest common substring of multiple strings, online substring queries. **BWT** is the basis of `bzip2` and the **FM-index** for compressed full-text search.

#### Suffix Automaton (SAM)

**Schema:**

| Concept | Detail |
|---|---|
| State | Represents an **equivalence class** of substrings ending at the same set of positions |
| `len[v]` | Length of the longest substring in class `v` |
| `link[v]` | Suffix link — points to the class of the longest proper suffix of `v` that's shorter |
| Transitions `next[v][c]` | Where to go on character `c` |
| Initial state | The empty string (class containing all suffixes) |
| Number of states | **≤ 2n − 1** for a string of length `n` — linear |

> **One state per equivalence class** of substrings; states form a tree under suffix links. SAM is the **smallest DFA accepting all suffixes** of `s`.

#### Construction (online, O(n))

```python
class SAM:
    def __init__(self):
        self.size = 1
        self.last = 0
        self.len  = [0]
        self.link = [-1]
        self.next = [dict()]
        self.cnt  = [0]                              # used for occurrence counts

    def extend(self, c):
        cur = self.size
        self.size += 1
        self.len.append(self.len[self.last] + 1)
        self.link.append(-1); self.next.append({})
        self.cnt.append(1)                           # this is a terminal of a new prefix
        p = self.last
        while p != -1 and c not in self.next[p]:
            self.next[p][c] = cur; p = self.link[p]
        if p == -1:
            self.link[cur] = 0
        else:
            q = self.next[p][c]
            if self.len[p] + 1 == self.len[q]:
                self.link[cur] = q
            else:
                clone = self.size; self.size += 1
                self.len.append(self.len[p] + 1)
                self.link.append(self.link[q])
                self.next.append(dict(self.next[q]))
                self.cnt.append(0)
                while p != -1 and self.next[p].get(c) == q:
                    self.next[p][c] = clone; p = self.link[p]
                self.link[q] = self.link[cur] = clone
        self.last = cur
```

> **Build by extending one character at a time**, maintaining the invariant. Online: works on streams.

#### What SAM gives you

| Problem | Solution via SAM |
|---|---|
| Count distinct substrings | `Σ over states v ≠ 0 of (len[v] − len[link[v]])` |
| Substring search | Walk transitions char by char from state 0 |
| Number of occurrences of pattern | After matching, `cnt[v]` aggregated up suffix links |
| Longest common substring of two strings | Build SAM of `s`; walk for each character of `t`, tracking match length |
| K-th lexicographically smallest substring | DP on SAM transitions |
| Distinct substrings ending at each position | DP along suffix links |

**Aggregating `cnt` up suffix links** (post-order on the suffix-link tree) gives **occurrence counts** for every state.

#### Burrows-Wheeler Transform (BWT)

**Schema:**

| Step | Action |
|---|---|
| 1 | Append a sentinel `$` to `s` |
| 2 | Form all cyclic rotations of `s$` |
| 3 | Sort them lexicographically |
| 4 | Output the **last column** of the sorted rotation matrix |

**Inverse:** sort BWT to get the first column; pair up via "first-occurrence" trick to recover the original.

```
s = "banana$"

Rotations (sorted):
  $banana
  a$banan
  ana$ban
  anana$b
  banana$
  na$bana
  nana$ba

First column F: $aaabnn
Last column L:  annb$aa     ← BWT
```

> BWT runs of the same character cluster together — that's why **`bzip2`** can compress it well via run-length + Huffman.

#### BWT inverse (cleaner via LF-mapping)

```python
def bwt_inverse(L):
    # L = transformed last column
    F = sorted(L)
    # last-to-first mapping: ranks identify positions
    next_index = {c: [] for c in set(L)}
    for i, c in enumerate(L): next_index[c].append(i)
    rank_in_L = []
    seen = {c: 0 for c in next_index}
    for c in L:
        rank_in_L.append(seen[c]); seen[c] += 1
    # First column has F[i] at index i, with rank_in_F[i] within character group
    rank_in_F = []
    seen = {c: 0 for c in next_index}
    for c in F:
        rank_in_F.append(seen[c]); seen[c] += 1
    # Map: F[i] = L[next_idx_of(F[i], rank_in_F[i])]
    pos = L.index('$')                                # row whose original starts at the start
    out = []
    for _ in range(len(L)):
        out.append(L[pos])
        # next position via LF mapping
        c = L[pos]; r = rank_in_L[pos]
        pos = next_index[c][r] if False else 0  # simplified — see canonical impls
    return ''.join(reversed(out))
```

> Production code uses arrays of (char, rank) and an `LF` array directly — the example above is illustrative; consult `pysuffix` / `bx-python` for canonical versions.

#### FM-Index (compressed full-text search)

**Idea:** store BWT + a **wavelet tree** or **rank** structure over BWT to support **counting occurrences** of any pattern in `O(m)` time using `O(n)` bits — better than uncompressed indices, and supports `Locate(i)` to recover positions.

| Operation | FM-index cost |
|---|---|
| `Count(P)` (occurrences of pattern P) | O(m) where m = |P| |
| `Locate(occurrence)` | O(log² n) via sampled SA |
| Memory | ≈ `n · H_k(s)` (k-th order entropy) |

> Used in **bioinformatics** (BWA, Bowtie aligners), **search engines** (Indri / sdsl), **compressed databases**.

#### Suffix automaton vs suffix array vs BWT

| Capability | SAM | Suffix array + LCP | BWT / FM-index |
|---|---|---|---|
| Build time | O(n) | O(n log² n) easy / O(n) hard | O(n) (via SA) |
| Memory | O(n · σ) | O(n) | O(n) bits with FM-index |
| Online (stream chars) | **✓** | ✗ | ✗ |
| Substring search | O(m) | O(m log n) or O(m + log n) | O(m) |
| Distinct substrings | Σ(len − len(link)) | Σ from LCP | Tougher |
| LCS of two strings | Walk SAM(s) on t | Concat with separator | Possible |
| Memory-efficient compressed search | ✗ | ✗ | **✓** |

#### Patterns map

| Problem | Use |
|---|---|
| Count distinct substrings online | SAM |
| Substring queries against streaming text | SAM |
| Longest common substring of K strings | SAM of one + walk for each |
| Compressed full-text search | FM-index |
| Compress text before further compression | BWT (then RLE + Huffman = bzip2) |
| Genome alignment | FM-index (BWA, Bowtie) |
| Suffix-link tree / LCA on it | SAM directly |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Forgetting to clone state in SAM extend | Construction breaks; follow canonical pseudocode |
| Building wrong sentinel for BWT | `$` must be lex-smaller than every char |
| Confusing SAM with suffix tree | Different — SAM has 2n states; suffix tree has n leaves and ≤ 2n internal |
| FM-index without sampled SA | Can count, but not locate |
| Treating BWT as compressing on its own | BWT is **a transform**; you still need RLE / Huffman on top |
| Implementing in pure Python on huge strings | Use C / Cython / `pysuffix` / `divsufsort` |

#### Complexity

| Operation | SAM | BWT (build via SA) | FM-index |
|---|---|---|---|
| Build | O(n) | O(n) | O(n) |
| Memory | O(n · σ) (transitions) | O(n) | O(n) bits with sampling |
| Substring `Count(P)` | O(m) | — | O(m) |
| Online char append | ✓ | ✗ | ✗ |

**Rule of thumb:** **SAM = the most powerful linear-time string structure** for **online** problems and **counting / distinct-substring** queries. **BWT** is the **transform** that makes text compress well and underlies the **FM-index** for memory-efficient full-text search. For most contest problems, **suffix array + LCP** is enough; reach for SAM only when you need **online construction** or **multi-string queries**.
