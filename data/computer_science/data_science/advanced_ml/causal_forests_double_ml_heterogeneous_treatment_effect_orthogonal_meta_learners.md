### Causal Forests + Double ML (heterogeneous treatment effects, orthogonal estimation, meta-learners)

**When:** estimate **how the treatment effect varies across individuals** — personalized treatment recommendations, marketing-uplift modeling, individualized medicine. Standard A/B test gives the **average treatment effect (ATE)**; modern causal ML gives the **conditional ATE (CATE)** per user / segment.

**Schema:**

| Concept | Detail |
|---|---|
| **ATE** | `E[Y₁ - Y₀]` — average effect over all units |
| **CATE** | `τ(x) = E[Y₁ - Y₀ | X = x]` — effect conditional on covariates |
| **ITE** | Individual treatment effect (theoretical; never observed directly) |
| **Confounding** | Observed: handle via models; unobserved: still a problem |
| **Heterogeneity** | Different units gain (or lose) different amounts |

> Why CATE matters: averaging over all users misses **who benefits most** (uplift) and **who is harmed**.

#### Setup

| Variable | Detail |
|---|---|
| `Y` | Outcome |
| `T ∈ {0, 1}` | Treatment indicator |
| `X` | Pre-treatment features (covariates) |
| `e(X) = P(T = 1 | X)` | Propensity score |
| `μ_t(X) = E[Y | T = t, X]` | Outcome model per arm |
| `τ(X) = μ_1(X) - μ_0(X)` | CATE |

#### Meta-learners (model-agnostic CATE estimators)

| Meta-learner | What |
|---|---|
| **S-learner** | Single model `μ̂(X, T)`; CATE = `μ̂(X, 1) - μ̂(X, 0)` |
| **T-learner** | Two models `μ̂_0(X)` and `μ̂_1(X)`; CATE = `μ̂_1(X) - μ̂_0(X)` |
| **X-learner** | T-learner + cross-residual stage; weights by propensity |
| **R-learner** | Regress residuals using orthogonal score |
| **DR-learner** | Doubly-robust; combines outcome and propensity |

##### S-learner (simplest)

```python
# One model with treatment as feature
model = lgb.LGBMRegressor().fit(np.column_stack([X, T]), Y)

cate = model.predict(np.column_stack([X, np.ones(len(X))])) - \
       model.predict(np.column_stack([X, np.zeros(len(X))]))
```

| Pro | Con |
|---|---|
| Simple | Treatment may be regularized away |
| Single model | Bad for small treatment effect |

##### T-learner

```python
model_treated = lgb.LGBMRegressor().fit(X[T == 1], Y[T == 1])
model_control = lgb.LGBMRegressor().fit(X[T == 0], Y[T == 0])

cate = model_treated.predict(X) - model_control.predict(X)
```

| Pro | Con |
|---|---|
| Simple, interpretable | Two separate models; data split |
| Works with any base learner | Imbalanced if T=1 is rare |

##### X-learner (better for imbalanced treatment)

```
1. Fit μ̂_0, μ̂_1 like T-learner
2. Compute imputed treatment effects:
   D̃₁ = Y₁ - μ̂_0(X₁)        # for treated units
   D̃₀ = μ̂_1(X₀) - Y₀         # for control units
3. Train τ̂_1(X) on (X₁, D̃₁) and τ̂_0(X) on (X₀, D̃₀)
4. Combine: τ̂(X) = e(X) · τ̂_0(X) + (1 - e(X)) · τ̂_1(X)
   (more weight on the imputed-from-the-larger group)
```

> **Best when treatment is imbalanced** (e.g., 5% treated, 95% control).

##### R-learner (orthogonal / Robinson)

Uses the **orthogonalization** trick:

```
1. Fit nuisance models: m̂(X) = E[Y | X], ê(X) = E[T | X]
2. Compute residuals: Ỹ = Y - m̂(X), T̃ = T - ê(X)
3. Regress Ỹ on T̃ to estimate τ̂(X):
   τ̂ = argmin Σ (Ỹᵢ - τ(Xᵢ) · T̃ᵢ)²
```

| Property | Detail |
|---|---|
| **Orthogonal** | First-stage errors don't leak into CATE estimate |
| **Doubly robust** | Consistent if either nuisance is correct |
| **Standard in modern causal ML** | Used by EconML, CausalML |

