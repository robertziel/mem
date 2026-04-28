### Anomaly Detection (Isolation Forest, One-Class SVM, autoencoder, LOF, streaming)

**When:** detect rare, unusual events — fraud, network intrusion, equipment failure, medical anomalies, click bots. Treats anomalies as **rare**, **different-distribution**, or **violations of normal patterns**. The classic ML problem with very few labels.

**Schema (three setups):**

| Setup | Data | Approach |
|---|---|---|
| **Unsupervised** | No labels | Density / boundary / isolation methods |
| **Semi-supervised (one-class)** | Only "normal" labeled | Train boundary around normal; flag outside |
| **Supervised** | Both classes labeled (rare) | Imbalanced classification; SMOTE / focal loss |

> Most production anomaly detection is **unsupervised or semi-supervised** because anomaly labels are rare and the definition shifts.

#### Algorithm catalog

| Method | Type | Best for |
|---|---|---|
| **Isolation Forest** | Unsupervised | Multivariate, many features, fast |
| **Local Outlier Factor (LOF)** | Unsupervised | Local density variations |
| **One-Class SVM** | Semi-supervised | High-dim, complex boundary |
| **DBSCAN noise points** | Unsupervised | Density clusters; noise = anomaly |
| **Autoencoder** | Semi-supervised | Complex patterns, deep features |
| **Mahalanobis distance** | Statistical | Multivariate Normal-ish |
| **Z-score / IQR** | Statistical | Univariate |
| **Statistical process control** | Time series | Control charts (Shewhart, CUSUM) |
| **Twitter AnomalyDetection** | Time series | Seasonal hybrid ESD |
| **Prophet residuals** | Time series | Forecast outliers |
| **HBOS** (histogram-based) | Unsupervised | Fast, simple |
| **DeepLog / LSTM-AE** | Sequence | Log anomalies |

#### Isolation Forest (the practical default)

Random tree splits isolate anomalies in fewer steps than normal points (anomalies are "few and different").

```python
from sklearn.ensemble import IsolationForest

iso = IsolationForest(
    n_estimators=200,
    contamination=0.05,         # expected fraction of anomalies
    max_samples="auto",
    random_state=42,
).fit(X)

labels = iso.predict(X)         # -1 = anomaly, 1 = normal
scores = iso.score_samples(X)   # higher = more normal
```

| Property | Detail |
|---|---|
| Fast | O(n log n) |
| Scales to high dim | Good up to ~100 features |
| `contamination` | Set expected anomaly rate |
| Threshold | `decision_function < 0` = anomaly |

#### Local Outlier Factor (LOF)

Compares **local density** of a point to its neighbors:

```python
from sklearn.neighbors import LocalOutlierFactor

lof = LocalOutlierFactor(n_neighbors=20, contamination=0.05)
labels = lof.fit_predict(X)
scores = -lof.negative_outlier_factor_       # higher = more anomalous
```

| Strength | Weakness |
|---|---|
| Detects local anomalies (clusters of varying density) | Slower; doesn't scale to huge data |
| No global threshold | Sensitive to `n_neighbors` |

#### One-Class SVM

Boundary around "normal" data:

```python
from sklearn.svm import OneClassSVM

ocsvm = OneClassSVM(nu=0.05, kernel="rbf", gamma="scale")
ocsvm.fit(X_normal)
labels = ocsvm.predict(X_test)
```

| Parameter | Detail |
|---|---|
| `nu` | Upper bound on fraction of outliers + lower bound on support vectors |
| `kernel` | `rbf` is default; tune γ |
| Speed | Slow on large data — Isolation Forest is faster default |

#### Autoencoder-based anomaly detection

Train AE to reconstruct normal data; high reconstruction error = anomaly.

