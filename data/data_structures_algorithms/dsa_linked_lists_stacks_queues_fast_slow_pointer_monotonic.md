### Linked Lists, Stacks, Queues

**Linked List:**
- Nodes with value + pointer to next (singly) or next + prev (doubly)
- O(1) insert/delete at known position, O(n) search
- No random access (must traverse from head)

**Common linked list techniques:**
- **Fast/slow pointer (Floyd's)** - detect cycle, find middle, find nth from end
- **Reverse in-place** - iterate with prev/curr/next pointers
- **Dummy head node** - simplifies edge cases (insert/delete at head)
- **Merge two sorted lists** - two-pointer merge

```
Fast/slow cycle detection:
slow = head, fast = head
while fast and fast.next:
    slow = slow.next
    fast = fast.next.next
    if slow == fast: return True  # cycle detected
```

```
Reverse linked list:
prev = None
while curr:
    next_node = curr.next
    curr.next = prev
    prev = curr
    curr = next_node
return prev  # new head
```

**Stack (LIFO - Last In, First Out):**
- Push/pop from top: O(1)
- Use cases: undo, function call stack, expression evaluation, DFS

**Stack patterns:**
- **Monotonic stack** - maintain increasing/decreasing order for next greater/smaller element
- **Valid parentheses** - push open, pop on close, check match
- **Expression evaluation** - operand stack + operator stack

```
Next greater element (monotonic stack):
stack = []
for i in range(len(arr) - 1, -1, -1):
    while stack and stack[-1] <= arr[i]:
        stack.pop()
    result[i] = stack[-1] if stack else -1
    stack.append(arr[i])
```

**Queue (FIFO - First In, First Out):**
- Enqueue at back, dequeue from front: O(1)
- Use cases: BFS, task scheduling, buffering

**Queue variants:**
- **Deque (double-ended queue)** - insert/remove from both ends, O(1)
- **Priority queue (heap)** - dequeue by priority, not insertion order
- **Circular queue** - fixed-size, wraps around

**Deque patterns:**
- **Sliding window maximum** - monotonic deque maintaining max in window
- **BFS with 0-1 weights** - add 0-weight to front, 1-weight to back

**Rule of thumb:** Stack for DFS, backtracking, nested structure validation. Queue for BFS, level-order traversal. Monotonic stack for "next greater/smaller" problems. Fast/slow pointer for cycle detection and middle finding.
