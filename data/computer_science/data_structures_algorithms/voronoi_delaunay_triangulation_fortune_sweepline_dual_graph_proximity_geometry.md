### Voronoi / Delaunay / Fortune (sweepline, dual graph, proximity geometry)

**When:** "for each point, what region is closest to it?", nearest-neighbor structure of a point set, mesh generation, robotics path planning, GIS / map analysis. Built once in O(n log n); answer queries quickly.

**Schema:**

| Concept | Detail |
|---|---|
| **Voronoi diagram** | Partition of the plane into cells; each cell = points closest to one input site |
| **Voronoi edge** | Equidistant boundary between two cells (perpendicular bisector segment) |
| **Voronoi vertex** | Point equidistant to ≥ 3 sites |
| **Delaunay triangulation** | **Dual graph** of Voronoi: connect two sites iff their cells share an edge |
| Empty-circle property | Every Delaunay triangle's circumcircle contains no other site |
| Max-min angle | Delaunay maximizes the minimum angle among all triangulations |

> **Voronoi and Delaunay are duals** — building one gives the other in linear time.

#### Why Delaunay matters

| Property | Detail |
|---|---|
| **Nearest-neighbor edge** | The closest pair is connected by a Delaunay edge — so NN reduces to a graph search on Delaunay |
| **Euclidean MST ⊆ Delaunay** | EMST is a subgraph of the Delaunay triangulation |
| **Max-min angle** | Best triangulation for FEM (avoids skinny triangles) |
| Convex hull | Outer face of Delaunay = convex hull |

#### Construction algorithms

| Algorithm | Time | Notes |
|---|---|---|
| **Fortune's sweepline** | **O(n log n)** | Voronoi directly; classic |
| **Bowyer-Watson** (incremental) | O(n log n) avg, O(n²) worst | Easy to memorize for Delaunay |
| **Divide & conquer (Guibas-Stolfi)** | O(n log n) | Often fastest in practice |
| **Lifting + 3D convex hull** | O(n log n) | Lift to paraboloid, take lower hull |
| **Randomized incremental** | O(n log n) expected | Used in CGAL |

#### Fortune's sweepline (Voronoi in O(n log n))

| Component | Detail |
|---|---|
| **Sweepline** | Horizontal line moving downward |
| **Beach line** | Sequence of parabolic arcs (one per visible site above the sweepline) |
| **Site event** | Sweepline reaches a new site → insert a new arc |
| **Circle event** | Three arcs meet at a circumcircle's bottom → arc disappears, Voronoi vertex created |
| Data structure | Balanced BST for beach line + priority queue for events |

> The beach line is the **boundary between processed sites and the empty region**. Voronoi edges are traced as arcs disappear.

#### Bowyer-Watson (incremental Delaunay — easier to code)

```text
Add a "super-triangle" containing all input points.
For each point p:
  1. Find all triangles whose circumcircle contains p (the "bad" triangles).
  2. Remove them, leaving a polygonal hole.
  3. Connect p to every vertex of the hole boundary.
After all inserts, remove triangles touching the super-triangle.
```

```python
# Bowyer-Watson sketch (uses point-in-circumcircle test)
def in_circumcircle(p, a, b, c):
    ax, ay = a[0]-p[0], a[1]-p[1]
    bx, by = b[0]-p[0], b[1]-p[1]
    cx, cy = c[0]-p[0], c[1]-p[1]
    return (ax*(by*(cx*cx+cy*cy) - cy*(bx*bx+by*by))
            - ay*(bx*(cx*cx+cy*cy) - cx*(bx*bx+by*by))
            + (ax*ax+ay*ay)*(bx*cy - by*cx)) > 0
```

#### Use cases

| Problem | Use |
|---|---|
| Closest-pair of points | Edge in Delaunay (or via D&C / sweepline) |
| Nearest-neighbor graph | Subset of Delaunay edges |
| Euclidean MST | Build Delaunay, run Kruskal on its edges |
| K-nearest neighbors (preprocessed) | Walk Delaunay |
| Air-route / sensor coverage | Voronoi cells = "owned" regions |
| Largest empty circle | Voronoi vertex with max distance to nearest site |
| Mesh generation (FEM) | Delaunay triangulation; Lloyd relaxation for quality |
| Motion planning (Voronoi diagram of obstacles) | Roadmap of safest paths (max distance to obstacles) |
| Lloyd's k-means | Voronoi cells = cluster regions |
| GIS service-area maps | Voronoi |
| Largest empty rectangle | Different — geometric sweepline |

#### Special variants

| Variant | What |
|---|---|
| **Power diagram** | Generalized Voronoi with weighted distances |
| **Centroidal Voronoi tessellation (CVT)** | Lloyd iteration converges to balanced cells |
| **Higher-order Voronoi** | Cells of "k-th nearest" instead of nearest |
| **Voronoi on the sphere** | Spherical version (Earth, S2 geometry) |
| **Restricted Delaunay** | Delaunay edges inside a domain |
| **3D Voronoi / Delaunay** | Tetrahedra; O(n²) worst, O(n log n) avg |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Floating-point precision in circumcircle test | Use **exact predicates** (Shewchuk's, CGAL) for robustness |
| Co-circular points (4 on one circle) | Tie-break by perturbation or careful predicates |
| Co-linear points | No 2D Delaunay triangulation exists; remove duplicates |
| Building Voronoi without bounded box | Cells extend to infinity; clip to bounding rect |
| Implementing Fortune's by hand | Hard — use CGAL, scipy.spatial, or `voronoi`/`Triangle` libraries |
| Confusing power diagram with Voronoi | Different distance functions |
| Forgetting Delaunay's super-triangle removal | Cleanup step at the end |

#### Complexity

| Op | Cost |
|---|---|
| Build (any optimal algorithm) | O(n log n) |
| Memory | O(n) (linear edges / faces by Euler's formula) |
| NN query (after Delaunay) | O(log n) avg via point location |
| Adding a single point (incremental) | O(log n) avg |
| Building EMST from Delaunay | O(n log n) |

#### Practical libraries

| Language | Library |
|---|---|
| Python | `scipy.spatial.Voronoi`, `Delaunay` |
| C++ | CGAL, `Triangle` (Shewchuk), Geogram |
| JS | d3-delaunay (very fast) |
| Rust | `spade` |
| Game / graphics | Many in-engine implementations |

**Rule of thumb:** **Voronoi = closest-region partition; Delaunay = its dual graph**. Build either in **O(n log n)** (Fortune's for Voronoi, Bowyer-Watson or D&C for Delaunay). The closest pair, NN, EMST, and motion-planning roadmaps all reduce to **graph operations on Delaunay**. Use **exact predicates** in production — floating-point breaks down on co-circular / collinear inputs.
