### FIFO (First In, First Out)

**What FIFO means:**
- The first item added is the first item removed
- Think: line at a checkout, ticket queue, print queue
- Typical data structure: **queue**

**Mental model:**
```text
enqueue A
enqueue B
enqueue C

dequeue -> A
dequeue -> B
dequeue -> C
```

**Where FIFO shows up:**
- Queue data structures
- Breadth-first search (BFS)
- Background job processing
- Message queues
- Buffering and scheduling

**FIFO vs other orderings:**
| Pattern | Meaning | Example |
|---------|---------|---------|
| FIFO | First in, first out | Queue at a bank |
| LIFO | Last in, first out | Stack / undo |
| Priority queue | Highest priority first | Job scheduler |

**Why FIFO is useful:**
- Fair processing order
- Predictable behavior
- Natural fit for tasks arriving over time

**Common gotchas:**
- FIFO does **not** mean globally ordered across all workers in every system
- Distributed queues may preserve order only per queue, partition, or message group
- Retries can affect observed processing order

**In Python:**
```python
from collections import deque

q = deque()
q.append("A")
q.append("B")
q.append("C")

first = q.popleft()   # "A"
```

**Rule of thumb:** If work should be handled in arrival order, think FIFO and use a queue. If newest item should be handled first, that is LIFO, not FIFO.
