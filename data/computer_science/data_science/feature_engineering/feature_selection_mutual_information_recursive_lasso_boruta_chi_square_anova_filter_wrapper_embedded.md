### Feature Selection (mutual information, RFE, Lasso, Boruta, chi-square, ANOVA, filter / wrapper / embedded)

**When:** reduce model complexity, prevent overfitting, improve interpretability, speed up inference. Especially valuable when features ≫ samples or when many features are noise. **Often less impactful than feature engineering** — focus on creating signal first, removing noise second.

**Schema (three categories):**

| Type | What | Speed | Quality |
|---|---|---|---|
| **Filter** | Score features by univariate stat (correlation, chi², MI) | Fast | Misses interactions |
| **Wrapper** | Train models with feature subsets (RFE, forward / backward) | Slow | Best with the chosen model |
| **Embedded** | Selection happens during model training (Lasso, tree feature importance) | Medium | Tied to specific model |

#### Filter methods

| Method | Use for | Sklearn |
|---|---|---|
| **Pearson / Spearman correlation** | Linear / monotonic | `df.corr()` |
| **Mutual information** | Any non-linear dependency | `mutual_info_classif`, `mutual_info_regression` |
| **Chi-square** | Categorical features vs categorical target | `chi2` |
| **ANOVA F-test** | Continuous features vs categorical target | `f_classif` |
| **F-regression** | Continuous features vs continuous target | `f_regression` |
| **Variance threshold** | Drop near-constant features | `VarianceThreshold` |

```python
from sklearn.feature_selection import SelectKBest, mutual_info_classif

selector = SelectKBest(score_func=mutual_info_classif, k=20)
X_train_sel = selector.fit_transform(X_train, y_train)
X_test_sel = selector.transform(X_test)
selected_features = X.columns[selector.get_support()]
```

> Filter methods are **fast** but **don't account for interactions** — feature pairs that together predict but individually look weak get dropped.

#### Mutual information

`I(X; Y) = ∑∑ p(x, y) log(p(x, y) / (p(x) p(y)))`

| Property | Detail |
|---|---|
| Captures non-linear dependence | Unlike Pearson |
| Always ≥ 0 | 0 = independence |
| Works for discrete and continuous | sklearn handles via kNN estimation |
| Slower than correlation | But still O(n) |

```python
from sklearn.feature_selection import mutual_info_classif
mi = mutual_info_classif(X, y, random_state=42)
mi_df = pd.DataFrame({"feature": X.columns, "mi": mi}).sort_values("mi", ascending=False)
```

#### Wrapper methods

##### Recursive Feature Elimination (RFE)

Train model → drop the lowest-importance feature → retrain → repeat until target count.

```python
from sklearn.feature_selection import RFE
from sklearn.ensemble import RandomForestClassifier

rfe = RFE(estimator=RandomForestClassifier(), n_features_to_select=20)
X_train_sel = rfe.fit_transform(X_train, y_train)
selected = X.columns[rfe.support_]
```

| Strength | Weakness |
|---|---|
| Considers feature interactions | Slow — many model fits |
| Tied to a specific model | May not generalize |

##### Sequential Feature Selection

```python
from sklearn.feature_selection import SequentialFeatureSelector

# Forward: start empty, add features that improve CV score
sfs_fwd = SequentialFeatureSelector(estimator=lr, n_features_to_select=10, direction="forward", cv=5)

# Backward: start with all, remove worst
sfs_bwd = SequentialFeatureSelector(estimator=lr, n_features_to_select=10, direction="backward", cv=5)
```

#### Embedded methods

##### Lasso (L1 regularization)

```python
from sklearn.linear_model import LassoCV
lasso = LassoCV(cv=5).fit(X_train_scaled, y_train)
selected = X.columns[lasso.coef_ != 0]
```

> L1 penalty drives some coefficients to **exactly zero** — automatic feature selection. Tune α (regularization strength) via CV.

##### Logistic Lasso

```python
from sklearn.linear_model import LogisticRegression
lr_lasso = LogisticRegression(penalty="l1", solver="liblinear", C=1.0)
lr_lasso.fit(X_train_scaled, y_train)
selected = X.columns[(lr_lasso.coef_ != 0).any(axis=0)]
```

##### Tree-based feature importance

```python
from sklearn.ensemble import RandomForestClassifier
rf = RandomForestClassifier(n_estimators=200).fit(X_train, y_train)
importances = pd.Series(rf.feature_importances_, index=X.columns).sort_values(ascending=False)

# Or for XGBoost / LightGBM
import xgboost as xgb
gain = pd.Series(xgb_model.get_booster().get_score(importance_type="gain"))
```

| Importance type | Meaning |
|---|---|
| **Gain** | Avg gain (loss reduction) per split using this feature |
| **Cover** | Avg #samples affected by splits |
| **Frequency** | How often the feature is used |
| **Permutation importance** | Decrease in metric when feature is shuffled — model-agnostic |
| **SHAP** | Game-theoretic, more reliable than gain |

> Default `feature_importances_` is biased toward **high-cardinality** features. Use **permutation importance** or **SHAP** for better signal.

##### Permutation importance (model-agnostic, more reliable)