```python
import torch
import torch.nn as nn

class AE(nn.Module):
    def __init__(self, dim, hidden=32):
        super().__init__()
        self.encoder = nn.Sequential(nn.Linear(dim, 64), nn.ReLU(), nn.Linear(64, hidden))
        self.decoder = nn.Sequential(nn.Linear(hidden, 64), nn.ReLU(), nn.Linear(64, dim))
    def forward(self, x):
        return self.decoder(self.encoder(x))

# Train on normal data only
ae.train()
for epoch in range(epochs):
    x_hat = ae(x_normal)
    loss = ((x_hat - x_normal) ** 2).mean()
    loss.backward()
    optimizer.step()

# Score
ae.eval()
recon_error = ((ae(x_test) - x_test) ** 2).mean(axis=1)
threshold = np.quantile(recon_error_train, 0.95)
anomalies = recon_error > threshold
```

| Use | Detail |
|---|---|
| Complex non-linear | Yes |
| Sequential (with LSTM AE) | Yes |
| Image (with conv AE) | Yes |
| Tabular (small) | Often Isolation Forest competitive |

#### Statistical methods

##### Mahalanobis distance

`D²(x) = (x − μ)ᵀ Σ⁻¹ (x − μ)`

```python
import numpy as np
from scipy.spatial.distance import mahalanobis

mu = X.mean(axis=0); cov = np.cov(X, rowvar=False); inv_cov = np.linalg.inv(cov)
distances = np.array([mahalanobis(x, mu, inv_cov) for x in X])
threshold = np.sqrt(scipy.stats.chi2.ppf(0.95, df=X.shape[1]))
```

> Assumes Normal distribution. Use **robust covariance (MCD)** when data has outliers in the training set.

##### Robust Mahalanobis (Minimum Covariance Determinant)

```python
from sklearn.covariance import MinCovDet
mcd = MinCovDet().fit(X)
distances = mcd.mahalanobis(X)
```

#### Time-series anomaly detection

| Method | What |
|---|---|
| **Z-score on rolling residuals** | Local univariate |
| **STL residuals + IQR** | Decompose then test |
| **Twitter AnomalyDetection (S-H-ESD)** | Seasonal hybrid extreme studentized deviate |
| **Prophet residuals** | Forecast vs actual |
| **LSTM autoencoder** | Sequence reconstruction error |
| **Matrix Profile (STAMP / SCRIMP)** | Discord — most-anomalous subsequence |
| **CUSUM / Page-Hinkley** | Online change-point detection |
| **Bayesian online change-point detection** | Probabilistic |

```python
# Quick Prophet-residual approach
from prophet import Prophet
m = Prophet().fit(df)
fc = m.predict(df)
residuals = df["y"] - fc["yhat"]
threshold = residuals.std() * 3
df["is_anomaly"] = np.abs(residuals) > threshold
```

#### Streaming / online anomaly detection

| Method | What |
|---|---|
| **HTM** (hierarchical temporal memory) | Numenta's online algorithm |
| **Online Isolation Forest** | Updateable trees |
| **DDM, EDDM, ADWIN** | Concept-drift detection |
| **River library** | Pythonic streaming algorithms |
| **Half-space trees (HST)** | Streaming-friendly |

```python
from river import anomaly
detector = anomaly.HalfSpaceTrees(n_trees=10, height=8)
for x in stream:
    score = detector.score_one(x)
    detector.learn_one(x)
```

#### Evaluation challenges

| Issue | Detail |
|---|---|
| **Few labels** | Hard to tune precisely |
| **Concept of anomaly drifts** | What's anomalous today wasn't yesterday |
| **Class imbalance** | Accuracy meaningless; use precision-recall |
| **Heterogeneous severity** | Different anomalies cost differently |

#### Metrics

| Metric | Use |
|---|---|
| **Precision @ K** | Top-K most anomalous; how many are real? |
| **Recall @ K** | Of all real anomalies, how many in top-K? |
| **AUPRC** | Area under precision-recall (better than AUROC for imbalance) |
| **F1 / F-β** | Combined precision/recall |
| **Time-to-detection** | For streaming |
| **False alarm rate / hour** | Operational |

> Use **AUPRC, not AUROC**, for imbalanced anomaly problems. AUROC over-states performance when positives are rare.

#### Operational considerations

