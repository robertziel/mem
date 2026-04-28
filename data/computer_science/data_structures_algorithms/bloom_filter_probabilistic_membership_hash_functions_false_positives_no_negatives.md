### Bloom Filter (probabilistic membership, hash functions, false positives, no false negatives)

**When:** "have I seen this before?" at scale — cache front, deduplication, web crawler URL set, NoSQL key existence, malware DB. Trades false positives for **massive memory savings**.

**Schema:**

| Concept | Detail |
|---|---|
| Bit array `B` | Length `m` bits, all 0 initially |
| `k` hash functions | Independent (or pairwise — `h_i(x) = h₁(x) + i·h₂(x)`) |
| **Insert** `x` | Set `B[h_i(x) mod m] = 1` for all `i` |
| **Query** `x` | Return `True` iff all `k` bits are 1 |
| **No false negatives** | If inserted, `query` always returns `True` |
| **False positives** | A query for an absent `x` may hit `True` if its bits collided with insertions |

> **One-way:** can insert and query, **cannot delete**. (Variants below allow deletion.)

#### False positive rate

After inserting `n` items into `m` bits with `k` hash functions:

`FPR ≈ (1 − e^(−kn/m))^k`

**Optimal `k`** (to minimize FPR for given `m, n`):

`k* = (m / n) · ln 2 ≈ 0.693 · m / n`

**Memory per item** for FPR `p`:

`m / n = −log₂(p) / ln 2 ≈ −1.44 · log₂(p)`

| Target FPR | Bits per item |
|---|---|
| 1% | ~9.6 |
| 0.1% | ~14.4 |
| 0.01% | ~19.2 |
| 1ppm | ~28.8 |

#### Implementation

```python
import math, mmh3                                # MurmurHash3

class BloomFilter:
    def __init__(self, capacity, fpr=0.01):
        self.m = max(1, math.ceil(-capacity * math.log(fpr) / (math.log(2) ** 2)))
        self.k = max(1, round((self.m / capacity) * math.log(2)))
        self.bits = bytearray((self.m + 7) // 8)

    def _set(self, i): self.bits[i >> 3] |= 1 << (i & 7)
    def _get(self, i): return (self.bits[i >> 3] >> (i & 7)) & 1

    def add(self, x):
        h1 = mmh3.hash(x, 0); h2 = mmh3.hash(x, 1)
        for i in range(self.k):
            self._set((h1 + i * h2) % self.m)

    def __contains__(self, x):
        h1 = mmh3.hash(x, 0); h2 = mmh3.hash(x, 1)
        for i in range(self.k):
            if not self._get((h1 + i * h2) % self.m):
                return False
        return True
```

**Double hashing trick:** instead of `k` independent hash functions, generate `k` "pseudo-hashes" via `h₁(x) + i·h₂(x)`. Just as effective in practice; only 2 actual hash computations.

#### Variants

| Variant | What it adds | Cost |
|---|---|---|
| **Counting Bloom filter** | Counters instead of bits — supports **delete** | ~4× memory |
| **Cuckoo filter** | Stores fingerprints; supports delete | Comparable memory, faster lookups |
| **Scalable Bloom filter** | Adds new layers as it fills | Grows automatically |
| **Spectral Bloom filter** | Approximate frequency, not just membership | More memory |
| **Partitioned Bloom filter** | Each hash maps to a separate slice | Easier parallelism |
| **Stable Bloom filter** | Forgets old items (random reset of cells) | Useful for streaming |

#### Patterns map

| Problem | Bloom usage |
|---|---|
| **Web crawler URL deduplication** | "Have I crawled this URL?" — cheap pre-filter |
| **Cache miss avoidance** | "Is key X in DB?" — skip lookup if Bloom says no |
| **Spell checker (vintage)** | Dictionary words in a Bloom filter |
| **Malicious URL detection** | Send suspect URL to expensive checker only on Bloom positive |
| **Distributed sets** | Each node maintains a Bloom filter; OR them for set union |
| **Bigtable / LevelDB / RocksDB** | Bloom per SSTable to avoid disk reads |
| **Bitcoin SPV clients** | Filter blockchain for relevant transactions |
| **CDN cache pre-filter** | Quickly reject non-cached URLs |
| **Profanity / DoS keyword filter** | Reject obvious matches at edge |

#### Bloom vs alternatives

| Need | Use |
|---|---|
| Exact membership, fits in memory | Hash set |
| Probabilistic membership, billions of items | **Bloom** / Cuckoo |
| Approximate cardinality (count distinct) | HyperLogLog |
| Approximate frequency (top-K) | Count-min sketch |
| Membership + delete | Cuckoo / counting Bloom |
| Set similarity | MinHash / Jaccard |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Choosing `m, k` ad hoc | Use `m = −n·ln p / (ln 2)²`, `k = (m/n)·ln 2` |
| Single hash function | Need ≥ 2 (use double-hashing trick) |
| Hash function collisions correlated with input | Use a strong hash (MurmurHash, xxHash, SipHash) |
| Trying to delete from a plain Bloom | Use **counting Bloom** or Cuckoo filter |
| Reusing for completely different load | Resize / rebuild — saturated filter has FPR → 1 |
| Treating "in Bloom" as "definitely present" | Always verify positives with the authoritative source if cost matters |
| Concurrent writes without sync | Use atomic OR per byte, or per-thread filters merged later |

#### Complexity

| Op | Cost |
|---|---|
| Insert | O(k) hash + bit ops |
| Query | O(k) |
| Memory | O(m) bits ≈ O(n) for typical FPR ~1% |
| Bulk merge of two filters (same `m, k`) | OR of bit arrays, O(m) |

**Rule of thumb:** Bloom filter = **"definitely-not OR maybe-yes"**. Use it as a **cheap pre-filter** to skip expensive lookups; verify positives if false positives matter. **`m ≈ 10·n` bits gives ~1% FPR**, **`k ≈ 7`** hash functions. For deletion, use **Cuckoo** or **counting Bloom**.
