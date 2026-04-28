### Binning / Discretization (equal-width, equal-frequency, decision-tree, target, quantile)

**When:** convert **continuous** features into **discrete buckets** — capture non-linearity in linear models, reduce sensitivity to outliers, create stable signals from noisy floats, or build interpretable rules. Common in credit-scoring, marketing, and any pipeline where logistic regression / GAMs are the model.

**Schema:**

| Method | Bin boundaries | Best for |
|---|---|---|
| **Equal-width** | Range divided into `K` equal-width intervals | Uniform distributions; visualization |
| **Equal-frequency (quantile)** | Each bin holds ~`n/K` samples | Skewed data; baseline |
| **K-means** | Cluster centers as bin reps | Multimodal data |
| **Decision-tree** | Splits chosen by target relationship | Supervised binning |
| **Optimal binning** (information value, χ²) | Maximize predictive signal | Credit scoring (WoE) |
| **Custom / domain** | Manually chosen | When business knows the boundaries |

#### Equal-width

```python
import pandas as pd

df["age_bin"] = pd.cut(df["age"], bins=5, labels=False)
# Or specify explicit bin edges
df["income_bin"] = pd.cut(df["income"],
                          bins=[0, 30_000, 60_000, 100_000, 200_000, np.inf],
                          labels=["low", "mid", "high", "vhigh", "ultra"])
```

| Pro | Con |
|---|---|
| Simple, interpretable | Empty bins on skewed data |
| Bins easy to explain | Outliers stretch range |

#### Equal-frequency (quantile)

```python
df["income_q"] = pd.qcut(df["income"], q=10, labels=False)        # deciles
df["price_quartile"] = pd.qcut(df["price"], q=4, labels=["Q1","Q2","Q3","Q4"])
```

> Each bin has ~equal sample count. **Robust to skew**. Bin boundaries are quantiles.

#### Sklearn KBinsDiscretizer

```python
from sklearn.preprocessing import KBinsDiscretizer

# Equal-frequency, integer-encoded
kbins = KBinsDiscretizer(n_bins=10, strategy="quantile", encode="ordinal")
X_binned = kbins.fit_transform(X)

# Equal-width with one-hot
kbins = KBinsDiscretizer(n_bins=5, strategy="uniform", encode="onehot-dense")
```

| `strategy` | Effect |
|---|---|
| `"uniform"` | Equal-width |
| `"quantile"` | Equal-frequency |
| `"kmeans"` | K-means cluster centers as bin reps |

| `encode` | Output |
|---|---|
| `"ordinal"` | Integer per bin |
| `"onehot"` | Sparse one-hot |
| `"onehot-dense"` | Dense one-hot |

#### Decision-tree binning (supervised)

Use a shallow decision tree on `feature → target` to find optimal cut points:

```python
from sklearn.tree import DecisionTreeRegressor
import numpy as np

def tree_binning(x, y, max_leaf_nodes=10):
    tree = DecisionTreeRegressor(max_leaf_nodes=max_leaf_nodes)
    tree.fit(x.reshape(-1, 1), y)
    # Extract thresholds at internal nodes
    thresholds = tree.tree_.threshold
    leaves = tree.tree_.children_left == -1
    cut_points = sorted(thresholds[~leaves])
    bins = np.digitize(x, cut_points)
    return bins, cut_points
```

> Captures non-linear / non-monotonic relationships with the target. Risk: overfitting if `max_leaf_nodes` too high.

#### Optimal binning for credit / churn (Weight of Evidence + IV)

For binary target, build bins to maximize **Information Value**:

| Quantity | Formula |
|---|---|
| WoE per bin `i` | `log((Bᵢ / B_total) / (Gᵢ / G_total))` (G = good, B = bad) |
| IV per bin | `(Bᵢ / B_total − Gᵢ / G_total) · WoE_i` |
| Total IV | `Σ IV_i` |

| IV | Strength |
|---|---|
| < 0.02 | Useless |
| 0.02–0.1 | Weak |
| 0.1–0.3 | Medium |
| 0.3–0.5 | Strong |
| > 0.5 | Suspicious / likely leakage |

```python
from optbinning import OptimalBinning
optb = OptimalBinning(name="age", dtype="numerical", solver="cp")
optb.fit(df["age"].values, df["default"].values)
print(optb.binning_table.build())   # bins, WoE, IV
df["age_woe"] = optb.transform(df["age"], metric="woe")
```

