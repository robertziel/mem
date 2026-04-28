### Hyperparameter Tuning (grid, random, Bayesian, Optuna, Hyperband, PBT)

**When:** any non-trivial ML model. Hyperparameters dominate model performance more than algorithm choice for tree models, and **make-or-break** performance for NNs. Manual tuning is wasteful; automate.

**Schema (search strategies):**

| Method | When | Speed |
|---|---|---|
| **Grid search** | Few hyperparams (≤ 3); known ranges | Slow; combinatorial |
| **Random search** | Default — easier than grid for high-d | Medium |
| **Bayesian (Optuna, Hyperopt, scikit-optimize)** | Expensive evaluations | Slow per trial, fewer trials needed |
| **Hyperband / ASHA** | Many configs, can early-stop | Fast |
| **PBT** (population-based training) | Schedule + structure together | Specialized |
| **BOHB** (Bayesian + Hyperband) | Best of both | State-of-art |
| **Grad-based (DARTS, NAS)** | Architecture search | Specialized |

> **Random search beats grid search** in nearly all cases. Bayesian optimization beats random when each evaluation is expensive.

#### Grid search

```python
from sklearn.model_selection import GridSearchCV

param_grid = {
    "n_estimators": [100, 200, 500],
    "max_depth": [3, 5, 7, 10],
    "learning_rate": [0.01, 0.05, 0.1],
}
grid = GridSearchCV(model, param_grid, cv=5, scoring="roc_auc", n_jobs=-1)
grid.fit(X, y)
print(grid.best_params_, grid.best_score_)
```

| Pro | Con |
|---|---|
| Exhaustive | Combinatorial blowup |
| Easy to interpret | Wastes budget on bad regions |
| Reproducible | Bad on continuous params |

#### Random search

```python
from sklearn.model_selection import RandomizedSearchCV
from scipy.stats import loguniform, randint

param_dist = {
    "n_estimators": randint(50, 500),
    "max_depth": randint(3, 12),
    "learning_rate": loguniform(1e-3, 1e-1),
}
rand = RandomizedSearchCV(model, param_dist, n_iter=50, cv=5, scoring="roc_auc")
rand.fit(X, y)
```

> **Bergstra & Bengio (2012)**: random search dominates grid in high-d because most parameters don't matter equally.

| Pro | Con |
|---|---|
| Better in high-d than grid | No learning across trials |
| Easy to parallelize | Doesn't focus on promising regions |
| Default starting point | Inefficient when expensive |

#### Bayesian optimization (Optuna)

Builds a **surrogate model** of `metric(hyperparams)`; picks next trial to maximize expected improvement.

```python
import optuna

def objective(trial):
    params = {
        "n_estimators": trial.suggest_int("n_estimators", 50, 500),
        "max_depth": trial.suggest_int("max_depth", 3, 12),
        "learning_rate": trial.suggest_float("learning_rate", 1e-3, 1e-1, log=True),
        "subsample": trial.suggest_float("subsample", 0.5, 1.0),
        "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
    }
    model = xgb.XGBClassifier(**params, eval_metric="auc")
    score = cross_val_score(model, X, y, cv=5, scoring="roc_auc").mean()
    return score

study = optuna.create_study(direction="maximize", sampler=optuna.samplers.TPESampler())
study.optimize(objective, n_trials=100, n_jobs=4)
print(study.best_params, study.best_value)
```

| Sampler | Detail |
|---|---|
| **TPE** (Tree-structured Parzen Estimator) | Default; works well in practice |
| **GP** (Gaussian Process) | Smoother but expensive |
| **CMA-ES** | Continuous-only; fast convergence |
| **NSGA-II** | Multi-objective |

> **Optuna is the modern Python default**. Faster than Hyperopt, easier than Ax, more features than scikit-optimize.

#### Hyperband / ASHA (early-stopping)

Allocates budget across configs adaptively — promising ones get more epochs / data:

```python
import optuna
from optuna.pruners import HyperbandPruner

study = optuna.create_study(
    direction="maximize",
    pruner=HyperbandPruner(min_resource=1, max_resource=100, reduction_factor=3),
)
study.optimize(objective, n_trials=200)
```

