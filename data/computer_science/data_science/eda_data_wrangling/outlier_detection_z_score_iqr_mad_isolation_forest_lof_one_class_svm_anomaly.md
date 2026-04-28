### Outlier Detection (z-score, IQR, MAD, Isolation Forest, LOF, One-Class SVM)

**When:** identify unusual observations — fraud, sensor failures, data-entry errors, edge users, true rare events. Outliers can be **bugs to remove** or **the most interesting subset of users**. Always investigate before dropping.

**Schema:**

| Type | Definition |
|---|---|
| **Univariate outlier** | Extreme value in one feature |
| **Multivariate outlier** | Unusual combination of features (each feature individually normal) |
| **Contextual outlier** | Unusual given context (cold day in summer) |
| **Collective outlier** | Group of points anomalous together |

#### Univariate methods

| Method | Rule | Robust to outliers? |
|---|---|---|
| **Z-score** | `|z| = |x − μ| / σ > 3` | ✗ (mean and std affected by outliers) |
| **Modified z-score (MAD)** | `|0.6745 · (x − median) / MAD| > 3.5` | ✓ |
| **IQR** | `x < Q1 − 1.5·IQR` or `x > Q3 + 1.5·IQR` | ✓ |
| **Percentile** | Below 0.5% or above 99.5% | ✓ |
| **Tukey fences (extreme)** | 3·IQR instead of 1.5·IQR | ✓ |
| **Box-plot whiskers** | Visual IQR rule | ✓ |

```python
import numpy as np

def iqr_outliers(x, factor=1.5):
    q1, q3 = np.percentile(x, [25, 75])
    iqr = q3 - q1
    lo, hi = q1 - factor * iqr, q3 + factor * iqr
    return (x < lo) | (x > hi)

def mad_outliers(x, threshold=3.5):
    median = np.median(x)
    mad = np.median(np.abs(x - median))
    z = 0.6745 * (x - median) / (mad + 1e-9)
    return np.abs(z) > threshold
```

> **MAD-based detection is robust** — outliers don't inflate MAD the way they inflate σ.

#### Multivariate methods

| Method | How |
|---|---|
| **Mahalanobis distance** | `D² = (x − μ)ᵀ Σ⁻¹ (x − μ)` — distance accounting for covariance; threshold via χ² |
| **Isolation Forest** | Random tree splits; outliers isolated quickly (short path length) |
| **LOF** (Local Outlier Factor) | Local density compared to neighbors |
| **One-Class SVM** | Boundary around normal data; everything outside = outlier |
| **DBSCAN** noise points | Density-based clustering; "noise" = outliers |
| **Autoencoder reconstruction** | Train AE on normal data; high reconstruction error = anomaly |
| **Robust covariance (MCD)** | Minimum Covariance Determinant for Mahalanobis with breakdown point ~50% |

#### Isolation Forest

```python
from sklearn.ensemble import IsolationForest
iso = IsolationForest(contamination=0.05, random_state=42).fit(X)
labels = iso.predict(X)            # -1 = outlier, 1 = inlier
scores = iso.score_samples(X)      # higher = more normal
```

| Strength | Weakness |
|---|---|
| Fast on large data | Sensitive to `contamination` parameter |
| No assumption on distribution | Random — may miss structure |
| Handles high dimensions | Less effective if many irrelevant features |

#### Local Outlier Factor (LOF)

```python
from sklearn.neighbors import LocalOutlierFactor
lof = LocalOutlierFactor(n_neighbors=20, contamination=0.05)
labels = lof.fit_predict(X)
scores = -lof.negative_outlier_factor_           # higher = more anomalous
```

| Property | Detail |
|---|---|
| **Local** | Compares density to k-nearest neighbors, not global |
| Best for | Clusters of varying density |
| `n_neighbors` | Default 20; tune by data |

#### One-Class SVM

```python
from sklearn.svm import OneClassSVM
ocsvm = OneClassSVM(nu=0.05, kernel="rbf", gamma="scale")
labels = ocsvm.fit_predict(X)
```

| Property | Detail |
|---|---|
| `nu` | Upper bound on fraction of outliers + lower bound on support vectors |
| Kernel | RBF works well; tune γ |
| Slow on large data | Use Isolation Forest instead |

#### Method picker

