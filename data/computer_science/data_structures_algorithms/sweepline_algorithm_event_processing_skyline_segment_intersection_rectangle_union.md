### Sweepline (event processing — skyline, segment intersection, rectangle union, interval overlap)

**When:** any problem that decomposes into "events along the x-axis" — start / end of intervals, segments crossing a vertical line, rectangle insertion / removal, time-based job scheduling. The universal **`O(n log n)` event-driven** pattern.

**Schema:**

| Concept | Detail |
|---|---|
| Events | `(x, type, payload)` — sorted by `x` (with type as tie-breaker) |
| Sweep line | Imaginary vertical line moving left → right |
| Active set | Items currently intersected by the line; ordered by `y` (or another secondary key) |
| Per-event work | Insert / remove from active set; emit output if a relevant change happens |
| Total time | O((n + k) log n), where `k` = additional events generated (e.g., intersection points) |

#### Use-case map

| Problem | Active set | Event |
|---|---|---|
| **Skyline** (silhouette of buildings) | Heights currently active | Building start / end |
| **Bentley-Ottmann** (segment intersection) | Segments crossing line, sorted by `y` | Endpoint enter / leave / **intersection** (added dynamically) |
| **Rectangle union area** | y-intervals currently active | Rectangle left / right |
| **Meeting rooms II** (max simultaneous intervals) | Currently open intervals | Start / end |
| **Closest pair of points (sweepline variant)** | Points within `d` of sweep | Add on enter; remove on leaving the strip |
| **Number of pairs whose intervals overlap** | Open intervals | Start / end |
| **Stabbing query** (intervals containing point x) | Active intervals | Insert / delete |
| **K-th smallest in time-windowed set** | y-sorted active set | Time-based insert / remove |

#### Skyline — heap-based template

```python
import heapq

def skyline(buildings):                              # [(L, R, H)]
    events = []
    for L, R, H in buildings:
        events.append((L, -H, R))                    # start (use negative H for max-heap)
        events.append((R, 0, 0))                     # end sentinel
    events.sort()
    res = []
    heap = [(0, float('inf'))]                       # (negH, endX) ground level
    for x, negH, R in events:
        if negH != 0:
            heapq.heappush(heap, (negH, R))
        while heap[0][1] <= x:
            heapq.heappop(heap)                      # drop expired
        cur = -heap[0][0]
        if not res or res[-1][1] != cur:
            res.append([x, cur])
    return res
```

| Helper | Role |
|---|---|
| Events list | Sort by `x`; ties: process starts before ends to capture peaks correctly |
| Max-heap of `(−H, R)` | Tracks tallest active building |
| **Lazy delete** | Pop expired entries from heap top when their `R ≤ x` |
| Output condition | Emit a key point only when the current max changes |

#### Bentley-Ottmann (find all segment intersections) — sketch

| Phase | Action |
|---|---|
| Init | Push **start** and **end** events for every segment into a priority queue, sorted by `x` |
| Process start | Insert segment into active BST keyed by `y` at sweep-line; check intersection with **immediate neighbors** above / below |
| Process end | Remove segment; check intersection between its old neighbors |
| Process intersection | Swap the two segments' order in active BST; check new neighbor pairs |
| Output | All intersection points |

> Output-sensitive: **O((n + k) log n)** where `k` = #intersections. Faster than the naive O(n²) when intersections are sparse.

#### Rectangle union area — sketch

```text
Events: each rectangle gives a (L, +1, [y1, y2]) start and (R, -1, [y1, y2]) end event.
Active set: a multiset of y-intervals (or a segment tree on y-coords).
Sweep: between consecutive event x-values, area += (covered_y_length) · (x_delta).
```

| Component | Detail |
|---|---|
| `covered_y_length` | Length of y-axis covered by ≥1 active interval |
| Implementation | Coordinate-compress y; segment tree with "count" + "covered" per node |
| Time | O(n log n) |

#### Meeting rooms II (max overlap)

```python
def min_rooms(intervals):
    events = []
    for s, e in intervals:
        events.append((s, +1))                       # start
        events.append((e, -1))                       # end
    events.sort(key=lambda x: (x[0], x[1]))           # ends before starts at same time
    cur = best = 0
    for _, delta in events:
        cur += delta; best = max(best, cur)
    return best
```

| Tie-break | Why |
|---|---|
| Start before end at same `x` | Counts a moment of "both" — wrong if rooms can be reused at boundary |
| End before start at same `x` | Treats a meeting ending and another starting as **non-overlapping** (typical "rooms" semantics) |
| Choose based on problem | Read the spec carefully |

#### Active-set data structure choices

| Need | Use |
|---|---|
| Max active value (skyline) | Max-heap with lazy delete |
| Insert / delete / find neighbor (Bentley-Ottmann) | Balanced BST / `std::set` / `SortedList` |
| Range covered (rectangle union) | Segment tree with lazy |
| Count active | Counter / `+1` `-1` events |
| K-th in current window | Order-statistics tree or persistent BIT |

#### Patterns map

| Phrasing | Pattern |
|---|---|
| "Maximum / minimum simultaneous intervals" | `+1 / -1` events + running counter |
| "Skyline / silhouette" | Max-heap with lazy delete |
| "All segment intersections" | Bentley-Ottmann |
| "Rectangle union area" | Sweep + segment tree on y |
| "Smallest / largest empty interval among active" | Active sorted set |
| "K-th element in moving window" | Sorted set + sweep |
| "Closest pair of points" | Sweep by x; sorted set by y |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Wrong tie-break order at events with same `x` | Decide "start vs end first" by problem semantics |
| Using `list` for active set | O(n) per op — use balanced BST / SortedList |
| Forgetting to lazy-delete expired heap entries | Skyline produces wrong heights |
| Coordinate compression off-by-one | Map both endpoints; handle range as half-open or closed consistently |
| Bentley-Ottmann adding intersection events without lazy handling | Inserting into active set as you go is required |
| Recomputing covered length scratch | Use a segment tree with "covered" + "count" |

#### Complexity summary

| Problem | Time |
|---|---|
| Skyline | O(n log n) |
| Bentley-Ottmann | O((n + k) log n) |
| Rectangle union area | O(n log n) |
| Meeting rooms / max overlap | O(n log n) |
| Closest pair (sweep variant) | O(n log n) |
| Memory | O(n) |

**Rule of thumb:** **sweepline = sort events by `x`, maintain an active set, process events left to right**. Choose the active-set structure by query type: **heap with lazy delete** for skyline, **balanced BST** for neighbor queries (Bentley-Ottmann), **segment tree** for range coverage (rectangle union), **counter** for max-overlap. Tie-break events at equal `x` carefully — that's the most common subtle bug.
