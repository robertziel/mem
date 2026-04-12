### Arrays and Strings

**Array fundamentals:**
- Contiguous memory, O(1) random access by index
- Insert/delete at end: O(1) amortized (dynamic array)
- Insert/delete at arbitrary position: O(n) (shift elements)
- Search (unsorted): O(n), Search (sorted): O(log n) binary search

**Dynamic array (ArrayList, Vec, Python list):**
- Doubles capacity when full (amortized O(1) append)
- Contiguous, cache-friendly

**Common array/string techniques:**

**Two pointers:**
- Two indices moving toward each other or in same direction
- Use for: palindrome check, sorted pair sum, remove duplicates, container with most water
```
left, right = 0, len(arr) - 1
while left < right:
    # process, move left++ or right--
```

**Sliding window:**
- Fixed or variable-size window over array/string
- Use for: max sum subarray of size K, longest substring without repeating chars
```
left = 0
for right in range(len(arr)):
    window.add(arr[right])
    while window_invalid:
        window.remove(arr[left])
        left += 1
    update_result()
```

**Prefix sum:**
- Precompute cumulative sums for O(1) range sum queries
- `prefix[i] = sum(arr[0..i])`
- Range sum `[l, r] = prefix[r] - prefix[l-1]`

**Hash map for lookups:**
- Two sum: store complement in hash map
- Frequency counting: count occurrences
- Anagram detection: compare character frequency maps

**String-specific:**
- Strings are immutable in most languages (Java, Python, Ruby, Go)
- Concatenation in loop: O(n^2) -> use StringBuilder/join
- Common problems: reverse words, valid palindrome, longest common prefix

**Key complexities:**
| Operation | Array | Linked List |
|-----------|-------|-------------|
| Access by index | O(1) | O(n) |
| Search | O(n) | O(n) |
| Insert at head | O(n) | O(1) |
| Insert at tail | O(1)* | O(1)** |
| Delete | O(n) | O(1)*** |

*amortized, **with tail pointer, ***given node reference

**Rule of thumb:** Two pointers for sorted arrays or palindromes. Sliding window for subarray/substring problems. Hash map when you need O(1) lookup. Prefix sum for range queries.