#### Causal Forest (Athey-Wager-Tibshirani)

A **random forest** specifically optimized for CATE estimation:

```python
from econml.dml import CausalForestDML

cf = CausalForestDML(
    model_y=lgb.LGBMRegressor(),
    model_t=lgb.LGBMClassifier(),
    n_estimators=500,
    discrete_treatment=True,
)
cf.fit(Y, T, X=X, W=W)        # X = effect modifiers, W = controls

cate = cf.effect(X_new)
ci_lower, ci_upper = cf.effect_interval(X_new, alpha=0.05)
```

| Property | Detail |
|---|---|
| Trees split to maximize **treatment effect heterogeneity** | Custom splitting criterion |
| **Honest splitting** | Use one half to find splits, other half for estimates → unbiased |
| Confidence intervals | Native asymptotic CIs |
| Doubly robust | Built on orthogonal score |

> **Causal Forests are the standard for tree-based CATE estimation**. Used at Microsoft, Stanford research.

#### Double / Debiased Machine Learning (DoubleML)

```python
from doubleml import DoubleMLData, DoubleMLPLR

dml_data = DoubleMLData(df, y_col="Y", d_cols="T", x_cols=X_cols)
dml = DoubleMLPLR(
    dml_data,
    ml_l=lgb.LGBMRegressor(),    # E[Y | X]
    ml_m=lgb.LGBMClassifier(),    # E[T | X]
    n_folds=5,                     # cross-fitting
)
dml.fit()
print(dml.summary)                 # ATE estimate + SE + CI
```

> **Cross-fitting** is essential — splits data so nuisance models don't leak into outcome estimates. Without it, the effect is biased.

#### Cross-fitting (a key trick)

| Step | Detail |
|---|---|
| 1 | Split data into K folds |
| 2 | For each fold k: fit nuisance models (μ, e) on the OTHER K-1 folds |
| 3 | Compute residuals on fold k using those models |
| 4 | Aggregate residuals across folds |
| 5 | Final regression on aggregated residuals |

> Prevents **regularization bias** from nuisance ML estimators. Standard in DML / causal forests.

#### Identifying assumptions

| Assumption | Detail |
|---|---|
| **Conditional ignorability** | `(Y₀, Y₁) ⊥ T | X` — all confounders observed |
| **Positivity / overlap** | `0 < e(X) < 1` for all X — both arms see all covariate values |
| **Consistency** | Observed `Y` = `Y_T` (no different effects from same treatment) |
| **SUTVA** | No interference between units |

> Same as PSM / IPW. **All confounders must be observed**. Violations introduce bias.

#### When to use which estimator

| Scenario | Recommended |
|---|---|
| Randomized A/B test, want CATE per segment | Causal Forest or X-learner |
| Observational data, well-balanced | T-learner with strong base ML |
| Imbalanced treatment | X-learner |
| Small sample | S-learner with regularization |
| Need confidence intervals | Causal Forest or DoubleML |
| Continuous treatment | DoubleML PLR |
| Multiple treatments | Multi-arm forest |
| High-dim controls | DoubleML with Lasso / NN |
| Time-varying treatment | Targeted maximum likelihood (TMLE), G-methods |
| Instrumental variable | DoubleML IV |

#### Frameworks

| Library | Strength |
|---|---|
| **EconML** (Microsoft) | Comprehensive: meta-learners, causal forests, IV, DML |
| **CausalML** (Uber) | Practical recipes; uplift modeling |
| **DoubleML** | Orthogonal estimation in Python / R |
| **GRF** (R) | Generalized random forests (R version) |
| **DoWhy + EconML** | Identification + estimation pipeline |
| **CausalPy** | Bayesian causal inference (PyMC-based) |

#### Uplift modeling

Special case of CATE estimation for **marketing**:

| Quadrant | Definition | Strategy |
|---|---|---|
| **Persuadables** | `Y₀ = 0, Y₁ = 1` | **Target** these |
| **Sure things** | `Y₀ = 1, Y₁ = 1` | Don't waste budget |
| **Lost causes** | `Y₀ = 0, Y₁ = 0` | Don't target |
| **Sleeping dogs** | `Y₀ = 1, Y₁ = 0` (treatment hurts) | **Avoid** these |

