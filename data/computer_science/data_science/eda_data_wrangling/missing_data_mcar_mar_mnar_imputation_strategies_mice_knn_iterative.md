### Missing Data (MCAR, MAR, MNAR — imputation strategies, MICE, kNN, iterative)

**When:** every real dataset has missing values. The wrong handling silently biases models. Pick the strategy by **why values are missing** (mechanism) and **how much** is missing.

**Schema (Rubin's typology):**

| Mechanism | Definition | Example |
|---|---|---|
| **MCAR** (Missing Completely At Random) | Missingness independent of all data | Sensor randomly drops readings |
| **MAR** (Missing At Random) | Missingness depends on **observed** data, not the missing value itself | Older users skip income survey question |
| **MNAR** (Missing Not At Random) | Missingness depends on the **missing value itself** | High earners hide income |

> MCAR is rarest; **MAR is the default working assumption**; MNAR is hardest and requires modeling the missingness mechanism explicitly.

#### Detection

| Question | Test / plot |
|---|---|
| How much missing per column? | `df.isna().mean()` |
| Which columns missing together? | `missingno.matrix(df)` |
| Is missingness related to other features? | Logistic: `is_missing(col) ~ other features`; significant → MAR |
| Is missingness related to the value itself? | Untestable directly; MNAR is by definition unobservable |
| Pattern over time? | Plot `is_missing(col)` rate by date |

```python
import missingno as msno
msno.matrix(df)
msno.heatmap(df)         # missingness correlation between columns
```

#### Strategy by mechanism

| Mechanism | Safe strategies |
|---|---|
| **MCAR** | Drop rows; impute with mean/median/mode; impute with model |
| **MAR** | Multiple imputation (MICE), model-based (kNN, iterative); avoid simple mean if features predict missingness |
| **MNAR** | Joint model of data + missingness (Heckman, selection models); domain knowledge |

#### Strategy by missingness fraction

| Fraction missing | Approach |
|---|---|
| < 5% | Listwise deletion fine if MCAR-ish |
| 5–30% | Imputation needed |
| 30–60% | Imputation + add **missingness indicator** column |
| > 60% | Consider dropping the column |

> **Always check**: does adding a "missingness indicator" feature improve the model? If yes, missingness is informative.

#### Imputation methods

| Method | How | When |
|---|---|---|
| **Drop rows** | `df.dropna()` | Tiny missingness, MCAR |
| **Drop column** | `df.drop(col)` | > 60% missing or unhelpful |
| **Mean / median** | Fill with column statistic | Numeric, low missingness, no model bias concern |
| **Mode** | Most frequent | Categorical |
| **Constant sentinel** (`-1`, `"Unknown"`) | Distinct value | Tree models handle natively |
| **Forward-fill / back-fill** | Propagate previous / next observed | Time series |
| **Linear interpolation** | Connect dots | Smoothly-varying time series |
| **kNN imputation** | Use `k` nearest rows by other features | Continuous features, modest missingness |
| **MICE** (Multiple Imputation by Chained Equations) | Iteratively model each col by others | Default for survey / clinical data |
| **Iterative Imputer** (sklearn) | Same as MICE, single imputation | Quick MICE-flavored fix |
| **Missing as feature** | Add `is_missing` indicator + impute | Tree models, MAR / MNAR |
| **Domain-specific** | "Sale price = list price if no discount" | Best when domain knowledge applies |
| **Matrix factorization** | Low-rank reconstruction | Many features, sparse |
| **Deep learning (autoencoder)** | Learn representation; reconstruct missing | Large data, complex patterns |

#### MICE (Multiple Imputation by Chained Equations)

| Step | Action |
|---|---|
| 1 | Initial mean / median impute for all missing |
| 2 | Loop over each column with missing values: |
| 2a | Re-impute that column by regressing it on **all other columns** (linear / logistic / random forest) |
| 2b | Replace its missing values with the new predictions |
| 3 | Repeat until imputed values stabilize (~10 iterations) |
| 4 | (For multiple imputation) repeat with different random seeds → m datasets; pool results via **Rubin's rules** |

```python
from sklearn.experimental import enable_iterative_imputer  # noqa
from sklearn.impute import IterativeImputer

imputer = IterativeImputer(random_state=42, max_iter=10)
df_imputed = imputer.fit_transform(df_numeric)

# True multiple imputation
from miceforest import ImputationKernel
kernel = ImputationKernel(df, save_all_iterations=True, random_state=42)
kernel.mice(5)                                    # 5 iterations
imputed_datasets = [kernel.complete_data(d) for d in range(kernel.dataset_count())]
```

> **Single imputation under-states uncertainty.** For inference, use **multiple imputation (m ≥ 5)** and pool — Rubin's rules combine point estimates and variances.

#### kNN imputation

```python
from sklearn.impute import KNNImputer
imputer = KNNImputer(n_neighbors=5, weights="distance")
df_imputed = imputer.fit_transform(df)
```

| Pro | Con |
|---|---|
| Handles non-linear patterns | Slow on large data |
| Works for both continuous and categorical | Need to scale features first |

#### Time-series-specific

| Pattern | Method |
|---|---|
| Slow-varying signal | Linear / spline interpolation |
| Daily metric with weekly seasonality | Fill with same day-of-week mean |
| Sensor failure (gap) | `ffill` only short gaps; mark longer gaps |
| Long missing block | Drop or model explicitly |

```python
df["metric"].interpolate(method="linear")
df["metric"].fillna(method="ffill", limit=3)      # propagate last value, max 3 steps
```

#### Tree-based models — special

XGBoost / LightGBM / CatBoost handle NaN natively (learn optimal split direction for missing). **Don't impute** before tree models — let them handle it. Compare: with and without imputation, see which CV score is better.

#### Missingness indicator (informative missingness)

```python
df["col_was_missing"] = df["col"].isna().astype(int)
df["col"] = df["col"].fillna(df["col"].median())
```

> If missingness predicts the target, this **indicator** captures it. Common in churn / survey data.

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Mean-impute → model thinks all missing rows are "average" | Add indicator; or use proper MICE |
| Imputing on full data before train/test split | Leakage — fit imputer on train only |
| Treating MNAR as MAR | Bias remains; quantify sensitivity |
| Dropping rows blindly | Survivor bias if missingness correlates with target |
| Imputing categorical with mean | Use mode or learn separately |
| Imputation kills variance — variance becomes too small | Multiple imputation preserves uncertainty |
| Forward-fill across customers | Bleeds one user's data into another |
| Imputed values interpreted as observations | Note imputation in reports |

#### Pipeline integration

```python
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer

preproc = ColumnTransformer([
    ("num", Pipeline([("imp", SimpleImputer(strategy="median"))]), num_cols),
    ("cat", Pipeline([("imp", SimpleImputer(strategy="most_frequent"))]), cat_cols),
])

# Fit on train only, transform test:
preproc.fit(X_train)
X_train_p = preproc.transform(X_train)
X_test_p = preproc.transform(X_test)
```

#### Reporting

For stakeholder reports:

| Disclose | Why |
|---|---|
| % missing per column before imputation | Data quality transparency |
| Imputation method used | Reproducibility |
| Missingness indicator inclusion | Acknowledge informative missingness |
| Sensitivity: results without imputation | Robustness check |

#### Decision tree

```
Mechanism guess?
├─ MCAR & < 5% missing      → Drop rows
├─ MAR & numeric             → MICE / Iterative Imputer
├─ MAR & categorical         → MICE with classification model
├─ MAR & many features       → kNN imputation or matrix factorization
├─ MNAR / informative        → Add missingness indicator + impute + sensitivity analysis
└─ Time series with gaps     → Interpolate (short gaps); model gap explicitly (long)
```

**Rule of thumb:** **MAR is the default working assumption**, **MICE is the default imputation**. **Always add a missingness indicator** when missingness might be informative. **Fit imputers on train only**, never on train+test pooled. **Tree models handle NaN natively** — let them. **Multiple imputation** when uncertainty matters; **single iterative imputation** for quick prediction pipelines.
