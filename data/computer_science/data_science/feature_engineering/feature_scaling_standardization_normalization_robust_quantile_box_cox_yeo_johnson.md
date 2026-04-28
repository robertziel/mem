### Feature Scaling (standardization, normalization, robust, quantile, Box-Cox, Yeo-Johnson)

**When:** preprocessing numeric features for **distance-based** (kNN, SVM, k-means, PCA) or **gradient-based** (logistic regression, neural networks) models. Without scaling, the feature with the largest magnitude dominates. Tree-based models don't need it.

**Schema:**

| Method | Formula | Output range | Best for |
|---|---|---|---|
| **Standardization (z-score)** | `(x − μ) / σ` | Mean 0, std 1 | Default for ML; assumes Normal-ish |
| **Min-max normalization** | `(x − min) / (max − min)` | [0, 1] | Image / pixel data; bounded outputs |
| **Max-abs scaling** | `x / max(|x|)` | [−1, 1] | Sparse data (preserves zeros) |
| **Robust scaling** | `(x − median) / IQR` | Median 0 | Outlier-heavy data |
| **Quantile transform** | Map to uniform / Normal via empirical CDF | Uniform [0, 1] or N(0, 1) | Heavy-tailed / skewed |
| **Power transform (Box-Cox)** | `(x^λ − 1) / λ` | Closer to Normal | Strictly positive, skewed |
| **Power transform (Yeo-Johnson)** | Generalized Box-Cox | Closer to Normal | Any sign, skewed |
| **Log transform** | `log(1 + x)` | Compresses tails | Positive, right-skewed |
| **L2 normalization** | `x / ‖x‖₂` | Unit norm per row | Cosine similarity / NN attention inputs |

#### Standardization (the default)

```python
from sklearn.preprocessing import StandardScaler
scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s = scaler.transform(X_test)         # use train's μ, σ
```

| Used by | Reason |
|---|---|
| Logistic regression | Coefficients comparable; gradient stable |
| SVM | Distance-sensitive |
| Neural networks | Initialization works at unit scale |
| PCA | Variance contributions comparable |
| kNN, k-means | Distance-sensitive |
| Linear regression with regularization | L1 / L2 penalize small-scale features less |

> **Always fit scaler on train, transform test.** Most-violated rule.

#### Min-max normalization

```python
from sklearn.preprocessing import MinMaxScaler
mm = MinMaxScaler(feature_range=(0, 1))
X_s = mm.fit_transform(X)
```

| Use when | Avoid when |
|---|---|
| Output should be bounded (image pixels, neural network inputs) | Outliers dominate (one outlier sets the max) |
| Specific algorithms require [0, 1] | Heavy-tailed data |

#### Robust scaling

```python
from sklearn.preprocessing import RobustScaler
rs = RobustScaler()       # uses median and IQR
X_s = rs.fit_transform(X)
```

> When you suspect outliers but can't / don't want to remove them — **robust scaling** uses median and IQR instead of mean and std.

#### Quantile transform

```python
from sklearn.preprocessing import QuantileTransformer
qt = QuantileTransformer(output_distribution="normal", n_quantiles=1000)
X_s = qt.fit_transform(X)
```

| Use case | Detail |
|---|---|
| Heavy-tailed data | Squashes long tails into Normal range |
| Highly skewed | Reshapes distribution explicitly |
| Robust to outliers | Outliers compressed at tails |
| Loses linear structure | Non-linear monotonic transform |

> Maps each feature to **uniform [0, 1]** or **Normal N(0, 1)** using the empirical CDF. Loses the original scale but kills skew completely.

#### Power transforms (Box-Cox / Yeo-Johnson)

```python
from sklearn.preprocessing import PowerTransformer
# Yeo-Johnson handles any sign; Box-Cox needs strictly positive
pt = PowerTransformer(method="yeo-johnson", standardize=True)
X_s = pt.fit_transform(X)
```

**Box-Cox:** `(x^λ − 1) / λ` for `λ ≠ 0`, `log(x)` for `λ = 0`. Estimate `λ` by MLE for normality.

**Yeo-Johnson:** generalized to handle negative `x` too.

> Use when distribution is **strongly skewed** and you want **near-Normal** features for linear models / NNs.

#### Log transform (the simplest power)

```python
df["log_revenue"] = np.log1p(df["revenue"])      # log(1 + x), handles zero
```

| Use when | Why |
|---|---|
| Right-skewed positive (revenue, response times, prices) | Compresses tails |
| Multiplicative phenomena | Makes them additive |
| Feature spans many orders of magnitude | Linearizes |

> **`log1p`** = `log(1 + x)`. Use when `x ≥ 0` and may be 0.

#### Per-row L2 normalization

```python
from sklearn.preprocessing import Normalizer
norm = Normalizer(norm="l2")
X_s = norm.fit_transform(X)
```

