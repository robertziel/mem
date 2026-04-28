### Time-Series Cross-Validation (rolling, expanding window, walk-forward, no data leakage)

**When:** evaluating any forecasting / time-series model. **Random k-fold leaks future into past** and gives wildly optimistic accuracy. Time-aware splits are mandatory whenever the data has temporal ordering — even if your model "doesn't use time".

**Schema:**

| Method | Train set | Test set | Use |
|---|---|---|---|
| **Hold-out tail** | First 80% | Last 20% | Quickest sanity check |
| **Walk-forward / expanding window** | `[0, t]` | `[t, t+h]`, slide t forward | Default for forecasting |
| **Rolling window** (fixed-size) | `[t−w, t]` | `[t, t+h]` | Concept drift / non-stationarity |
| **Block cross-validation** | k contiguous folds | Each fold once | Many models for robustness |
| **Purged CV with embargo** | Drop overlap region around test | Same | Financial data with autocorrelation |

> **Never shuffle rows in a time-series problem.** It's the single most-common DS bug.

#### Walk-forward / expanding window

```
Fold 1:  Train [0...100]   → Test [100...110]
Fold 2:  Train [0...110]   → Test [110...120]
Fold 3:  Train [0...120]   → Test [120...130]
...
```

```python
from sklearn.model_selection import TimeSeriesSplit

tscv = TimeSeriesSplit(n_splits=5, test_size=14)   # 14-day test fold
for train_idx, test_idx in tscv.split(X):
    X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
    y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    score = mae(y_test, preds)
```

> **Train set grows** in each fold ("expanding"). Use when you want to use **all available history** for each forecast.

#### Rolling window (fixed-size)

```
Fold 1:  Train [0...100]   → Test [100...110]
Fold 2:  Train [10...110]  → Test [110...120]
Fold 3:  Train [20...120]  → Test [120...130]
...
```

| Use rolling instead of expanding | When |
|---|---|
| Concept drift / non-stationarity | Old data may hurt |
| Limited compute | Train set bounded |
| Want to test model adaptability | Each fold has same training size |

#### Prophet's `cross_validation`

```python
from prophet.diagnostics import cross_validation, performance_metrics

cv = cross_validation(model,
                      initial="730 days",       # min training span
                      period="90 days",         # how often to roll forward
                      horizon="90 days")        # forecast horizon
metrics = performance_metrics(cv)
```

> Initial = min train length; period = step size between cutoff dates; horizon = how far ahead to forecast.

#### Cross-validation pitfalls in time series

| Mistake | Effect |
|---|---|
| **Random k-fold** | Future leaks into past via shuffling — overoptimistic by 5–50% |
| **Standardizing globally** before split | Test mean/std leaks into train scaling |
| **Lag features computed on full series** | Test lag values come from after-test points |
| **Imputation on full series** | Test info leaks into imputed train values |
| **Group features (e.g., user encoding) computed on full data** | Same as above |
| **Forgetting the gap (embargo)** for autocorrelated data | Adjacent train / test rows highly correlated |
| **Fitting any preprocessing before split** | Anything that touches the test rows leaks |

> Build all preprocessing **inside a pipeline** that's fit per-fold.

#### Lag features and lookahead

When you create features like `y_{t−1}`, `y_{t−7}`, rolling means, etc., these must use **only past values** at every row:

```python
# WRONG — uses future values via window centering
df["rolling_mean_7"] = df["y"].rolling(7, center=True).mean()

# RIGHT — uses past 7 values only
df["rolling_mean_7"] = df["y"].shift(1).rolling(7).mean()
```

> Always **shift by 1** when creating lag features, so the row for time `t` doesn't include `y_t`.

#### Multi-step forecasting

| Strategy | How |
|---|---|
| **Recursive (iterative)** | Forecast 1 step; feed it back; forecast next step | Errors compound |
| **Direct** | Train a separate model for each horizon `h` | More models, no cascade |
| **Multi-output** | Single model outputs all horizons | Captures correlation |
| **Encoder-decoder (seq2seq)** | Neural — encode history, decode horizon | Deep learning |

> CV must match: if you'll do recursive forecasts, CV should evaluate recursive forecasts.

#### Embargo / purging (financial / autocorrelated)

| Concept | What |
|---|---|
| **Purge** | Remove training rows whose target window overlaps test labels |
| **Embargo** | Remove training rows just **before** test (give a gap) |
| **Combinatorial purged CV** (CPCV — López de Prado) | Multiple non-contiguous test blocks with full purge |

> Standard in quantitative finance where rolling-window features create train-test contamination.

