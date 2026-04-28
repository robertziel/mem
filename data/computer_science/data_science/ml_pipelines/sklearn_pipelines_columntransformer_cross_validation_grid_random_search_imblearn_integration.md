### scikit-learn Pipelines (ColumnTransformer, cross-validation, grid / random search, imblearn integration)

**When:** any ML workflow with multiple preprocessing steps + a model. Pipelines bundle preprocessing + model into a single object that **fits per fold during CV**, **prevents data leakage**, and **deploys atomically**. The single most-impactful sklearn idiom — replaces ad-hoc preprocessing scripts.

**Schema:**

```
Pipeline = [step_1_preprocessor, step_2_preprocessor, ..., final_estimator]
```

| Property | Detail |
|---|---|
| **Lazy** | All steps fit only when `.fit(X, y)` called |
| **Cross-validation safe** | Refits all steps per fold |
| **Composable** | Pipelines can contain Pipelines |
| **Searchable** | Hyperparams of any step tunable |
| **Deployable** | Single pickle file; `.predict()` runs full chain |

> **Without Pipeline → leakage**. With Pipeline → preprocessing fits on train fold only, then transforms test fold.

#### Basic Pipeline

```python
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

pipe = Pipeline([
    ("scaler", StandardScaler()),
    ("clf", LogisticRegression()),
])

pipe.fit(X_train, y_train)
preds = pipe.predict(X_test)
proba = pipe.predict_proba(X_test)
```

> Each step is `(name, transformer)`. The **last step** must be a final estimator (predictor).

#### ColumnTransformer (different transforms per column type)

```python
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder

preprocessor = ColumnTransformer([
    ("num", StandardScaler(), ["age", "income"]),
    ("cat", OneHotEncoder(handle_unknown="ignore"), ["region", "device"]),
    ("passthrough_cols", "passthrough", ["already_scaled"]),
], remainder="drop")

pipe = Pipeline([
    ("preproc", preprocessor),
    ("model", LogisticRegression()),
])
```

| `remainder` | Behavior |
|---|---|
| `"drop"` (default) | Drop unspecified columns |
| `"passthrough"` | Pass them through unchanged |

> **Most production pipelines have a ColumnTransformer** — different cols need different preprocessing.

#### Common preprocessing combinations

```python
# Numeric: impute + scale
num_pipe = Pipeline([
    ("imp", SimpleImputer(strategy="median")),
    ("scl", StandardScaler()),
])

# Categorical: impute + encode
cat_pipe = Pipeline([
    ("imp", SimpleImputer(strategy="constant", fill_value="missing")),
    ("ohe", OneHotEncoder(handle_unknown="ignore")),
])

preprocessor = ColumnTransformer([
    ("num", num_pipe, num_cols),
    ("cat", cat_pipe, cat_cols),
])
```

#### Cross-validation with Pipeline

```python
from sklearn.model_selection import cross_val_score, StratifiedKFold

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(pipe, X, y, cv=cv, scoring="roc_auc")
print(f"AUC: {scores.mean():.3f} ± {scores.std():.3f}")
```

> Per fold: scaler fits on train fold → transforms train and test folds → model fits on train → scores on test. **Leakage-free**.

#### Hyperparameter search through pipeline

```python
from sklearn.model_selection import GridSearchCV

param_grid = {
    "preproc__num__scl__with_mean": [True, False],
    "model__C": [0.01, 0.1, 1, 10],
    "model__penalty": ["l1", "l2"],
}

grid = GridSearchCV(
    pipe, param_grid, cv=5, scoring="roc_auc", n_jobs=-1
)
grid.fit(X_train, y_train)
print(grid.best_params_)
```

> **`step_name__inner_step__param`** double-underscore syntax addresses any param of any step.

#### Optuna with Pipeline

```python
import optuna
from sklearn.model_selection import cross_val_score

def objective(trial):
    pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(
            C=trial.suggest_float("C", 1e-3, 1e2, log=True),
            penalty=trial.suggest_categorical("penalty", ["l1", "l2"]),
            solver="liblinear",
        )),
    ])
    return cross_val_score(pipe, X, y, cv=5, scoring="roc_auc").mean()

study = optuna.create_study(direction="maximize")
study.optimize(objective, n_trials=50)
```

#### Custom transformers