> Uplift = `P(buy | treated) - P(buy | not treated)`. Optimal targeting = top-K by uplift, not top-K by likelihood.

#### Evaluation (without ground-truth CATE)

Standard ML metrics fail because we don't observe both `Y_0` and `Y_1` for the same unit. Use:

| Metric | Detail |
|---|---|
| **Qini coefficient / curve** | Cumulative incremental outcome vs % targeted |
| **AUUC** (Area Under Uplift Curve) | Aggregate over Qini curve |
| **Calibration** | Predicted CATE vs actual within bins |
| **Targeting performance** | Lift on the targeted top-K |
| **PEHE** (precision in estimating heterogeneous effects) | Only with synthetic ground truth |

```python
from causalml.metrics import plot_qini, qini_score

qini = qini_score(df, outcome_col="Y", treatment_col="T", uplift_col="cate_pred")
plot_qini(df)
```

#### Common patterns

##### Marketing uplift

```python
# Train on RCT or observational with strong covariates
cf = CausalForestDML(...)
cf.fit(Y, T, X)
uplift = cf.effect(X_new)

# Target top-K predicted uplift
top_k = np.argsort(uplift)[::-1][:k]
```

##### Personalized medicine

```python
# Estimate CATE per patient feature profile
# Recommend treatment for those with positive predicted CATE
treat = uplift > 0
```

##### A/B test segmentation

```python
# After running A/B test, learn CATE → ship to most-positive segments only
cate = causal_forest.effect(features)
ship_to_segment = cate > threshold
```

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Using ML models for `μ_0, μ_1` without cross-fitting | Use DML cross-fitting |
| CATE on observational data without checking confounders | Add covariates; validate with falsification tests |
| Ignoring overlap | Trim where `e(X)` near 0 or 1 |
| Treating predicted CATE as ITE | Only individual heterogeneity is identifiable |
| Standard ML metrics for CATE | Use Qini / AUUC / calibration |
| Using same data for nuisance and effect estimation | Cross-fit |
| One-shot validation | Use bootstrap CIs from Causal Forest |
| Strong heterogeneity claim from small data | High-variance per cell; use multiple-comparison correction |
| Imbalanced treatment with T-learner | Switch to X-learner |
| Categorical covariates as numeric | Encode properly |

#### Sensitivity to unobserved confounding

Same caveats as PSM:

| Approach | Detail |
|---|---|
| **E-value** | Minimum confounder strength to nullify |
| **Rosenbaum bounds** | Range of bias from unmeasured confounder |
| **Tipping-point analysis** | Effect size that flips conclusion |

> Always **report sensitivity** for observational CATE estimates.

#### Heterogeneity tests

| Test | Detail |
|---|---|
| **Variance of CATE** | Is heterogeneity statistically present? |
| **Best linear predictor** (Athey-Wager) | Slope of true τ vs predicted τ |
| **Calibration plot** | Bin predicted CATE; compare to observed within bins |
| **Per-feature partial dependence on CATE** | Which features drive heterogeneity? |

#### When CATE estimation isn't worth it

| Setting | Why |
|---|---|
| Small sample (< 1000) | Heterogeneity hard to detect |
| Effect is small overall | CATE estimates noisy |
| Stakeholders want one number | ATE may suffice |
| Cost of personalization > gains | Operational complexity |

#### Decision tree

```
Have RCT data?
├─ Yes
│   ├─ Want CATE per user/segment        → Causal Forest / X-learner
│   ├─ Just ATE                            → t-test / regression
│   └─ Targeting strategy                  → Uplift model + Qini eval
└─ No (observational)
    ├─ Conditional ignorability plausible → DML / Causal Forest with rich X
    ├─ Need CIs                             → DoubleML
    ├─ Strong unmeasured confounding       → IV / RDD / DiD instead
    └─ Time-varying treatment              → G-methods / TMLE
```

**Rule of thumb:** **CATE estimation = personalized treatment effects**. Modern stack: **DoubleML / Causal Forests with cross-fitting**. **X-learner** when treatment is imbalanced; **R-learner / DML** for orthogonal estimation. **All confounders must be observed** (same as PSM) — validate via sensitivity analysis. Evaluate with **Qini curves**, not standard ML metrics. Use **EconML** as the comprehensive Python library.
