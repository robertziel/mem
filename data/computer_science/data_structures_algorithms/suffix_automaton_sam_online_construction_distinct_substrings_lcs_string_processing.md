### Suffix Automaton (SAM — online construction, distinct substrings, LCS, string processing)

**When:** generic linear-construction string structure for **online** problems — count distinct substrings while streaming, occurrence counting, longest common substring of multiple strings, K-th lexicographically smallest substring. The minimal DFA accepting all suffixes of a string.

**Schema:**

| Concept | Detail |
|---|---|
| State | An **equivalence class** of substrings (those ending at the same positions in `s`) |
| `len[v]` | Length of the **longest** substring in class `v` |
| `link[v]` | Suffix link — class of the longest proper suffix of `v` that's shorter |
| Transitions `next[v][c]` | DFA edge on character `c` |
| Initial state | The empty string (class containing all suffixes) |
| Number of states | **≤ 2n − 1** for `|s| = n` — linear |
| Suffix-link tree | States form a tree under `link` — supports many DP queries |

> **One state per equivalence class** of substrings; the SAM is the **smallest DFA accepting all suffixes** of `s`. Construction is **online**: extend one character at a time.

#### Construction — online extend(c) skeleton

```python
def extend(c):
    cur = new_state(len=len[last] + 1, cnt=1)
    p = last
    while p != -1 and c not in next[p]:           # walk suffix links, add transition
        next[p][c] = cur; p = link[p]
    if p == -1:
        link[cur] = 0                              # root
    else:
        q = next[p][c]
        if len[p] + 1 == len[q]:
            link[cur] = q                          # direct attach
        else:
            clone = new_state(len=len[p] + 1, link=link[q], next=copy(next[q]), cnt=0)
            while p != -1 and next[p].get(c) == q:
                next[p][c] = clone; p = link[p]
            link[q] = link[cur] = clone
    last = cur
```

| Step | Why |
|---|---|
| New state `cur` for the new prefix | Adds the longest substring ending at the new char |
| Walk `link` from `last` adding `next[p][c] = cur` | Connects all suffixes that didn't already see `c` |
| `len[p] + 1 == len[q]` | Direct attach; `q` already represents what we need |
| **Clone `q`** | When equivalence class would split — preserves the "smallest DFA" invariant |
| `cnt[cur] = 1`, `cnt[clone] = 0` | For occurrence-count aggregation later |

#### What SAM gives you

| Problem | Solution via SAM |
|---|---|
| Count distinct substrings | `Σ over states v ≠ 0 of (len[v] − len[link[v]])` |
| Substring search | Walk transitions char by char from state 0 |
| Number of occurrences of pattern | After matching, `cnt[v]` aggregated up suffix links (post-order on link tree) |
| Longest common substring of two strings | Build SAM of `s`; walk for each character of `t`, tracking match length |
| K-th lexicographically smallest substring | DP on SAM transitions over edges |
| Longest repeated substring | `max(len[v])` over states with `cnt[v] ≥ 2` |
| LCS of K strings | Generalized SAM (one SAM, mark states reachable from each input) |
| Suffix-link tree LCA | Same SAM; build LCA on `link` |

> **Aggregating `cnt` along suffix links** (post-order on the link tree) gives **occurrence counts** for every state.

#### SAM vs alternatives

| Capability | SAM | Suffix array + LCP | Suffix tree |
|---|---|---|---|
| Build time | O(n) | O(n log² n) easy / O(n) hard | O(n) (Ukkonen) |
| Memory | O(n · σ) (transitions) | O(n) | O(n · σ) |
| **Online** (stream chars) | **✓** | ✗ | ✓ |
| Substring search | O(m) | O(m log n) or O(m + log n) | O(m) |
| Distinct substrings | Σ(len − len(link)) | Σ from LCP | Sum of edge labels |
| LCS of two strings | Walk SAM(s) on t | Concat with separator | Generalized suffix tree |
| Implementation | Hard | Medium | Hardest |

> **Suffix array** is the practical default; reach for **SAM** when you need **online construction** or **multi-string queries**. **Suffix tree** rarely wins — SAM is usually simpler and equally powerful.

#### Patterns map

| Problem | Use SAM for |
|---|---|
| Count distinct substrings online | Direct |
| Substring queries against streaming text | Build SAM as text grows |
| Longest common substring of K strings | SAM of one + walk for each, intersect |
| Number of occurrences of P in T | Walk SAM(T), aggregate `cnt` |
| K-th smallest substring | DP `dp[v]` = #substrings reachable from `v` |
| Suffix-link tree problems | SAM directly |
| String periodicity / borders | SAM of `s + s`; specific traversals |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Forgetting to clone in `extend` | Construction breaks; follow the `len[p] + 1 == len[q]` branch |
| Setting `cnt[clone] = 1` | Should be 0 — clones aren't terminals of original prefixes |
| Aggregating `cnt` in pre-order | Must be **post-order** on the suffix-link tree |
| Confusing SAM with suffix tree | Same expressive power, different node count and structure |
| Implementing on huge strings in pure Python | Use C++ / PyPy; transitions are the hot path |
| Treating `next[v]` as array of size σ | Use a dict — saves memory for sparse alphabets |

#### Complexity

| Operation | Cost |
|---|---|
| Online `extend(c)` | O(1) amortized |
| Build SAM of `s` | O(n) total |
| Substring search | O(m) |
| Distinct substring count | O(n) after build |
| LCS of two strings | O(\|s\| + \|t\|) |
| Memory | O(n · σ) for transitions |

**Rule of thumb:** SAM = **online linear-time string DFA**, ≤ 2n states. The construction's only nuance is **when to clone** (when `len[p] + 1 ≠ len[q]`). Standard recipes: **distinct substrings = Σ(len − len(link))**, **occurrence counts via cnt aggregated up suffix links**, **LCS by walking SAM(s) on `t`**. For offline single-pattern queries, **suffix array + LCP** is simpler.
