### K-Means Clustering (Lloyd's iteration, centroids, unsupervised partition, k-means++)

**When:** partition `n` points into `k` clusters where each point belongs to the nearest centroid (Voronoi-style). The default unsupervised baseline — customer segmentation, image compression (color palettes), document clustering, anomaly detection.

**Schema (Lloyd's algorithm):**

| Step | Action |
|---|---|
| 1. Initialize | Pick `k` initial centroids (k-means++ recommended) |
| 2. Assign | Each point → nearest centroid (argmin Euclidean distance) |
| 3. Update | Each centroid ← mean of its assigned points |
| 4. Repeat | Until assignments stabilize (or max iterations) |

**Loss minimized:** `Σ over clusters Σ over points ‖x − μ_cluster‖²` (within-cluster sum of squares, **WCSS**). Lloyd's monotonically decreases WCSS — converges to a **local** minimum.

#### Implementation (NumPy-style pseudocode in pure Python)

```python
import math, random

def kmeans(points, k, max_iter=100, tol=1e-6):
    """points: list of tuples; k: number of clusters. Returns (centroids, labels)."""
    centroids = kmeans_pp_init(points, k)
    n = len(points); d = len(points[0])

    for _ in range(max_iter):
        # Assign
        labels = []
        for p in points:
            best, best_d = 0, float('inf')
            for ci, c in enumerate(centroids):
                dist = sum((p[i] - c[i]) ** 2 for i in range(d))
                if dist < best_d: best_d, best = dist, ci
            labels.append(best)

        # Update
        sums = [[0.0] * d for _ in range(k)]
        counts = [0] * k
        for p, lbl in zip(points, labels):
            counts[lbl] += 1
            for i in range(d): sums[lbl][i] += p[i]
        new_centroids = []
        for ci in range(k):
            if counts[ci] == 0:                      # empty cluster — re-seed randomly
                new_centroids.append(points[random.randint(0, n - 1)])
            else:
                new_centroids.append(tuple(sums[ci][i] / counts[ci] for i in range(d)))

        # Convergence check
        shift = sum(math.dist(c, nc) for c, nc in zip(centroids, new_centroids))
        centroids = new_centroids
        if shift < tol: break

    return centroids, labels
```

#### k-means++ initialization (the standard)

```python
def kmeans_pp_init(points, k):
    centroids = [random.choice(points)]
    for _ in range(k - 1):
        d2 = [min(sum((p[i] - c[i]) ** 2 for i in range(len(p))) for c in centroids) for p in points]
        s = sum(d2)
        r = random.random() * s
        cum = 0
        for p, w in zip(points, d2):
            cum += w
            if cum >= r:
                centroids.append(p); break
    return centroids
```

> **k-means++ probability**: pick each new centroid with probability proportional to its squared distance from the nearest existing centroid. Provably gives **O(log k)-approximation** to the optimal k-means in expectation.

#### How to choose `k`

| Method | Detail |
|---|---|
| **Elbow method** | Plot WCSS vs `k`; pick the "elbow" — diminishing returns |
| **Silhouette score** | `(b − a) / max(a, b)` per point; mean over all points; max over `k` |
| **Gap statistic** | Compare WCSS to that of uniform random data |
| **Domain knowledge** | "We want 5 customer segments" |
| **X-means / G-means** | Adaptive: split clusters that improve a criterion (BIC) |
| **Cross-validation** | If labels exist (semi-supervised) |

#### Variants

| Variant | What's different |
|---|---|
| **k-means++** | Smarter initialization — almost always use this |
| **Mini-batch k-means** | Each iteration uses a random sample (sklearn default for large data) |
| **Spherical k-means** | Cosine similarity instead of Euclidean (text / TF-IDF) |
| **k-medoids (PAM)** | Centroids must be actual data points; robust to outliers |
| **Fuzzy c-means** | Soft assignment via membership probabilities |
| **k-modes** | Categorical features (mode instead of mean) |
| **Bisecting k-means** | Recursively split largest cluster |
| **DBSCAN / OPTICS** | Density-based — handles arbitrary shapes, no `k` |
| **Hierarchical (agglomerative)** | Build a dendrogram; cut to get `k` clusters |
| **Gaussian Mixture Model (GMM) + EM** | Probabilistic version; soft assignment |

#### k-means vs alternatives

| Property | k-means | DBSCAN | Hierarchical | GMM |
|---|---|---|---|---|
| Need to specify `k` | Yes | No | No (cut where you want) | Yes |
| Cluster shape | Convex / spherical | Arbitrary | Any | Elliptical |
| Outlier-robust | No | **Yes** | Sensitive | Some |
| Time | O(n · k · iter) | O(n log n) | O(n²) | O(n · k · iter) |
| Memory | O(n · d) | O(n) | O(n²) | O(n · d) |
| Soft / probabilistic | No | No | No | **Yes** |

#### Use cases

| Application | Detail |
|---|---|
| Customer segmentation | RFM features, k = 4–8 |
| Image color quantization | Pixels in RGB; k = palette size (e.g., 16) |
| Document clustering | TF-IDF + spherical k-means |
| Anomaly detection | Distance to nearest centroid |
| Vector quantization (compression) | Approximate dataset by `k` codewords |
| Pre-clustering for KNN speedup | Cluster + search only nearest cluster |
| Initialization for GMM EM | k-means provides starting centers |
| Skeleton-based motion clustering | Pose vectors |

#### Properties

| Property | Detail |
|---|---|
| Convergence | Always — WCSS monotonically decreases |
| Optimality | Only **local** — different initializations give different answers |
| Time per iter | O(n · k · d) for n points, k clusters, d dimensions |
| Iters to converge | Typically O(log n) in practice; worst case Ω(2^√n) |
| Sensitivity to scale | High — **standardize features** before clustering |
| Empty clusters | Handle by reinitializing |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Random init (not k-means++) | Use **k-means++** — far better local optimum |
| Not standardizing features | Distance dominated by largest-scale feature — z-score first |
| Treating Lloyd's local optimum as global | Run **multiple restarts**, take best WCSS |
| Picking `k` arbitrarily | Use elbow / silhouette / gap statistic |
| Using k-means on non-convex clusters | Switch to DBSCAN |
| Using k-means on categorical data | Switch to k-modes |
| Empty clusters not handled | Re-seed randomly or pick the farthest-from-centroid point |
| High dimensions ("curse of dimensionality") | PCA / UMAP first; or switch to spherical k-means |

#### Complexity

| Op | Cost |
|---|---|
| Time per iteration | O(n · k · d) |
| Total iterations | O(log n) typical |
| Total | O(n · k · d · iter) |
| Memory | O(n · d) for points + O(k · d) for centroids |
| k-means++ init | O(n · k · d) |
| Mini-batch | O(b · k · d) per iter, `b` ≪ n |

**Rule of thumb:** k-means = **iterate assign-to-nearest, recompute-as-mean**. Always start with **k-means++**, **standardize features**, and **run multiple restarts**. Pick `k` via **elbow** / **silhouette**. For **non-convex** clusters or unknown `k`, switch to **DBSCAN**. For **categorical** data, use **k-modes**. For **soft assignments**, use **GMM**.