> Each **row** is scaled to unit L2 norm. Used for **cosine similarity** preprocessing, NN attention features.

#### When NOT to scale

| Model | Scaling needed? |
|---|---|
| Decision tree | No |
| Random forest | No |
| XGBoost / LightGBM / CatBoost | No |
| Linear regression (no reg) | Optional, but interpretation easier |
| **Logistic regression** | **Yes** (especially with reg) |
| **kNN / k-means / DBSCAN** | **Yes** (distance) |
| **SVM** | **Yes** |
| **PCA** | **Yes** (variance) |
| **Neural networks** | **Yes** |
| Naive Bayes | No (uses likelihoods) |

#### Scaling sparse data

| Issue | Fix |
|---|---|
| `StandardScaler` destroys sparsity (subtracts mean → no zeros) | Use `with_mean=False` or `MaxAbsScaler` |
| Hashing trick output | `MaxAbsScaler` preserves zeros |
| TF-IDF | Often already L2-normalized by `TfidfVectorizer` |

```python
from sklearn.preprocessing import MaxAbsScaler
mas = MaxAbsScaler()    # preserves sparsity
```

#### Scaling categorical-encoded features

| Encoded type | Need scaling? |
|---|---|
| One-hot | Usually no (already 0/1) |
| Target / frequency encoded | Yes if mixing with continuous in linear model |
| Ordinal | Depends — yes for linear, no for tree |

#### Pipeline integration

```python
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder

preproc = ColumnTransformer([
    ("num", StandardScaler(), numeric_cols),
    ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_cols),
])
model = Pipeline([("pre", preproc), ("clf", LogisticRegression())])
model.fit(X_train, y_train)        # scaler fit on train only — leakage-safe
```

#### Cross-validation interaction

| Done correctly | Done wrong |
|---|---|
| Wrap in `Pipeline`; CV refits scaler per fold | Fit scaler once on all data, then split |
| Robust to leakage | Train mean/std contaminate test fold |

> **Never** call `scaler.fit_transform(X)` before splitting.

#### Comparing scalers visually

```python
import matplotlib.pyplot as plt
import numpy as np

fig, axes = plt.subplots(1, 5, figsize=(15, 3))
for ax, scaler, title in zip(axes, [None, StandardScaler(), MinMaxScaler(), RobustScaler(), QuantileTransformer(output_distribution="normal")],
                              ["raw", "z-score", "min-max", "robust", "quantile→normal"]):
    if scaler is None:
        x_s = X[:, 0]
    else:
        x_s = scaler.fit_transform(X[:, [0]]).flatten()
    ax.hist(x_s, bins=50)
    ax.set_title(title)
```

> Plot per-feature distributions before and after each scaler — pick by domain understanding + visual.

#### Decision tree

```
Distribution shape?
├─ Roughly Gaussian, no outliers     → StandardScaler
├─ Bounded, want [0, 1]              → MinMaxScaler
├─ Outlier-heavy                     → RobustScaler
├─ Heavy-tailed / skewed             → QuantileTransformer (output="normal")
├─ Strictly positive, right-skewed   → log1p or Box-Cox
├─ Any sign, skewed                  → Yeo-Johnson
├─ Sparse (TF-IDF, hashed)           → MaxAbsScaler
└─ Distance-based + cosine            → Normalizer (L2)
```

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Fitting scaler on full data | Fit on train, transform test |
| Not scaling for linear / NN / SVM | Always scale these |
| Scaling for tree models | No effect; wastes compute |
| Scaling on outlier-heavy data with StandardScaler | Use RobustScaler or QuantileTransformer |
| MinMax with outliers | One outlier sets max; everything else compressed near 0 |
| Forgetting to inverse-transform predictions | If you log-transformed `y`, `expm1` predictions back |
| Different scalers across folds | Use `Pipeline` for consistency |
| Scaling target with `y_train` mean / std on regression | Same trap — fit on train only |

#### Target scaling for regression

If target spans many orders of magnitude:

```python
import numpy as np
y_log = np.log1p(y)             # train on log
preds = np.expm1(model.predict(X_test))   # transform back
```

| When | Detail |
|---|---|
| Right-skewed target (revenue, counts) | Log-transform |
| Heavy-tailed | Quantile transform |
| Bounded | Logistic / sigmoid output |

#### Calibration after scaling

After fitting on scaled features, predictions on properly-scaled test data are correct. **Don't** apply scaler again on output (unless you scaled the target too).

**Rule of thumb:** **standardize for distance / gradient models** (linear, SVM, kNN, k-means, NN). **Don't scale for trees**. **Robust / quantile** when outliers / skew present. **Always fit on train only**, wrap in `Pipeline` so CV refits per fold. For skewed positive features, **`log1p`** is the simplest fix; for any-sign skew, **Yeo-Johnson**.