#### Block cross-validation

| Variant | When |
|---|---|
| **Contiguous blocks** | Robustness across regimes |
| **Sliding origin** | Walk-forward variant |
| **Block bootstrap** | Resampling for SE estimates |

#### Choosing test horizon

| Goal | Horizon |
|---|---|
| Daily forecast | 1–14 days |
| Weekly business KPI | 4–13 weeks |
| Quarterly planning | 1–4 quarters |
| Match production usage | Whatever you'll actually forecast |

> If production forecasts 30 days ahead, **CV must evaluate 30-day-ahead error**, not 1-day-ahead.

#### Number of folds

| Folds | Trade-off |
|---|---|
| 1 (hold-out) | Fastest, single estimate, high variance |
| 3–5 | Practical default |
| 10+ | Lower variance, slower |
| All-but-one (rolling) | Tightest measurement, expensive |

> Pair with **forecast horizon profile** (error vs h), not just average across folds.

#### Cross-validation for non-time-series with leakage risk

Even non-explicit time series can leak if there's:

| Hidden leak | Example |
|---|---|
| Implicit time order | Customer interactions (ordered by signup time) |
| Group-level future info | Labels updated retroactively |
| Train-test entity overlap | Same user in train and test of different folds |

> Use **GroupKFold** by user / entity, or explicit time split.

#### Reporting CV results

| Report | Why |
|---|---|
| Mean + std across folds | Variability |
| Per-fold breakdown | Identifies bad folds |
| Per-horizon error | Where the model degrades |
| Comparison to baseline | Is your model better than seasonal-naive? |
| Coverage of prediction intervals | Calibration check |

```python
def report_cv(metrics):
    print(f"MAE: {metrics['MAE'].mean():.3f} ± {metrics['MAE'].std():.3f}")
    print(f"Worst fold: {metrics['MAE'].max():.3f}")
    print(f"vs seasonal-naive baseline: {metrics['MAE'].mean() / baseline_mae:.2%}")
```

#### Time-series CV for ML pipelines

```python
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
from sklearn.model_selection import TimeSeriesSplit, cross_val_score

pipeline = Pipeline([
    ("scaler", StandardScaler()),                  # fit per-fold, no leakage
    ("model", Ridge()),
])

scores = cross_val_score(
    pipeline, X, y,
    cv=TimeSeriesSplit(n_splits=5),
    scoring="neg_mean_absolute_error",
)
```

> Wrap **all preprocessing** in a `Pipeline` so it fits independently per fold.

#### Visualization

Plot **predicted vs actual** for each fold along the time axis:

```python
import matplotlib.pyplot as plt
fig, axes = plt.subplots(n_splits, 1, figsize=(10, 2*n_splits))
for i, (train_idx, test_idx) in enumerate(tscv.split(X)):
    ax = axes[i]
    ax.plot(X.index[train_idx], y.iloc[train_idx], label="train", color="blue")
    ax.plot(X.index[test_idx],  y.iloc[test_idx],  label="actual", color="black")
    ax.plot(X.index[test_idx],  preds[i],          label="pred", color="red")
plt.legend()
```

> Visual sanity check beats numeric metrics for catching weird folds.

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Using `KFold` instead of `TimeSeriesSplit` | Always `TimeSeriesSplit` for time-ordered data |
| Standardizing on full data before split | Use a Pipeline; scaler fits per fold |
| Reporting only mean error across folds | Show std + per-fold breakdown |
| One CV with one horizon | Plot error vs horizon for the full picture |
| Assuming model that's good at h=1 is good at h=30 | Validate at production horizon |
| Embedding categorical features fit on whole data | Fit per fold to avoid leakage |
| Tuning hyperparameters on the same CV folds you report | Use **nested CV**: outer for evaluation, inner for tuning |
| Forgetting to shift lag features | `df["lag1"] = df["y"].shift(1)` not `df["y"]` |

#### Nested CV (when tuning)

| Loop | Purpose |
|---|---|
| Outer (e.g., 5-fold time series) | Estimate generalization |
| Inner (e.g., 3-fold time series within each outer train) | Tune hyperparameters |

> Without nesting, hyperparameter tuning leaks back into evaluation — over-optimistic.

**Rule of thumb:** **never random-shuffle time series**. Use **`TimeSeriesSplit`** (expanding window) by default; switch to **rolling window** if you suspect drift. Wrap all preprocessing in a **Pipeline** so it fits per fold. Always **lag-shift before rolling features**. Match **CV horizon to production usage**. Compare against **seasonal-naive baseline**. For autocorrelated / financial data, add **embargo + purging**.