> **OptBinning** library is the standard. Used heavily in credit risk.

#### Why bin?

| Reason | Detail |
|---|---|
| Non-linear effect in linear model | Each bin gets its own coefficient |
| Robustness to outliers | Outlier ends up in extreme bin |
| Interpretability | "Customers age 35–45 default at X%" |
| Capture interactions via cross-bins | bin × bin one-hot |
| Sparse but predictive | Some bins are very predictive; others zero |

#### Why NOT bin

| Concern | Detail |
|---|---|
| Loss of information | Continuous → discrete loses ordering subtleties |
| Boundary artifacts | A customer at 34.99 vs 35.01 is treated very differently |
| Tree models don't need it | They find optimal splits already |
| Increases dimensionality (one-hot) | More features = more complexity |
| Not differentiable | Can't backprop through binning |

> **Trees and gradient boosting don't need binning** — they bin internally as optimal-split decisions. Don't pre-bin for them.

#### Cross-feature binning (interactions)

```python
df["age_bin_x_region"] = df["age_bin"].astype(str) + "_" + df["region"]
```

> Manually create cross-bins for known-interacting features. Often very predictive in linear models.

#### Number of bins (`K`)

| Heuristic | K |
|---|---|
| Sturges' rule | `K = ⌈log₂(n) + 1⌉` |
| Square root | `K = ⌈√n⌉` |
| Freedman-Diaconis | `bin_width = 2·IQR / n^(1/3)` |
| Domain-driven | Pre-specified (e.g., age groups: 0–18, 18–35, 35–50, 50–65, 65+) |

> For ML, **5–10 bins** is typical. More bins → finer signal but more dimensionality and overfit risk.

#### Cyclical / circular binning

For features with **wrap-around** (hour-of-day, day-of-week, day-of-year):

```python
import numpy as np
df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
df["dow_sin"] = np.sin(2 * np.pi * df["dow"] / 7)
df["dow_cos"] = np.cos(2 * np.pi * df["dow"] / 7)
```

> Sin/cos encoding preserves the **circular** distance (hour 23 next to hour 0). Plain integer encoding doesn't.

#### Decision-time guidance

```
Linear / logistic regression?
├─ Suspect non-linearity         → Quantile / decision-tree binning
├─ Want interpretability         → WoE binning (credit scoring)
└─ Heavy outliers                → Quantile binning
Tree-based model (RF/GBDT)?
└─ Don't pre-bin                  → Let tree find optimal splits
Neural network?
├─ Cyclical feature              → Sin/cos
├─ Numeric with non-linear effect → Either feed raw or use embeddings on bins
└─ Other                          → Usually no binning
```

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Binning before splitting | Bin boundaries leak — fit binner on train only |
| Equal-width on skewed data | Empty / huge bins; use quantile |
| Too many bins on small data | Each bin too sparse to be reliable |
| Binning then one-hot **AND** also keeping continuous | Multicollinearity; pick one |
| Treating binned ordinal output as nominal | Loses order information |
| Binning a feature with strong linear effect | Loses signal — keep it continuous |
| Assuming tree models benefit from pre-binning | They don't; just adds noise |
| Cyclical features as integers | Hour 23 and hour 0 should be close — use sin/cos |

#### Pipeline integration

```python
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import KBinsDiscretizer, StandardScaler

preproc = ColumnTransformer([
    ("bin", KBinsDiscretizer(n_bins=10, strategy="quantile", encode="onehot-dense"), bin_cols),
    ("num", StandardScaler(), num_cols),
])
```

> Wrap in `Pipeline` so binner refits per fold during CV.

#### Workflow

| Step | Action |
|---|---|
| 1 | Plot target vs feature (scatter / lowess) — identify non-linearity |
| 2 | Try equal-frequency (quantile) binning baseline |
| 3 | Compare CV score with vs without binning |
| 4 | If improvement, try decision-tree / WoE binning for finer cuts |
| 5 | Check stability of bin boundaries across CV folds |

**Rule of thumb:** **bin only when it adds signal beyond raw / scaled feature**. Default to **quantile (equal-frequency)** binning. **Don't pre-bin for tree models** — they find optimal splits internally. **Cyclical features** need **sin/cos** encoding, not integer bins. For credit / churn, **WoE binning** + Information Value is standard. Always **fit binner on train only**, inside a `Pipeline`.
