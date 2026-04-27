### Hash Maps (Hash Tables)

**How it works:**
- Key -> hash function -> index in array of buckets
- Average O(1) for insert, lookup, delete
- Worst case O(n) when many collisions

**Collision resolution:**
- **Chaining** - each bucket holds a linked list of entries (most common)
- **Open addressing** - probe for next empty slot (linear probing, quadratic, double hashing)
- **Robin Hood hashing** - reduce variance by swapping with "rich" slots

**Hash function properties:**
- Deterministic: same key always produces same hash
- Uniform distribution: minimize collisions
- Fast to compute
- Examples: murmur3, xxhash, SipHash (for security)

**Load factor:**
- `load_factor = entries / buckets`
- Resize (typically double) when load factor exceeds threshold (0.75 in Java)
- Resize is O(n) but amortized O(1)

**Ordered variants:**
- **LinkedHashMap** (Java) / insertion-ordered dict (Python 3.7+) - maintains insertion order
- **TreeMap** (Java) / SortedDict - keys sorted, O(log n) operations

**Common interview patterns:**
- **Two Sum**: store `{value: index}`, check if complement exists
- **Group Anagrams**: key = sorted characters, value = list of words
- **Subarray Sum = K**: prefix sum + hash map of prefix sums seen
- **LRU Cache**: hash map + doubly linked list (O(1) get and put)
- **Frequency count**: count occurrences, find top-K, check if permutation

**Hash set:**
- Hash map with keys only (no values)
- O(1) membership test
- Use for: deduplication, visited tracking, set operations

**Python dict / Ruby hash specifics:**
```python
# Python defaultdict
from collections import defaultdict, Counter
freq = Counter("hello")          # {'l': 2, 'h': 1, 'e': 1, 'o': 1}
graph = defaultdict(list)
graph[node].append(neighbor)
```

```ruby
# Ruby
freq = Hash.new(0)
"hello".each_char { |c| freq[c] += 1 }
```

**Rule of thumb:** Hash maps are the go-to for O(1) lookup. Use when you need to count, group, or check existence. Recognize "can we do this faster with a hash map?" as a universal interview improvement.