```python
from sklearn.base import BaseEstimator, TransformerMixin

class LogTransformer(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None):
        return self
    def transform(self, X):
        return np.log1p(X)

# Use in pipeline
pipe = Pipeline([
    ("log", LogTransformer()),
    ("scl", StandardScaler()),
    ("clf", LogisticRegression()),
])
```

> Subclass `BaseEstimator + TransformerMixin`; implement `fit()` and `transform()`. Stateless transformers can `return self` from `fit()`.

##### Custom feature engineering

```python
class DateFeatures(BaseEstimator, TransformerMixin):
    def __init__(self, col):
        self.col = col
    def fit(self, X, y=None):
        return self
    def transform(self, X):
        X = X.copy()
        d = pd.to_datetime(X[self.col])
        X[self.col + "_dow"] = d.dt.dayofweek
        X[self.col + "_month"] = d.dt.month
        X[self.col + "_hour_sin"] = np.sin(2 * np.pi * d.dt.hour / 24)
        X[self.col + "_hour_cos"] = np.cos(2 * np.pi * d.dt.hour / 24)
        return X.drop(columns=[self.col])
```

#### `FunctionTransformer` (lightweight wrapper)

```python
from sklearn.preprocessing import FunctionTransformer
log_transformer = FunctionTransformer(np.log1p, validate=True)
```

> For simple transforms, no need to subclass.

#### imblearn pipeline (for resampling correctness)

Standard sklearn `Pipeline` runs **all steps on train AND test**. For SMOTE / oversampling, you need to apply only on train:

```python
from imblearn.pipeline import Pipeline as ImbPipeline
from imblearn.over_sampling import SMOTE

pipe = ImbPipeline([
    ("scl", StandardScaler()),
    ("smote", SMOTE(random_state=42)),       # only on train
    ("clf", LogisticRegression()),
])
```

> **`imblearn.pipeline.Pipeline`** automatically applies resamplers only during fit, not transform. Sklearn's regular Pipeline doesn't handle this correctly.

#### Pipeline visualization

```python
from sklearn import set_config
set_config(display="diagram")
pipe          # In Jupyter: rich HTML diagram
```

#### Persistence

```python
import joblib
joblib.dump(pipe, "model.joblib")

# Load
loaded = joblib.load("model.joblib")
loaded.predict(X_new)
```

> A trained Pipeline is a single artifact — preprocessing + model. **Always pickle the full pipeline**, never just the model.

#### `make_pipeline` / `make_column_transformer` (auto-naming)

```python
from sklearn.pipeline import make_pipeline
from sklearn.compose import make_column_transformer

# Auto-names steps from class names (lowercase)
pipe = make_pipeline(StandardScaler(), LogisticRegression())
# Steps: ["standardscaler", "logisticregression"]

preproc = make_column_transformer(
    (StandardScaler(), num_cols),
    (OneHotEncoder(), cat_cols),
)
```

> Less verbose; less explicit. Pick by team preference.

#### Common patterns

##### Different models in the same search

```python
from sklearn.ensemble import RandomForestClassifier

pipe = Pipeline([
    ("preproc", preprocessor),
    ("clf", LogisticRegression()),
])

param_grid = [
    {"clf": [LogisticRegression()], "clf__C": [0.1, 1, 10]},
    {"clf": [RandomForestClassifier()],
     "clf__n_estimators": [100, 500],
     "clf__max_depth": [5, 10, None]},
]
grid = GridSearchCV(pipe, param_grid, cv=5)
```

##### Stacking (combined model output)

```python
from sklearn.ensemble import StackingClassifier

stack = StackingClassifier(
    estimators=[
        ("rf", RandomForestClassifier()),
        ("xgb", XGBClassifier()),
    ],
    final_estimator=LogisticRegression(),
    cv=5,                          # internal CV for level-1 features
)

pipe = Pipeline([("preproc", preprocessor), ("stack", stack)])
```

#### Caching expensive transformers

```python
from joblib import Memory

cache_dir = "./cache"
pipe = Pipeline(
    steps=[("preproc", expensive_transformer), ("clf", model)],
    memory=Memory(cache_dir, verbose=0),
)
```

> Re-uses preprocessing output across CV iterations. Big speedup when preprocessing dominates compute.

#### Common pitfalls

