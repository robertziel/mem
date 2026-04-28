### K-D Tree (multidimensional search, nearest neighbor, range query, spatial index)

**When:** nearest-neighbor / range queries on points in **low-dimensional** space (k ≤ ~10) — robotics, GIS, computer graphics, KNN classifier on small features. Above ~20 dimensions, the curse of dimensionality kills the speedup; switch to brute force or approximate methods.

**Schema:**

| Concept | Detail |
|---|---|
| Binary tree | Each internal node represents a hyperplane orthogonal to one axis |
| Splitting axis | Cycle through axes (`depth % k`) — or pick axis of max variance |
| Split value | Median of the chosen axis among current points |
| Each node holds | A point + axis index + left/right children |
| Build | O(n log n) using nth-element / quickselect at each level |
| NN query | O(log n) average; O(n) worst case (degenerate distributions) |
| Range query | O(n^(1−1/k) + r) where r = #results |

#### Build

```python
def build_kdtree(points, depth=0):
    if not points: return None
    k = len(points[0])
    axis = depth % k
    points.sort(key=lambda p: p[axis])
    median = len(points) // 2
    return {
        "point": points[median],
        "axis": axis,
        "left":  build_kdtree(points[:median], depth + 1),
        "right": build_kdtree(points[median + 1:], depth + 1),
    }
```

> Use `quickselect` (`statistics.median_low` + partition) for **O(n log n)** build instead of `O(n log² n)` from full sort at each level.

#### Nearest-neighbor query

```python
def nn(node, target, best=(None, float('inf'))):
    if node is None: return best
    p, axis = node["point"], node["axis"]
    d2 = sum((a - b) ** 2 for a, b in zip(p, target))
    if d2 < best[1]: best = (p, d2)
    diff = target[axis] - p[axis]
    near, far = (node["left"], node["right"]) if diff < 0 else (node["right"], node["left"])
    best = nn(near, target, best)
    if diff * diff < best[1]:                     # check if other side could contain closer
        best = nn(far, target, best)
    return best
```

> **Branch-and-bound**: descend the side containing the target first; check the other side only if its hyperplane is closer than the current best.

#### K-nearest neighbors (k-NN)

```python
import heapq

def knn(node, target, k, heap=None):
    """Returns the k nearest points to target. heap = max-heap of (-dist², point)."""
    if heap is None: heap = []
    if node is None: return heap
    p, axis = node["point"], node["axis"]
    d2 = sum((a - b) ** 2 for a, b in zip(p, target))
    if len(heap) < k:
        heapq.heappush(heap, (-d2, p))
    elif d2 < -heap[0][0]:
        heapq.heapreplace(heap, (-d2, p))
    diff = target[axis] - p[axis]
    near, far = (node["left"], node["right"]) if diff < 0 else (node["right"], node["left"])
    knn(near, target, k, heap)
    if len(heap) < k or diff * diff < -heap[0][0]:
        knn(far, target, k, heap)
    return heap
```

#### Range query (orthogonal box)

```python
def range_search(node, lo, hi, out=None):
    if node is None: return out or []
    if out is None: out = []
    p, axis = node["point"], node["axis"]
    if all(lo[i] <= p[i] <= hi[i] for i in range(len(p))):
        out.append(p)
    if lo[axis] <= p[axis]: range_search(node["left"], lo, hi, out)
    if hi[axis] >= p[axis]: range_search(node["right"], lo, hi, out)
    return out
```

#### Properties

| Property | Detail |
|---|---|
| Build | O(n log n) with median-of-medians or quickselect |
| Memory | O(n) |
| NN expected | O(log n) for low `k` (≤ ~10) |
| NN worst case | O(n) — happens when target is "outside" the data cloud or in skewed distributions |
| Range query | O(n^(1 − 1/k) + r) — degrades fast in high dimensions |
| Curse of dimensionality | At `k ≥ ~20`, ratio of nearest to farthest distance → 1; tree pruning becomes useless |

#### K-D tree vs alternatives

| Need | Use |
|---|---|
| Low-d NN (k ≤ 10) | **K-D tree** |
| Mid-d NN (10 ≤ k ≤ 50) | **Ball tree** / cover tree |
| High-d NN (k > 50) | Approximate: **HNSW**, **FAISS**, **Annoy** |
| Range queries on rectangles | K-D tree, R-tree, KD-trie |
| 2D spatial index for moving objects | **R-tree** |
| Approx NN over embeddings (1024+ d) | **HNSW** / FAISS IVF / **Locality-Sensitive Hashing** |
| Exact NN, n ≤ 10⁴ | Just brute force `O(n · k)` |
| Geographic queries | R-tree, geohash, S2 |

#### Use cases

| Application | Detail |
|---|---|
| Robotics: nearest obstacle / waypoint | 2D / 3D K-D tree |
| Photogrammetry / SfM | 3D point cloud NN |
| Particle simulation | Find pairs within radius — range query |
| KNN classifier in low-d | Feature space |
| Game AI: find nearest enemy | 2D/3D K-D tree |
| Astronomy: matching catalogs | RA/Dec K-D tree |
| Computer vision: feature matching (SIFT/ORB) | 128-d — borderline (use FLANN or approximate) |

#### KD-tree vs Ball tree vs R-tree

| Aspect | K-D tree | Ball tree | R-tree |
|---|---|---|---|
| Splits along | Single axis | Hyperspheres | Bounding boxes |
| High-d performance | Bad | Better | Worse than K-D |
| Range queries | ✓ | ✓ | **✓** (designed for this) |
| Dynamic inserts | Costly to rebalance | Same | **✓** good |
| Memory | O(n) | O(n) | O(n) |
| Used in | scipy, sklearn | sklearn (preferred for d > 20) | PostGIS, MongoDB, ElasticSearch |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Building from sorted input → degenerate tree | Always **median split** at each node |
| Curse of dimensionality (`k ≥ 20`) | Use approximate methods (HNSW / Annoy / FAISS) |
| NN expecting Euclidean but using Manhattan | Adjust distance + pruning condition |
| Comparing squared vs actual distance inconsistently | Stay in squared space everywhere — avoid `sqrt` |
| Adding / removing points without rebuild | K-D trees degrade — rebuild periodically |
| Ignoring duplicate points | Build can recurse infinitely — handle ties |
| K-D tree on large categorical features | Wrong tool — use hash-based methods |

#### Complexity

| Op | Average | Worst |
|---|---|---|
| Build | O(n log n) | O(n²) (poor median selection) |
| NN | O(log n) | O(n) |
| KNN (k of them) | O(log n + k) typical | O(n) |
| Range (in box) | O(n^(1−1/d) + r) | O(n) |
| Insert | O(log n) | O(n) (skewed tree) |

**Rule of thumb:** **K-D tree = NN search in low dimensions**. Sort by current axis, split at median, alternate axes. Below ~20 dimensions: O(log n) NN. Above ~20: switch to approximate methods (**HNSW**, **FAISS**). For range queries on 2D rectangles, **R-tree**. For dynamic inserts, **Ball tree** or rebuild periodically. Always **stay in squared distance space** to avoid `sqrt` overhead.
