### Hash Map / Hash Set (collision, chaining, probing, load factor, LRU)

**When:** O(1) lookup by key, frequency counting, deduplication, complement lookup. The universal "make this faster" tool.

**Schema:**

| Aspect | Detail |
|---|---|
| Lookup mechanism | Key → hash function → bucket index in array |
| Collision | Two keys hash to same bucket → resolve via chaining or probing |
| Load factor | `entries / buckets`; triggers resize at ~0.75 |
| Resize | Allocate 2× buckets, rehash all entries — O(n) but amortized O(1) |
| Worst case | O(n) per op when many collisions (or adversarial keys) |

**Collision resolution:**

| Method | How | Pros | Cons |
|---|---|---|---|
| Chaining | Bucket = list / tree | Simple delete; tolerates load > 1 | Pointer overhead; cache-unfriendly |
| Linear probing | Probe i+1, i+2, … | Cache-friendly; no pointers | Clustering; tombstones on delete |
| Quadratic probing | Probe i+1², i+2², … | Less clustering | Holes after delete |
| Double hashing | Probe with second hash | Best uniformity | Slower per probe |
| Robin Hood | Swap with "rich" slots | Low variance | Complex insert |

**Map variants:**

| Variant | Order | Lookup | Used for |
|---|---|---|---|
| HashMap / `dict` | None (Python 3.7+: insertion) | O(1) avg | Default |
| LinkedHashMap | Insertion / access | O(1) avg | LRU cache base |
| TreeMap / SortedDict | Sorted by key | O(log n) | Range queries on keys |
| ConcurrentHashMap | Per-bucket lock | O(1) avg | Multithreaded |

**Hash function properties:** deterministic, uniform, fast. Examples: MurmurHash3, xxHash, SipHash (security-critical inputs).

**Patterns:**

```python
# Two sum
seen = {}
for i, x in enumerate(nums):
    if target - x in seen: return [seen[target - x], i]
    seen[x] = i
```

```python
# Group anagrams
from collections import defaultdict
groups = defaultdict(list)
for w in words:
    groups[''.join(sorted(w))].append(w)        # or 26-tuple of counts
return list(groups.values())
```

```python
# Frequency count + top-K
from collections import Counter
import heapq
return heapq.nlargest(k, Counter(arr).keys(), key=Counter(arr).get)
```

**LRU cache (hash map + doubly linked list, O(1) get/put):**

```python
from collections import OrderedDict
class LRU:
    def __init__(self, cap): self.cap = cap; self.d = OrderedDict()
    def get(self, k):
        if k not in self.d: return -1
        self.d.move_to_end(k); return self.d[k]
    def put(self, k, v):
        if k in self.d: self.d.move_to_end(k)
        self.d[k] = v
        if len(self.d) > self.cap: self.d.popitem(last=False)
```

**Patterns map:**

| Problem | Hash trick |
|---|---|
| Two sum | `{value: index}`, check complement |
| Group anagrams | Key = sorted chars or 26-tuple |
| Subarray sum = K | Map of prefix-sum counts |
| LRU cache | OrderedDict / DLL + map |
| Top-K frequent | Counter + heap or bucket sort |
| First non-repeating char | Counter, scan in order |
| Contains duplicate within k | Map of `{val: lastIndex}` |
| Longest consecutive sequence | Set; start streak only if `x-1` not in set |

**Hash set:** keys only; `O(1)` membership. Use for visited tracking, deduplication, set ops (intersection, difference).

**Pitfalls:**

| Mistake | Fix |
|---|---|
| Mutable key (list, dict) | Use tuple / frozenset / namedtuple |
| Iterating while mutating | Copy keys (`list(d)`) or build new dict |
| Forgetting `defaultdict` default | `defaultdict(list)`, `defaultdict(int)`, `defaultdict(set)` |
| Adversarial inputs (DoS) | Use SipHash / randomized seed |

**Rule of thumb:** any time you'd write nested loops to find / count / group, ask: "**hash map?**". It's the universal interview improvement.