> **Used in deep learning** to avoid wasted full training on bad configs. Combine with Bayesian sampler → BOHB.

#### Population-based training (PBT)

Train a population of models in parallel; periodically:

| Step | Action |
|---|---|
| 1 | Worse-performing replicas copy weights from better ones |
| 2 | Slightly perturb hyperparameters |
| 3 | Continue training |

> Tunes **schedule + structure together**. Used by DeepMind, OpenAI for RL / large NN training.

#### What to tune (per algorithm)

##### XGBoost

| Hyperparameter | Range | Effect |
|---|---|---|
| `n_estimators` | 50–1000 | Number of boosting rounds (tune with early stopping) |
| `max_depth` | 3–10 | Tree depth |
| `learning_rate` | 0.01–0.3 | Lower needs more trees; less overfitting |
| `min_child_weight` | 1–10 | Regularization; higher = simpler |
| `subsample` | 0.5–1.0 | Row sampling per tree |
| `colsample_bytree` | 0.5–1.0 | Column sampling per tree |
| `reg_alpha` | 0–10 | L1 regularization |
| `reg_lambda` | 0–10 | L2 regularization |
| `gamma` | 0–10 | Min loss reduction to split |

##### LightGBM

| Hyperparameter | Range |
|---|---|
| `num_leaves` | 7–255 (start 31) |
| `max_depth` | -1 (no limit) or 3–12 |
| `learning_rate` | 0.01–0.3 |
| `feature_fraction` | 0.6–1.0 |
| `bagging_fraction` | 0.6–1.0 |
| `min_data_in_leaf` | 5–100 |
| `lambda_l1` / `lambda_l2` | 0–10 |

##### Random Forest

| Hyperparameter | Range |
|---|---|
| `n_estimators` | 100–1000 |
| `max_depth` | None or 5–30 |
| `min_samples_split` | 2–20 |
| `min_samples_leaf` | 1–10 |
| `max_features` | "sqrt", "log2", 0.3–0.7 |

##### Neural network

| Hyperparameter | Range |
|---|---|
| `learning_rate` | 1e-5–1e-2 (log scale) |
| `batch_size` | 32, 64, 128, 256 |
| `weight_decay` | 0–1e-3 |
| `dropout` | 0–0.5 |
| `hidden_dim` / `n_layers` | Architecture |
| Optimizer | Adam, SGD with momentum, AdamW |
| LR schedule | Cosine, step, warmup + decay |

#### Search ranges — best practices

| Parameter type | Use |
|---|---|
| Continuous, multiple orders of magnitude | **Log-uniform** (e.g., `lr ∈ [1e-5, 1e-1]`) |
| Continuous, single order | Uniform |
| Integer | Discrete with `suggest_int` |
| Categorical | List of options |
| Bounded percentage | `[0.5, 1.0]` typical |

#### Cross-validation strategy

| CV | Use |
|---|---|
| **Holdout** | Quick; fast iterations |
| **k-fold** | Standard; k = 5 typical |
| **Stratified k-fold** | Imbalanced classification |
| **Time series CV** | Temporal data |
| **Group k-fold** | Don't split same entity |
| **Repeated CV** | High-variance metrics |

> **Always wrap preprocessing in a Pipeline** so it refits per fold — leakage-free hyperparameter tuning.

#### Multi-objective tuning

Sometimes you optimize **multiple metrics**:

```python
def objective(trial):
    # ... train ...
    return auc, latency_ms        # multi-objective

study = optuna.create_study(directions=["maximize", "minimize"])
study.optimize(objective, n_trials=100)

# Pareto front
pareto_trials = study.best_trials
```

> **Optuna's NSGA-II sampler** finds the **Pareto front** of trade-offs. Used for "accurate AND fast" optimization.

#### Nested CV (when reporting honest results)

Outer loop: estimate generalization; inner loop: tune hyperparams.

