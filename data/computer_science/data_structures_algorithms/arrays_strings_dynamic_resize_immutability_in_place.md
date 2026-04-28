### Arrays & Strings

**When:** indexed sequence; default container for ordered data.

**Schema:**

| Property | Array | Linked list |
|---|---|---|
| Memory | Contiguous | Scattered nodes |
| Random access | O(1) | O(n) |
| Insert head | O(n) shift | O(1) |
| Insert tail | O(1) amortized | O(1) with tail pointer |
| Delete given reference | O(n) shift | O(1) |
| Cache friendliness | Excellent | Poor |

**Dynamic array (Python list, Java ArrayList, Go slice, C++ vector):**

| Mechanism | Detail |
|---|---|
| Capacity | Backing array, doubles when full |
| Append | O(1) amortized; resize is O(n) but rare |
| Memory waste | Up to ~50% (between resizes) |

**String specifics:**

| Language | Mutable? | Concat in loop |
|---|---|---|
| Java, Python, Ruby, Go, JS | Immutable | O(n²) — use builder / `''.join()` |
| C, C++ (`std::string`) | Mutable | Append O(1) amortized |
| Rust `String` | Mutable | Append O(1) amortized |

**In-place techniques:**

```python
# Reverse in place
left, right = 0, len(arr) - 1
while left < right:
    arr[left], arr[right] = arr[right], arr[left]
    left += 1; right -= 1
```

```python
# Remove duplicates from sorted (return new length)
write = 0
for read in range(len(arr)):
    if read == 0 or arr[read] != arr[read - 1]:
        arr[write] = arr[read]; write += 1
return write
```

**Common interview drills:**

| Problem | Technique |
|---|---|
| Reverse string / array | Two pointers swap |
| Valid palindrome | Two pointers (skip non-alnum) |
| Remove duplicates from sorted | Two-pointer write index |
| Move zeroes to end | Two-pointer write index |
| Rotate array by k | Reverse all, reverse first k, reverse last n-k |
| Best time to buy/sell stock | Track min so far; max profit |
| Maximum subarray (Kadane) | Running sum reset at negative |
| Product of array except self | Prefix + suffix products |

**Rule of thumb:** array is the default. Reach for **two pointers** on sorted / palindrome problems, **prefix products / sums** for "every-element-except-self" patterns, **builder/join** to avoid O(n²) string concat.