```python
from sklearn.inspection import permutation_importance
result = permutation_importance(model, X_val, y_val, n_repeats=10, random_state=42)
imp = pd.Series(result.importances_mean, index=X.columns).sort_values(ascending=False)
```

#### Boruta (all-relevant feature selection)

Compares each feature to a "shadow" (shuffled copy of itself); keeps features that are reliably more important than the best shadow.

```python
from boruta import BorutaPy
from sklearn.ensemble import RandomForestClassifier

rf = RandomForestClassifier(n_estimators=200, n_jobs=-1)
boruta = BorutaPy(rf, n_estimators="auto", random_state=42)
boruta.fit(X_train.values, y_train.values)
selected = X.columns[boruta.support_]
```

> Boruta is "all-relevant" — finds **every** useful feature, not just a minimal subset. Slower but more thorough.

#### Variance / quasi-constant filter

```python
from sklearn.feature_selection import VarianceThreshold
vt = VarianceThreshold(threshold=0.01)        # drop features with var < 0.01
X_train_sel = vt.fit_transform(X_train)
```

| Threshold | Removes |
|---|---|
| 0 | Constant features |
| 0.01 | Near-constant |

#### Highly correlated feature removal

```python
def drop_correlated(df, threshold=0.95):
    corr = df.corr().abs()
    upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
    to_drop = [col for col in upper.columns if any(upper[col] > threshold)]
    return df.drop(columns=to_drop)
```

> Multicollinear features inflate variance of linear-model coefficients but don't affect tree predictions much.

#### Selection by model type

| Model | Best selection method |
|---|---|
| Linear regression | Lasso / RFE with linear |
| Logistic regression | Lasso (L1) |
| Random forest | Permutation importance / Boruta |
| XGBoost / LightGBM | SHAP / permutation importance |
| Neural network | L1 + dropout; doesn't need explicit selection |
| kNN | Filter (correlation / MI) — wrapper too slow |
| SVM | Lasso-Logit-then-fit-SVM |

#### Order of operations

| Step | Method |
|---|---|
| 1 | Drop **constant / quasi-constant** features (`VarianceThreshold`) |
| 2 | Drop **highly correlated** redundant features (correlation matrix) |
| 3 | Filter by **mutual information / chi² / F-test** for top-K |
| 4 | Embed via **Lasso / tree importance** during modeling |
| 5 | Permutation importance / SHAP on final model for interpretability |

#### Cross-validation correctness

> **Always** put feature selection **inside** the CV loop. Selecting on full data, then splitting, is leakage.

```python
from sklearn.pipeline import Pipeline

pipe = Pipeline([
    ("select", SelectKBest(mutual_info_classif, k=20)),
    ("model", LogisticRegression()),
])
scores = cross_val_score(pipe, X, y, cv=5)        # selection refits per fold
```

#### Stability across runs

Bootstrap or repeated CV; track which features are **consistently** selected.

```python
selection_counts = np.zeros(n_features)
for _ in range(50):
    X_boot, y_boot = resample(X, y)
    selector.fit(X_boot, y_boot)
    selection_counts += selector.get_support()
stable_features = X.columns[selection_counts >= 40]    # selected in ≥ 80% of bootstraps
```

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Selection on full data before split | Leakage — fit selector per fold |
| Filter ignoring interactions | Use wrapper / embedded as backup |
| Trusting `feature_importances_` for high-cardinality features | Use permutation or SHAP |
| Too many features for sample size | Need n_features ≤ ~n_samples / 10 for stability |
| Selecting the same set across runs without checking stability | Bootstrap and check |
| Removing features that interact | Check pairwise; or rely on tree models that find interactions |
| Selection criterion misaligned with task | Use chi² for class, MI for general, F-test for regression |
| Lasso without scaling | L1 penalty depends on scale; standardize first |

#### Effect on different metrics

| Metric | What good selection does |
|---|---|
| **CV accuracy** | Often improves slightly (less overfit) |
| **Inference latency** | Linear with #features — significant speedup |
| **Memory** | Linear |
| **Interpretability** | Major improvement |
| **Robustness to drift** | Fewer features → fewer to monitor |

#### When NOT to select features

| Situation | Why |
|---|---|
| Deep learning | Let the network learn relevance via L1 / dropout |
| Plenty of samples + regularization | Regularization handles it |
| Tree models with built-in selection | RF / GBDT implicitly down-weight irrelevant features |
| Domain knowledge says all are relevant | Trust domain |

#### Decision flow

```
Sparse high-d (text / one-hot)?
├─ Yes → L1 / Lasso embedded
└─ No
   ├─ Tabular regression
   │  ├─ Linear model → Lasso + permutation importance on final
   │  └─ Tree model → Boruta or permutation importance
   ├─ Tabular classification
   │  └─ Same as regression
   ├─ Time series
   │  └─ Domain-driven; correlation with target
   └─ Image / sequence (deep learning)
      └─ Don't manually select; use L1 / dropout / attention
```

**Rule of thumb:** **feature engineering > feature selection**. When you do select, prefer **embedded methods (Lasso, tree importance)** for tied-to-model selection, **permutation importance / SHAP** for model-agnostic ranking. **Always run selection inside CV folds** to avoid leakage. For high-cardinality / high-dimensional data, **Lasso** is the cheapest and most reliable starting point.
