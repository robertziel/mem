### Burrows-Wheeler Transform + FM-Index (BWT, compressed full-text search, bzip2)

**When:** compress text (`bzip2`'s primary trick) or build a **memory-efficient full-text index** for substring queries — bioinformatics aligners (BWA, Bowtie), compressed search engines, content-addressed deduplication. Trades complexity of construction for **`O(n)`-bit indices** with `O(m)` substring count queries.

#### Burrows-Wheeler Transform (BWT)

**Schema:**

| Step | Action |
|---|---|
| 1 | Append a sentinel `$` (lex-smaller than every char) to `s` |
| 2 | Form all cyclic rotations of `s$` |
| 3 | Sort rotations lexicographically |
| 4 | Output the **last column** `L` of the sorted matrix |

**Example (`banana$`):**

```
Sorted rotations:        F      L (= BWT)
$banana                  $      a
a$banan                  a      n
ana$ban                  a      n
anana$b                  a      b
banana$                  b      $
na$bana                  n      a
nana$ba                  n      a

BWT = "annb$aa"
```

> **Runs of the same character cluster together** in `L` because identical contexts (the rest of the rotation) sort adjacently. That's why **`bzip2`** runs RLE + Huffman on the BWT for big compression gains.

#### LF-mapping (the magic that makes everything fast)

| Property | Detail |
|---|---|
| `F` (first column) | Sorted characters of `s$` |
| `L` (last column = BWT) | Output of BWT |
| **LF-mapping** | The `i`-th occurrence of `c` in `L` corresponds to the `i`-th occurrence of `c` in `F` (same row in the rotation matrix) |
| Inverse BWT | Walk LF-mapping starting from the row with `$` in `L`; reconstruct the original |

#### Inverse BWT — core idea

```python
# F = sorted(L); each row of F is one shift of the original text.
# LF[i] = index in F where row containing L[i] (as the last char) starts.
# Walk LF from the row whose first char is the original first char (i.e., $ in L).
def inverse_bwt(L):
    F = sorted(L)
    LF = build_LF_map(L, F)                # rank-based mapping
    pos = L.index('$')                     # row that ends in $
    out = []
    for _ in range(len(L)):
        out.append(L[pos])
        pos = LF[pos]
    return ''.join(reversed(out)).rstrip('$')
```

| Helper | Role |
|---|---|
| `F = sorted(L)` | First column of rotation matrix |
| `LF[i]` | "Where does row `i` go after one cyclic shift?" (back-pointer) |
| `pos = L.index('$')` | Row whose original starts at the start |
| Walk LF + reverse | Reconstructs original text |

#### FM-Index (compressed full-text search)

**Idea:** store BWT plus a **rank** structure over BWT (wavelet tree / Run-Length-encoded rank) to support `Count(P)` and `Locate(...)` in `O(m)` and `O(m + log² n)` respectively, using `O(n)` bits.

| Operation | Cost | What |
|---|---|---|
| `Count(P)` | O(m) | Number of occurrences of pattern `P` (length `m`) |
| `Locate(i)` | O(log² n) via sampled SA | Recover the `i`-th occurrence's position |
| `Extract(i, j)` | O(j − i + log² n) | Recover original substring |
| Memory | ~`n · H_k(s)` bits | Approaches k-th order entropy of `s` |

**Backward search** (the central algorithm):

| Step | Action |
|---|---|
| Initialize | `[lo, hi) = [0, n)` — full range |
| For each char `c` in **reversed** pattern | `lo = C[c] + rank(c, lo)`; `hi = C[c] + rank(c, hi)` |
| Final | `hi − lo` = number of occurrences |

> `C[c]` = number of characters in `s` lexicographically smaller than `c`. `rank(c, i)` = number of occurrences of `c` in `L[0..i-1]`.

#### Use cases

| System | Use of BWT / FM-index |
|---|---|
| **bzip2** | BWT + Move-to-front + RLE + Huffman |
| **BWA, Bowtie** (DNA aligners) | FM-index for short-read alignment |
| **sdsl, Indri** | Compressed text search libraries |
| Compressed databases | Full-text indices in space close to entropy |
| Pattern-matching with millions of references | `Count(P)` is `O(m)` regardless of `n` |
| Reversible block transforms | Cryptography / data shuffling |

#### BWT vs alternatives

| Need | Use |
|---|---|
| Compress text + reversibility | BWT (basis of bzip2) |
| Compressed full-text search | FM-index |
| Online substring queries | Suffix automaton (different memory profile) |
| Offline substring search, simpler code | Suffix array + LCP |
| Streaming compression | LZ77 / LZ78 / LZW (different family) |

#### Construction notes

| Step | How |
|---|---|
| BWT from suffix array | `BWT[i] = s[SA[i] - 1]` (with `$` wrap) — O(n) given SA |
| FM-index build | Build SA → BWT → wavelet tree on BWT |
| Sample SA | Store every k-th SA position to support `Locate` in O(k + log²) |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Sentinel char in alphabet | `$` must be **lexicographically smaller** than every input char |
| Treating BWT as a compressor on its own | BWT is a transform; you still need RLE + Huffman / arithmetic coding on top |
| Forgetting `LF` for inverse | Naive sort of rotations is O(n²); use LF mapping |
| FM-index without sampled SA | Can `Count` but not `Locate` |
| Hand-rolling the wavelet tree in Python | Use `pysdsl` / FAISS-text / production library |
| Confusing BWT with Burrows-Wheeler search engine | Same family, different application |

#### Complexity

| Op | Cost |
|---|---|
| BWT build (via SA) | O(n) |
| Inverse BWT | O(n) with LF mapping |
| FM-index build | O(n log n) via SA + wavelet tree |
| `Count(P)` | O(m) |
| `Locate` | O(log² n) per occurrence with sampled SA |
| Memory | ~`n · H_k(s)` bits — close to entropy |

**Rule of thumb:** **BWT = reversible permutation that clusters runs**, basis of `bzip2`. **FM-index = BWT + rank structure** = compressed full-text index supporting `O(m)` substring count and `O(log²)` locate. The trick is the **LF-mapping** (`i`-th `c` in `L` ↔ `i`-th `c` in `F`); backward search is its consequence. Used in **DNA aligners** and **compressed search engines** to keep indices close to entropy.
