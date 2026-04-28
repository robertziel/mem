### Greedy Algorithms (exchange argument, interval scheduling, Huffman)

**When:** at each step, the **locally optimal** choice provably leads to the **global optimum**. Faster than DP — but only correct when greedy choice property holds. Most "greedy" interview problems either work greedily or need DP — recognizing which is the skill.

**Schema:**

| Component | Detail |
|---|---|
| Greedy choice | At each step, take the candidate that's locally best |
| Proof obligation | **Why** is the greedy choice safe? — exchange argument or matroid theory |
| Failure mode | Greedy can find a *valid* but *suboptimal* answer if the property doesn't hold |

**Greedy vs DP:**

| Property | Greedy | DP |
|---|---|---|
| Subproblem overlap | None | Yes |
| Optimal substructure | Yes | Yes |
| Locally optimal proves global | **Yes** | No (must consider all choices) |
| Time | Usually O(n log n) for sort + scan | Usually O(state space) |

> **Heuristic:** if you can sort the input by some criterion and then scan once, greedy probably works.

**Two proof techniques:**

| Technique | When |
|---|---|
| **Exchange argument** | Show: any optimal solution can be transformed into the greedy one without losing optimality |
| **Matroid / matroid intersection** | Greedy works on a matroid (e.g., MST = matroid on edges) — formal but rare in interviews |

#### Interval scheduling (max non-overlapping intervals)

**Greedy: sort by *end time*, take the earliest-ending compatible.**

```python
def max_non_overlapping(intervals):
    intervals.sort(key=lambda x: x[1])           # by END time
    end = -float('inf'); count = 0
    for start, finish in intervals:
        if start >= end:
            count += 1; end = finish
    return count
```

**Why end time, not start time?** Earliest-ending leaves the most room for the rest. (Exchange argument: any optimal that doesn't pick earliest-ending can swap in earliest-ending without conflict.)

#### Minimum number of arrows / interval covering

```python
def min_arrows(points):
    points.sort(key=lambda p: p[1])              # by END
    arrows = 0; pos = -float('inf')
    for s, e in points:
        if s > pos:
            arrows += 1; pos = e
    return arrows
```

#### Activity selection / meeting rooms II (min rooms needed)

```python
import heapq
def min_meeting_rooms(intervals):
    intervals.sort(key=lambda x: x[0])           # by START
    heap = []                                    # min-heap of end times
    for start, end in intervals:
        if heap and heap[0] <= start:
            heapq.heappop(heap)
        heapq.heappush(heap, end)
    return len(heap)
```

#### Huffman coding (optimal prefix code)

```python
import heapq
def huffman(freqs):                              # freqs: dict char → count
    heap = [[w, [c, ""]] for c, w in freqs.items()]
    heapq.heapify(heap)
    while len(heap) > 1:
        lo = heapq.heappop(heap); hi = heapq.heappop(heap)
        for pair in lo[1:]: pair[1] = '0' + pair[1]
        for pair in hi[1:]: pair[1] = '1' + pair[1]
        heapq.heappush(heap, [lo[0] + hi[0]] + lo[1:] + hi[1:])
    return sorted(heapq.heappop(heap)[1:])
```

> Greedy: repeatedly merge the two least-frequent symbols. The final binary tree gives optimal-length prefix codes.

#### Jump game (can reach end?)

```python
def can_jump(nums):
    farthest = 0
    for i, x in enumerate(nums):
        if i > farthest: return False
        farthest = max(farthest, i + x)
    return True
```

#### Jump game II (min jumps)

```python
def min_jumps(nums):
    jumps = current_end = farthest = 0
    for i in range(len(nums) - 1):
        farthest = max(farthest, i + nums[i])
        if i == current_end:
            jumps += 1; current_end = farthest
    return jumps
```

#### Gas station (circular)

```python
def can_complete_circuit(gas, cost):
    if sum(gas) < sum(cost): return -1
    start = tank = 0
    for i, (g, c) in enumerate(zip(gas, cost)):
        tank += g - c
        if tank < 0:
            start = i + 1; tank = 0
    return start
```

#### Patterns map

| Problem | Greedy criterion |
|---|---|
| Max non-overlapping intervals | Sort by **end time** |
| Min meeting rooms | Sort by start; min-heap on end times |
| Min arrows / interval covering | Sort by end; new arrow when start > last end |
| Schedule with deadlines & profit | Sort by profit desc; DSU for time slots |
| Job sequencing | Sort by profit; DSU / priority queue |
| Fractional knapsack | Sort by **value/weight ratio** |
| Huffman coding | Always merge two smallest |
| Min spanning tree | Sort edges; Kruskal (DSU) |
| Dijkstra | Always pick unsettled node with smallest dist |
| Reconstruct queue by height | Sort by height desc, k asc; insert at index `k` |
| Gas station circuit | If tank goes negative at i, restart at i+1 |
| Largest number from digits | Custom comparator: `a + b vs b + a` |
| Task scheduler with cooldown | Most-frequent task first; min-heap |
| Jump game | Track farthest reach |
| Best time to buy/sell stock II (multi tx) | Sum every positive delta |
| Minimum platforms / cars to schedule | Sort starts and ends separately; sweepline |
| Boats to save people | Two pointers on sorted weights |
| Lemonade change | Always give back the largest bills first |

#### When greedy fails (and you must DP):

| Problem | Why greedy fails | Use |
|---|---|---|
| Coin change with arbitrary coins | E.g., coins = [1, 3, 4], target = 6 → greedy picks 4+1+1 (3 coins), DP picks 3+3 (2 coins) | DP |
| 0/1 knapsack with general weights/values | Greedy by ratio fails; only fractional version is greedy-correct | DP |
| Longest path in general graph | NP-hard | Heuristic / branch-and-bound |
| Edit distance | Local choice depends on global context | DP |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Greedy without proof | Verify with exchange argument or test on edge cases |
| Sorting by wrong key | Try the natural one; if wrong, try the opposite |
| Confusing greedy with DP problem | If greedy fails on a small example, switch to DP |
| Edge case: empty input / single element | Handle explicitly |
| Off-by-one in interval comparison | "Touching" intervals: pick `>` vs `>=` carefully |

**Rule of thumb:** if you can **sort by the right key and scan once**, it's likely greedy — and the right key is usually **end time** for intervals or **value / weight** for ratio problems. **Always be ready to fall back to DP** if your greedy fails on a small counter-example. Exchange argument is the standard correctness proof.