| Mistake | Fix |
|---|---|
| `fit_transform` on full data, then split | Leakage — wrap in Pipeline + cross-validate |
| Imputing `mean` from full dataset | Same — must fit per fold |
| One-hot encoding with unknown test categories | `handle_unknown="ignore"` |
| Forgetting `__` separator in param_grid | Use `step__param`, not `step.param` |
| SMOTE in regular sklearn Pipeline | Use `imblearn.pipeline.Pipeline` |
| Custom transformer that doesn't return DataFrame | sklearn returns NumPy by default; use `set_output(transform="pandas")` (1.2+) |
| ColumnTransformer drops unlisted columns | Set `remainder="passthrough"` if you need them |
| Pickling sklearn version mismatch | Pin versions; use `joblib` |
| ColumnTransformer with column names lost | Use `set_output(transform="pandas")` |
| Forgetting random_state | Reproducibility broken |

#### Output as DataFrame (sklearn 1.2+)

```python
from sklearn import set_config
set_config(transform_output="pandas")        # global
# Or per-pipeline:
pipe.set_output(transform="pandas")
```

> Now `.transform()` and `.fit_transform()` return DataFrames with **named columns** — easier inspection.

#### Pipeline introspection

```python
# Access fitted transformers / models
pipe.named_steps["scl"].mean_
pipe["clf"].coef_

# All step names
list(pipe.named_steps.keys())

# Transform up to step N
pipe[:-1].transform(X)              # all but the last (the model)
```

#### Alternative pipeline frameworks

| Framework | Strength |
|---|---|
| **scikit-learn Pipeline** | Standard; well-documented |
| **imblearn Pipeline** | + Resampling correctness |
| **MLflow Pipelines** | Production lifecycle |
| **PyCaret** | Auto-ML wrapper around sklearn |
| **Kedro** | Workflow + pipelines for production |
| **ZenML** | MLOps pipelines |
| **Sagemaker Pipelines** | AWS-native |
| **Vertex AI Pipelines** | GCP-native |
| **Kubeflow Pipelines** | K8s-native |

> **scikit-learn Pipeline + ColumnTransformer** is the standard for in-process ML. For cross-step orchestration (training → deployment → monitoring), use **MLflow / Kedro / Kubeflow**.

#### Decision tree

```
Need
├─ Single-process ML preprocessing + model    → sklearn Pipeline
├─ Different transforms per column type        → + ColumnTransformer
├─ Class imbalance handling                    → imblearn.pipeline.Pipeline (with SMOTE)
├─ Hyperparameter tuning                       → + GridSearchCV / RandomizedSearchCV / Optuna
├─ Model stacking                              → StackingClassifier inside Pipeline
├─ Multi-stage workflow (train → register)     → Kedro / MLflow / Kubeflow
└─ Distributed training                        → Spark MLlib / Ray / DDP
```

#### Reference template

```python
import joblib, pandas as pd, numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.model_selection import StratifiedKFold, GridSearchCV
from sklearn.ensemble import GradientBoostingClassifier

num_cols = ["age", "income", "tenure"]
cat_cols = ["region", "plan", "device"]

preprocessor = ColumnTransformer([
    ("num", Pipeline([
        ("imp", SimpleImputer(strategy="median")),
        ("scl", StandardScaler()),
    ]), num_cols),
    ("cat", Pipeline([
        ("imp", SimpleImputer(strategy="constant", fill_value="missing")),
        ("ohe", OneHotEncoder(handle_unknown="ignore")),
    ]), cat_cols),
])

pipe = Pipeline([
    ("preproc", preprocessor),
    ("clf", GradientBoostingClassifier(random_state=42)),
])

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
grid = GridSearchCV(
    pipe,
    {"clf__n_estimators": [100, 300], "clf__max_depth": [3, 5, 7]},
    cv=cv, scoring="roc_auc", n_jobs=-1,
)
grid.fit(X, y)

joblib.dump(grid.best_estimator_, "model.joblib")
```

**Rule of thumb:** **wrap every ML workflow in a Pipeline + ColumnTransformer**. Preprocessing must **fit per fold** to avoid leakage — Pipeline guarantees this for free. Use **`step__param`** notation for hyperparam search across the whole pipeline. For class imbalance, **`imblearn.pipeline.Pipeline`**, not sklearn's. Pickle the **full pipeline** as the production artifact.