| Situation | Use |
|---|---|
| Single feature, robust check | **MAD** or **IQR** |
| Single feature, normal-ish | Z-score |
| Multivariate, fast on big data | **Isolation Forest** |
| Multivariate, varying density | **LOF** |
| Multivariate, complex boundary | One-Class SVM |
| Time series | Twitter AnomalyDetection / STL residuals / Prophet residuals |
| Categorical / discrete | Frequency-based; rule-based |
| Streaming | Online algorithms (HTM, online Isolation Forest) |
| Highly imbalanced supervised | Frame as classification, not anomaly detection |

#### Time-series anomaly detection

| Method | When |
|---|---|
| **Z-score on rolling residuals** | Local outliers |
| **STL residual** + IQR | Decompose then test residuals |
| **Twitter AnomalyDetection** | Seasonal hybrid ESD |
| **Prophet residuals** | Forecast vs actual gap |
| **Matrix Profile** (STAMP) | Discord (most-anomalous subsequence) |
| **LSTM autoencoder** | Complex non-linear |

#### Domain-specific outliers

| Domain | What's an outlier |
|---|---|
| Web traffic | Bots (10× requests / sec) |
| Banking | Sudden large transaction in unfamiliar location |
| Manufacturing | Sensor reading outside spec |
| Healthcare | Vital sign outside range |
| Finance | Sub-second price spike |
| User behavior | Power user (1000× engagement) |

> Different domains call for **different thresholds** and methods. "Outliers" in product metrics often = your most valuable users.

#### What to do once detected

| Strategy | When |
|---|---|
| **Investigate** | Always first — root-cause |
| **Drop** | Confirmed bug / data error |
| **Cap (winsorize)** | Robust analysis; preserve sample size |
| **Log transform** | Skewed data; preserves order, compresses tails |
| **Separate model** | Outliers behave fundamentally differently |
| **Robust loss** (Huber, MAE) | Train models that down-weight tails |
| **Keep + flag** | They might be the signal |

```python
# Winsorize at 1st and 99th percentile
from scipy.stats.mstats import winsorize
x_capped = winsorize(x, limits=[0.01, 0.01])
```

#### Outliers in features vs labels vs both

| Where | Risk |
|---|---|
| **Features only** | Most ML models robust if outliers are rare |
| **Labels (regression target)** | Drag training; use Huber / MAE loss or clean labels |
| **Both** | High-leverage points distort fit; investigate carefully |

#### Diagnostic plots

| Plot | What |
|---|---|
| Box plot per feature | Quick univariate |
| Histogram with log y-axis | See heavy tails |
| Scatter matrix | Multivariate clusters and outliers |
| QQ plot vs Normal | Heavy tails / skew |
| Mahalanobis distance histogram | Multivariate threshold |
| t-SNE / UMAP scatter | Visual separation in 2D |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Z-score with outliers in training data | Use MAD or IQR instead |
| Same threshold across columns | Tune per feature distribution |
| Auto-dropping outliers | Investigate first — they may be the signal |
| Outlier removal that biases the sample | Document; report sensitivity |
| One-Class SVM on huge data | Use Isolation Forest or DBSCAN |
| Single method only | Combine 2–3 (e.g., IQR + IsolationForest) |
| Different criteria train vs test | Persist outlier detector across splits |
| Removing outliers after seeing the target | Leakage — outlier removal should be unsupervised |

#### Anomaly detection vs outlier detection (distinct concepts)

| Term | Connotation |
|---|---|
| **Outlier** | Point that's just unusual; could be valid extreme |
| **Anomaly** | Point that's wrong / interesting / actionable (fraud, failure) |

> **Anomaly detection** is the broader product context (alerting, monitoring); **outlier detection** is the statistical / ML technique.

#### Production anomaly-detection systems

| System | Use |
|---|---|
| Netflix Atlas / Mantis | Real-time alerting |
| Twitter AnomalyDetection | Time-series anomalies |
| Facebook Prophet residuals | Forecasting + anomalies |
| AWS Lookout for Metrics | Managed anomaly detection |
| Azure Anomaly Detector | API service |

**Rule of thumb:** **investigate before deleting**. Use **MAD** or **IQR** for univariate (more robust than z-score). For multivariate, default to **Isolation Forest**. Time series → **STL residual + IQR** or **Prophet residuals**. Outliers in your business data are often your **most valuable users / fraudsters / failures** — quantify, segment, and decide whether to drop, cap, or model separately.
