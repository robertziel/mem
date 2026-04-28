### Linked List (singly, doubly, Floyd cycle, reverse, dummy head)

**When:** O(1) insert/delete given a node reference; no random access. The recurring tricks are fast/slow pointer, in-place reverse, and dummy head.

**Schema:**

| Type | Each node has | Use |
|---|---|---|
| Singly linked | `val`, `next` | Default; cheapest |
| Doubly linked | `val`, `next`, `prev` | LRU cache, deque, O(1) deletion in either direction |
| Circular | last `next` → head | Round-robin scheduler |

**Node:**

```python
class Node:
    def __init__(self, val=0, next=None):
        self.val = val; self.next = next
```

**Reverse in place:**

```python
prev, curr = None, head
while curr:
    nxt = curr.next
    curr.next = prev
    prev, curr = curr, nxt
return prev      # new head
```

**Floyd's cycle detection (tortoise & hare):**

```python
slow = fast = head
while fast and fast.next:
    slow = slow.next
    fast = fast.next.next
    if slow == fast:
        # cycle exists; to find start, restart one pointer at head
        p = head
        while p != slow:
            p = p.next; slow = slow.next
        return p     # cycle entrance
return None
```

**Find middle / n-th from end:**

```python
# Middle (slow lands on middle when fast reaches end)
slow = fast = head
while fast and fast.next:
    slow = slow.next; fast = fast.next.next
return slow

# n-th from end
fast = head
for _ in range(n): fast = fast.next
slow = head
while fast:
    slow = slow.next; fast = fast.next
return slow
```

**Dummy head (eliminates head-edge-case branching):**

```python
dummy = Node(0, head)
prev = dummy
while prev.next:
    if condition(prev.next):
        prev.next = prev.next.next
    else:
        prev = prev.next
return dummy.next
```

**Merge two sorted lists:**

```python
dummy = tail = Node()
while a and b:
    if a.val <= b.val: tail.next, a = a, a.next
    else:              tail.next, b = b, b.next
    tail = tail.next
tail.next = a or b
return dummy.next
```

**Classic problems:**

| Problem | Technique |
|---|---|
| Detect cycle | Floyd's tortoise-hare |
| Find cycle start | Floyd + restart from head |
| Reverse | Iterative prev/curr/next |
| Reverse between m and n | Dummy + sub-reverse splicing |
| Merge two sorted | Dummy head + two-pointer |
| Merge K sorted | Heap of (val, list_id) |
| Remove n-th from end | Two pointers, gap of n |
| Palindrome linked list | Reverse second half, compare |
| Add two numbers | Walk both with carry |
| Copy with random pointer | Hash map old → new, two passes |

**Complexity:** all techniques O(n) time, O(1) space (except merge K sorted: O(n log k)).

**Pitfalls:**

| Mistake | Fix |
|---|---|
| Losing head reference | Use dummy head |
| Not handling cycles | Floyd's, or visited set |
| Off-by-one in n-th from end | Advance fast `n` steps then both together |
| Modifying `next` before saving it | Save `nxt = curr.next` first |

**Rule of thumb:** **dummy head** removes head-edge cases. **Fast/slow pointer** for cycle / middle / n-th-from-end. **Always save `next` before mutating.**
