### Two Pointers

**When:** sorted array / linked list, palindromes, pair sums, container, dedup. Pointers move monotonically.

**Schema:**

| Variant | Setup | Movement |
|---|---|---|
| Opposite ends | `left=0, right=n-1` | Move toward each other based on condition |
| Same direction | `slow=0, fast=0` | Fast advances; slow advances on condition |
| Read / write | `write=0, read=0` | Write only on filter pass |

**Opposite-ends template:**

```python
left, right = 0, len(arr) - 1
while left < right:
    s = arr[left] + arr[right]
    if s == target:   return [left, right]
    elif s < target:  left += 1
    else:             right -= 1
return [-1, -1]
```

**Same-direction (slow/fast) template:**

```python
# In-place dedup of sorted array; returns new length
slow = 0
for fast in range(len(arr)):
    if fast == 0 or arr[fast] != arr[slow]:
        slow += 1
        arr[slow] = arr[fast]
return slow + 1
```

**Read/write template:**

```python
# Move zeros to end, preserve order
write = 0
for read in range(len(arr)):
    if arr[read] != 0:
        arr[write] = arr[read]; write += 1
while write < len(arr):
    arr[write] = 0; write += 1
```

**Classic problems:**

| Problem | Pointers | Movement rule |
|---|---|---|
| Two sum (sorted) | left, right | Sum < target → left++; > → right-- |
| Valid palindrome | left, right | Skip non-alnum; compare lower-cased |
| Container with most water | left, right | Move the shorter line inward |
| 3sum | i (loop) + left, right | After sort, fix `i`, two-pointer the rest |
| Remove duplicates | slow, fast | Slow writes; fast scans |
| Move zeros | write, read | Write only non-zero, then pad zeros |
| Trapping rain water | left, right + maxL/maxR | Process the smaller side |
| Reverse string in place | left, right | Swap and converge |

**Complexity:** O(n) time, O(1) space (assuming input already sorted, otherwise O(n log n) for sort).

**Pitfalls:**

| Mistake | Fix |
|---|---|
| Forgetting to dedup `i` in 3sum | `if i > 0 and a[i]==a[i-1]: continue` |
| Off-by-one with `<` vs `<=` | Use `left < right` for opposite ends |
| Updating only one pointer | Each iteration must move at least one |

**Rule of thumb:** if input is sorted (or you can sort it), and you need a pair / triplet / window — **two pointers** beats nested loops by an order of complexity. O(n²) → O(n).
