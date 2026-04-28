### Computational Geometry (cross product, orientation, convex hull, segment intersection, sweepline)

**When:** points / segments / polygons in the plane — orientation, intersection, convex hull, closest pair, polygon area, point-in-polygon. The cross product is the universal primitive.

**Schema (the universal primitive):**

| Concept | Formula | Sign meaning |
|---|---|---|
| 2D cross product | `(b - a) × (c - a) = (bx-ax)·(cy-ay) - (by-ay)·(cx-ax)` | > 0: c is **left** of `a→b` (CCW); < 0: right (CW); 0: collinear |
| Dot product | `(b - a) · (c - a) = (bx-ax)·(cx-ax) + (by-ay)·(cy-ay)` | > 0: same direction; 0: perpendicular; < 0: opposite |
| Distance² | `(bx-ax)² + (by-ay)²` | Avoid `sqrt` — compare squared distances |
| Polar angle | `math.atan2(y - cy, x - cx)` | For sorting around a point |

**Why squared distances:** `sqrt` is slow and introduces floating-point error. For "closer than"/"farther than" comparisons, compare `dist²`.

#### Orientation test (CCW / CW / collinear)

```python
def orient(a, b, c):
    v = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    if v > 0: return 1                          # CCW (left turn)
    if v < 0: return -1                         # CW  (right turn)
    return 0                                    # collinear
```

#### Segment intersection (two segments AB and CD)

```python
def segments_intersect(a, b, c, d):
    o1 = orient(a, b, c); o2 = orient(a, b, d)
    o3 = orient(c, d, a); o4 = orient(c, d, b)
    if o1 != o2 and o3 != o4: return True       # general case
    # Collinear special cases
    def on_seg(p, q, r):                        # is r on segment pq?
        return (min(p[0], q[0]) <= r[0] <= max(p[0], q[0]) and
                min(p[1], q[1]) <= r[1] <= max(p[1], q[1]))
    if o1 == 0 and on_seg(a, b, c): return True
    if o2 == 0 and on_seg(a, b, d): return True
    if o3 == 0 and on_seg(c, d, a): return True
    if o4 == 0 and on_seg(c, d, b): return True
    return False
```

#### Polygon area (Shoelace / surveyor's formula)

```python
def polygon_area(pts):
    n = len(pts)
    s = 0
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2
```

> Sign of `s` (without `abs`) tells orientation: positive = CCW, negative = CW.

#### Point-in-polygon (ray casting — odd intersections = inside)

```python
def point_in_polygon(pt, poly):
    x, y = pt
    n = len(poly); inside = False
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]; xj, yj = poly[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside
```

#### Convex hull (Andrew's monotone chain) — O(n log n)

```python
def convex_hull(points):
    pts = sorted(set(map(tuple, points)))
    if len(pts) <= 1: return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)

    upper = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)

    return lower[:-1] + upper[:-1]              # CCW order, no duplicate endpoints
```

> Use `<= 0` to **exclude** collinear points; `< 0` to **include** them.

#### Closest pair of points — O(n log n)

| Approach | How |
|---|---|
| Divide & conquer | Sort by x; recurse on halves; merge across the dividing strip (only need 7 neighbors per point in y-sorted strip) |
| Sweepline + sorted set | Sweep by x; maintain active points in a y-sorted set; for each new point, only neighbors within current best `d` matter |

Both run in O(n log n). The sweepline version is simpler if your language has an ordered set; pure-Python uses divide & conquer. Compare squared distances throughout — never call `sqrt` inside the loop.

> **Sweepline / event-processing problems** (skyline, segment intersection, rectangle union, meeting rooms) live in their own memo — search "sweepline event processing".

#### Picks's theorem (lattice polygons)

`Area = I + B/2 − 1` where `I` = interior lattice points, `B` = boundary lattice points. **Number of lattice points on segment from (x₁,y₁) to (x₂,y₂):** `gcd(|Δx|, |Δy|) + 1`.

#### Patterns map

| Problem | Tool |
|---|---|
| Left/right turn at point | Cross-product orient |
| Are three points collinear | `orient == 0` |
| Do two segments cross | Orientation × 4 + collinear cases |
| Convex hull | Andrew's monotone chain |
| Polygon area | Shoelace |
| Point inside polygon | Ray casting |
| Closest pair of points | Divide & conquer (or sweep + sorted set) |
| Rotate point around origin | `(x cos θ − y sin θ, x sin θ + y cos θ)` |
| Distance from point to line | `|cross(b−a, p−a)| / |b−a|` |
| Triangle area | `|cross(b−a, c−a)| / 2` |

#### Numerical stability

| Issue | Fix |
|---|---|
| Floating-point comparisons | Use `abs(x) < EPS` instead of `x == 0` |
| Cross product overflow on huge coords | Use 64-bit, or compute with rationals |
| `atan2` for collinear sort | Compare cross product directly — avoids floating angles |
| Squared vs Euclidean distance | Compare squared whenever possible |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Forgetting collinear case in segment intersection | Add the four `on_seg` checks |
| Convex hull on points with duplicates | Sort uniquely (`sorted(set(...))`) |
| Convex hull including collinear edge points | Use `<= 0` to drop collinear, `< 0` to keep them |
| Polygon area with self-intersecting polygon | Shoelace gives signed (algebraic) area — be careful |
| Point-in-polygon ray exactly through vertex | Use the parity rule; or perturb |

#### Complexity summary

| Algorithm | Time |
|---|---|
| Orientation / segment intersection | O(1) |
| Convex hull (Andrew / Graham) | O(n log n) |
| Polygon area (shoelace) | O(n) |
| Point-in-polygon (ray cast) | O(n) |
| Closest pair (D&C or sweep) | O(n log n) |

**Rule of thumb:** **the cross product is the universal primitive** — orientation, intersection, polygon area, and convex hull all rest on it. **Compare squared distances** to avoid `sqrt`. **Andrew's monotone chain** is the easiest convex hull to remember (sort + two passes). For "events along the x-axis" problems (skyline, intervals, rectangles), reach for **sweepline + heap / sorted set**.