| Concern | Mitigation |
|---|---|
| **Threshold tuning** | Quantile-based on training scores; tune for cost / business |
| **Alert fatigue** | Group / suppress similar alerts |
| **Severity grading** | Anomaly score → severity level |
| **Contextual / segmented detection** | Per-region / per-user thresholds |
| **Feedback loop** | Analysts label → retrain |
| **Explainability** | Why is this flagged? — SHAP, feature contributions |

#### Common patterns

##### Cascade

Cheap detector first → expensive detector for borderline:

```python
def detect(x):
    if iso_score(x) > coarse_threshold:
        return ae_recon_error(x) > fine_threshold
    return False
```

##### Ensemble

Multiple detectors vote:

```python
score = (
    iso.score_samples(X) +
    -lof.negative_outlier_factor_ +
    -ocsvm.score_samples(X)
) / 3
```

#### When NOT to use unsupervised

| Situation | Alternative |
|---|---|
| Have labeled positives + negatives | Supervised classification with class imbalance handling |
| Need explanation per anomaly | Rules / decision trees |
| Single-feature, well-understood | Statistical thresholds suffice |
| Real-time, sub-ms latency | Pre-computed thresholds, no models |

#### Industry use cases

| Domain | Anomaly |
|---|---|
| **Banking / fraud** | Unusual transaction (location, amount, frequency) |
| **Manufacturing** | Sensor reading out of spec |
| **Networking** | DDoS, intrusion patterns |
| **Healthcare** | Vital signs out of range |
| **E-commerce** | Click bots, scraping, fake accounts |
| **Cloud ops** | Latency / error spike |
| **Customer success** | Churn-predicting behavior change |
| **Cyber** | Log anomalies (failed logins, weird API calls) |
| **IoT** | Predictive maintenance |
| **Quality control** | Defective product images |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Using accuracy for evaluation | Use precision / recall / AUPRC |
| Treating "outlier" as "interesting" | Investigate — could be bug or new behavior |
| Single threshold across segments | Per-segment thresholds |
| Same model in train + serve with drift | Re-train periodically; monitor drift |
| Auto-flagging without human review | Alert fatigue; tier severities |
| Many false positives → ignore alerts | Tune threshold; filter known-benign patterns |
| Static threshold over time | Adaptive thresholding (rolling quantiles) |
| Reporting only AUROC | Use AUPRC for imbalance |
| Treating anomalies as iid | Often correlated; group / dedupe |

#### Decision tree

```
Data type?
├─ Tabular, multivariate
│  ├─ < 100 features                → Isolation Forest (default)
│  ├─ Local density patterns        → LOF
│  ├─ Complex non-linear            → Autoencoder
│  └─ Multivariate Normal-ish       → Mahalanobis (robust covariance)
├─ Time series
│  ├─ Univariate, no seasonality    → Z-score on rolling residuals
│  ├─ Seasonal                       → STL residuals / Prophet
│  ├─ Sequential / log              → LSTM AE / matrix profile
│  └─ Online streaming              → CUSUM / Page-Hinkley / HTM
├─ Images                           → CNN AE / VAE; one-class deep
└─ Text / sequences                 → Embedding + density / LSTM AE

Have labels?
├─ Yes (mostly)                     → Supervised + imbalance handling
└─ No / few                         → Unsupervised / semi-supervised
```

#### Tools

| Tool | Strength |
|---|---|
| **scikit-learn** | Isolation Forest, LOF, One-Class SVM |
| **PyOD** | 30+ anomaly detection algorithms |
| **River** | Streaming |
| **Alibi Detect** (Seldon) | Drift + outlier detection for ML |
| **EvidentlyAI** | Drift + monitoring |
| **TSlumb / Twitter AD** | Time series |
| **DeepLog** | Log sequences |
| **Suricata / Zeek** | Network IDS |

**Rule of thumb:** **Isolation Forest is the default unsupervised method** — fast, scalable, multivariate. Use **LOF** for local density patterns, **One-Class SVM** for complex boundaries, **autoencoders** for high-d / non-linear. For **time series**, decompose with STL or Prophet and threshold residuals. **Evaluate with AUPRC**, not AUROC. **Tune threshold by business cost** of false positives vs missed anomalies.