```python
from sklearn.model_selection import KFold, GridSearchCV
outer_cv = KFold(n_splits=5, shuffle=True, random_state=42)
scores = []
for train_idx, test_idx in outer_cv.split(X):
    X_tr, X_te = X[train_idx], X[test_idx]
    y_tr, y_te = y[train_idx], y[test_idx]
    inner = GridSearchCV(model, param_grid, cv=3)
    inner.fit(X_tr, y_tr)
    scores.append(inner.score(X_te, y_te))
print("Generalization estimate:", np.mean(scores))
```

> Without nested CV, you over-fit to the validation set during tuning. Generalization is over-estimated.

#### Successive halving / ASHA

```python
from sklearn.experimental import enable_halving_search_cv
from sklearn.model_selection import HalvingRandomSearchCV

search = HalvingRandomSearchCV(
    model, param_dist, factor=3, resource="n_estimators",
    max_resources=1000, cv=5,
)
search.fit(X, y)
```

> Allocate **few resources** to many configs first; **survivors** get more. Asymptotically optimal.

#### Practical tips

| Tip | Why |
|---|---|
| Use **log scale** for learning rate, regularization | Right scale for these |
| **Random > grid** | Always |
| **Few iterations of broad search**, then refine | Coarse-to-fine |
| **Look at the trial history**, not just best | Reveals which params matter |
| **Visualize importance** | `optuna.visualization.plot_param_importances(study)` |
| **Stop when plateaued** | Don't waste trials |
| **Track all trials** in MLflow / W&B | Audit + comparison |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Grid search on continuous params | Use random or Bayesian |
| Tuning on test set | Use validation set; nested CV for honest report |
| Forgetting to set seed | Reproducibility |
| Tuning a leaky pipeline | Wrap preprocessing in Pipeline |
| Tuning too many hyperparams at once | Tune ~5 most-impactful first |
| Linear-spaced LR / regularization | Use log-uniform |
| Reporting best CV as expected test | Always overfits CV |
| Single-objective when multiple matter | Multi-objective Optuna |
| Re-running with different seed gets different "best" | Tuning is high-variance; use repeated runs |
| Treating Bayesian as magic | Pre-process well; tune only what matters |

#### When tuning isn't worth it

| Situation | Why |
|---|---|
| Defaults are sane (modern XGBoost / LightGBM) | Often within 2–3% of best |
| Other improvements pending (data, features) | Tuning is last-mile |
| Cost > benefit | Inference cheap, training expensive |
| Massive overfitting risk (small data) | Tuning overfits more |

> Often **better features** beat **better hyperparams**. Tune late, not early.

#### Decision tree

```
Hyperparameter count?
├─ ≤ 3, discrete                       → Grid search
├─ 3–10                                  → Random search (50–100 trials)
├─ 10+                                   → Bayesian (Optuna TPE) — 100–500 trials
└─ Deep learning, expensive epochs       → Hyperband / ASHA / BOHB

Number of objectives?
├─ Single                                → Standard CV maximization
└─ Multi                                  → Multi-objective NSGA-II / Pareto
```

#### Tools

| Tool | Strength |
|---|---|
| **Optuna** | Modern Python default; fast, feature-rich |
| **Hyperopt** | TPE; older, still common |
| **Ax / BoTorch** | Facebook's PyTorch-native Bayesian |
| **scikit-optimize** | Sklearn-style Bayesian |
| **Ray Tune** | Distributed, supports many algos |
| **W&B Sweeps** | Integrated with W&B tracking |
| **AutoML (auto-sklearn, TPOT, H2O)** | End-to-end pipeline tuning |
| **Hugging Face accelerate + sweeps** | NN-focused |

**Rule of thumb:** **random search > grid search** for any continuous param. **Optuna with TPE** is the modern default — handles continuous, integer, categorical, log-scale natively. Use **Hyperband / ASHA** when each trial is expensive (deep learning). Always **wrap preprocessing in Pipeline** for leakage-free tuning. Use **nested CV** for honest generalization estimates. **Tune ~5 most-impactful hyperparams**; tuning everything is wasteful and unstable.
