### Gradient Boosting (XGBoost, LightGBM, decision trees, residuals, regularization)

**When:** structured / tabular ML — Kaggle-winning regression and classification, ranking (search ads), risk modeling, scoring. The default for **non-deep-learning** tabular tasks. Sequentially fits weak learners (decision trees) on the **gradient of the loss** of the current ensemble.

**Schema:**

| Concept | Detail |
|---|---|
| **Ensemble** | `F_M(x) = Σ_{m=1..M} γ_m · h_m(x)` — sum of M weak learners |
| **Weak learner** | Usually a shallow decision tree (depth 3–8) |
| **Boosting** | Each new learner targets the **negative gradient** of the loss w.r.t. current predictions |
| **Step size** | Learning rate `η` (~0.01–0.3); shrinks each tree's contribution |
| **Loss** | Squared error, log loss, Huber, ranking, custom |
| **Regularization** | Tree depth, min samples per leaf, L1/L2 on leaf weights, column subsampling |

> **Boosting** = sequential additive model with each step trying to fix the residual error of the previous ensemble.

#### Generic gradient boosting algorithm

```text
F_0(x) = constant minimizing the loss (e.g., mean for MSE)
For m = 1, …, M:
    1. Compute pseudo-residuals: r_i^{(m)} = − ∂L(y_i, F(x_i)) / ∂F(x_i)  evaluated at F_{m−1}
    2. Fit a tree h_m(x) to predict r_i^{(m)}
    3. Pick step size γ_m (line search, or just use η)
    4. F_m(x) = F_{m−1}(x) + η · h_m(x)
```

#### Loss → pseudo-residual

| Task | Loss | Negative gradient |
|---|---|---|
| Regression (MSE) | `½ (y − F)²` | `y − F` (the literal residual) |
| Classification (log loss) | `log(1 + exp(−2 y F))` | `2 y / (1 + exp(2 y F))` |
| Huber regression | Squared near-zero, linear far | Squared / linear residual |
| Quantile regression | Pinball loss | Per-quantile gradient |
| Ranking (LambdaRank) | NDCG-based | Pairwise gradient |

#### XGBoost / LightGBM extensions

| Feature | Effect |
|---|---|
| **Second-order Taylor** (gradient + Hessian) | `obj = Σ [g_i · w + ½ · h_i · w²]` per leaf — closed-form leaf weights, faster splits |
| **Regularization in tree-fit** | L1 (`α`) and L2 (`λ`) on leaf weights → prevents overfitting |
| **Histogram-based splits** (LightGBM) | Bucket continuous features → much faster |
| **GOSS (gradient one-side sampling)** | Sample large-gradient examples preferentially |
| **EFB (exclusive feature bundling)** | Bundle sparse features that rarely co-occur |
| **Categorical splits** | Native handling without one-hot |
| **GPU training** | Fast histogram-based for huge data |
| **Early stopping** | Stop when validation loss plateaus |

#### XGBoost objective per leaf

For a tree's leaf with samples `i ∈ I` and weight `w`:

```
obj(w) = Σ_i [g_i · w + ½ · h_i · w²] + λ · ½ · w² + α · |w|
```

Optimal weight (with α = 0): `w* = − Σ g_i / (Σ h_i + λ)`. The split criterion compares `obj` before and after the split.

#### Hyperparameters that matter most

| Param | Effect |
|---|---|
| `n_estimators` (M) | Number of trees; pair with early stopping |
| `learning_rate` (η) | Smaller + more trees = better generalization; 0.01–0.1 typical |
| `max_depth` | 3–8 typical; deeper = more variance |
| `min_child_weight` / `min_samples_leaf` | Larger = more regularization |
| `subsample` | Stochastic boosting; 0.6–1.0 |
| `colsample_bytree` | Feature subsampling per tree |
| `reg_alpha` (L1), `reg_lambda` (L2) | Leaf-weight regularization |
| `gamma` (XGBoost) | Min loss reduction to split — strong regularizer |

#### Boosting vs bagging vs stacking

| Method | Mechanism | Examples |
|---|---|---|
| **Bagging** | Train many models on bootstrap samples; **average** | Random forest |
| **Boosting** | Train models sequentially on residuals; **sum** | AdaBoost, XGBoost, LightGBM |
| **Stacking** | Train a meta-model on out-of-fold base predictions | Kaggle gold |
| **Random forest** | Bagging of decision trees + feature randomness | Slower than GBDT but parallel-friendly |

#### XGBoost vs LightGBM vs CatBoost

| Aspect | XGBoost | LightGBM | CatBoost |
|---|---|---|---|
| Speed (small data) | Fast | **Fast** | Slower |
| Speed (large data) | Slow | **Very fast** (histogram + GOSS) | Medium |
| Categorical features | Manual encoding | Native | **Best** native handling |
| GPU | Good | Good | **Good + ordered boosting** |
| Memory | Higher | Lower | Higher |
| Default for | Tabular | Big tabular | Heavy categorical |
| Overfitting in small datasets | Standard | Watch leaf-wise tree growth | Ordered boosting reduces leakage |

#### Use cases

| Domain | Why GBDT |
|---|---|
| Kaggle / tabular ML | Wins ~70% of structured-data competitions |
| Credit scoring | Robust + interpretable feature importance |
| CTR / ad ranking | Combined with FFMs in many production stacks |
| Search ranking | LambdaMART (XGBoost-style for ranking) |
| Fraud detection | Imbalanced classification |
| Sales forecasting | Tabular with seasonality features |
| Medical risk scoring | Few thousand rows, mixed types |
| Price prediction | Real estate, used cars |

#### Patterns map

| Need | Technique |
|---|---|
| Tabular regression / classification | LightGBM / XGBoost / CatBoost |
| Many categorical features | CatBoost or target encoding + GBDT |
| Tiny dataset (n < 1000) | Linear / GLM, random forest, calibration matters |
| Need interpretability | Limit depth, use SHAP for explanations |
| Real-time inference | Quantize trees, use ONNX export |
| Imbalanced classes | `scale_pos_weight`, class weights, focal loss |
| Ranking / pairwise | LambdaRank objective |
| Custom loss | Provide gradient + Hessian functions |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Forgetting validation set + early stopping | Boost too many trees, overfit |
| `learning_rate` = 1 with default trees | Wild fluctuations; use η ≈ 0.05–0.1 |
| Treating GBDT as black box | Use SHAP / feature importance to validate |
| One-hot encoding huge categoricals | Use **native categorical** (LightGBM / CatBoost) |
| Imbalanced classes ignored | `scale_pos_weight` or class weights |
| Leakage via target encoding without out-of-fold | Use OOF / CV for target encoding |
| Tree too deep (`depth ≥ 12`) | Overfits; 4–8 is the sweet spot |
| Ignoring monotone constraints when domain requires | Use `monotone_constraints` for monotonic features |
| Comparing to deep learning on tabular | GBDT usually wins; don't waste GPUs |

#### Complexity

| Op | Cost |
|---|---|
| Train (M trees, n samples, d features) | O(M · n · d · log n) for histogram methods |
| Predict | O(M · depth) per sample |
| Memory | O(M · #leaves) for the model |

**Rule of thumb:** **Gradient boosting = sequential trees on the loss gradient**. For tabular data, **LightGBM / XGBoost / CatBoost are the default** — beat random forests, beat naive deep learning. Use **shallow trees (depth 3–8)** + **small learning rate (~0.05)** + **early stopping** + **feature / row subsampling**. Tune **`num_leaves`** / **`max_depth`** before anything else. Combine with **SHAP** for interpretability.
