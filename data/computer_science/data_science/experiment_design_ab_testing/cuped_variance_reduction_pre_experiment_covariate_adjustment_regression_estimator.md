### CUPED (Controlled-experiment Using Pre-Experiment Data — variance reduction)

**When:** A/B testing with **pre-experiment data** available for each user — pre-period spend, prior-week sessions, baseline conversion. CUPED uses that covariate to reduce metric variance and **cut required sample size 30–60%** without changing your randomization. Default at FAANG-scale experimentation.

**Schema:**

| Concept | Detail |
|---|---|
| **Y** | Experiment metric (revenue, sessions, etc.) during the experiment |
| **X** | Pre-experiment covariate **strongly correlated with Y** (often the same metric in a pre-period) |
| **Adjusted Y** | `Y_cuped = Y − θ · (X − X̄)` where `θ = Cov(X, Y) / Var(X)` (OLS slope) |
| Variance | `Var(Y_cuped) = Var(Y) · (1 − ρ²)` where `ρ = Corr(X, Y)` |
| Power gain | If `ρ = 0.7`, variance drops 49%; if `ρ = 0.9`, drops 81% |

> **CUPED = pre-treatment covariate adjustment for an A/B test.** Equivalent to ANCOVA / regression-based difference-in-means.

#### The math (one paragraph)

Standard A/B test compares mean of `Y_T` and `Y_C`. CUPED replaces each user's `Y` with `Y_cuped = Y − θ(X − X̄)`, where:

- `X` = pre-period covariate (same scale as Y).
- `θ` = OLS regression slope `Cov(X, Y) / Var(X)`, computed from **the entire experiment** (pooled across arms).
- `X̄` = pooled mean of X.

Because `X` is **pre-treatment**, it's independent of treatment assignment, so subtracting `θ(X − X̄)` doesn't bias the treatment effect — but it removes between-user variance that came from baseline differences.

#### Implementation

```python
import numpy as np

def cuped_adjust(Y, X):
    """Apply CUPED. Y and X are arrays per user, pooled across arms."""
    theta = np.cov(X, Y, ddof=1)[0, 1] / np.var(X, ddof=1)
    return Y - theta * (X - np.mean(X)), theta

# Compute treatment effect on adjusted metric
Y_T_adj, _    = cuped_adjust(Y_T, X_T)
Y_C_adj, _    = cuped_adjust(Y_C, X_C)
# Note: in practice θ is computed POOLED, not per arm:
Y_all = np.concatenate([Y_T, Y_C])
X_all = np.concatenate([X_T, X_C])
theta = np.cov(X_all, Y_all, ddof=1)[0, 1] / np.var(X_all, ddof=1)
Y_T_adj = Y_T - theta * (X_T - X_all.mean())
Y_C_adj = Y_C - theta * (X_C - X_all.mean())

# Now run a standard t-test on adjusted Y
from scipy import stats
t, p = stats.ttest_ind(Y_T_adj, Y_C_adj, equal_var=False)
```

#### Choosing the covariate `X`

| Choice | Effect |
|---|---|
| **Same metric in pre-period** | Strongest correlation; default (e.g., revenue last 30d → revenue this period) |
| Different but related metric | Useful when same metric in pre-period is unavailable |
| Multiple covariates (multivariate CUPED) | Use OLS with multiple X; further variance reduction |
| User-level demographic | Often weak correlation; little gain |
| **Categorical (one-hot)** | Stratification, less variance reduction than continuous |
| Binary indicator (active vs inactive) | Roughly equivalent to stratification |

> Best `X` = strongest predictor of `Y` from data **observable before the experiment starts**.

#### Sample-size impact

If `ρ = Corr(X, Y)`:

| ρ | Variance reduction | Effective sample-size multiplier |
|---|---|---|
| 0.3 | 9% | 1.10× |
| 0.5 | 25% | 1.33× |
| **0.7** | **49%** | **1.96×** |
| 0.8 | 64% | 2.78× |
| 0.9 | 81% | 5.26× |

> A `ρ = 0.7` covariate halves required sample size — **two experiments in the time of one**.

#### Variants & extensions

| Variant | What |
|---|---|
| **Multivariate CUPED** | Multiple X covariates via OLS — combine pre-period metric, demographics, etc. |
| **CUPED++ / Random Forest CUPED** | Replace linear `θ` with a non-linear ML model |
| **Doubly robust CUPED** | Combine outcome model with propensity adjustment |
| **MLRATE** (ML Regression-Adjusted Treatment Effect) | OLS or ML predictor + cross-fit |
| **Stratified CUPED** | Apply CUPED within strata for further variance reduction |

#### When CUPED helps less

| Situation | Why |
|---|---|
| No pre-period data | Can't compute X |
| Pre-period covariate weakly correlated | Marginal gain |
| Outcome dominated by treatment-induced variance | Most variance is post-treatment, not baseline |
| Brand-new users (no history) | No X available — segment them out or use proxies |
| Sparse outcomes (most Y = 0) | Variance comes from rare events, not baseline level |

#### CUPED ≠ matching

| CUPED | Propensity-score matching |
|---|---|
| **Randomized** experiment | **Observational** study |
| Adjusts for pre-period covariate | Adjusts for confounders to mimic randomization |
| Reduces variance | Reduces bias |
| `Y_cuped = Y − θ(X − X̄)` | Match treated to similar control by P(T \| X) |

> CUPED is for **better-powered RCTs**. Matching is for **emulating an RCT** without one. Different problems.

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Computing `θ` separately per arm | **Pool across arms** — using treatment data biases `θ` |
| Using a post-treatment covariate | Must be **pre-experiment** (otherwise you're adjusting for outcomes) |
| `θ` computed on too small a sample | Estimate variance of `θ` itself becomes noisy |
| Using `X` correlated with treatment | If `X` is post-randomization, it can be biased — pre-experiment only |
| Reporting CUPED-adjusted lift but unadjusted CI | Use the **adjusted** SE for both |
| Comparing pre-CUPED and post-CUPED p-values | They're answering different power questions; pick a paradigm |
| Only one covariate when many helpful | Use multivariate CUPED if available |

#### Worked example (impact)

You're testing a homepage redesign. Primary metric: **revenue per user (next 14 days)**. Without CUPED, MDE = $5 lift requires `n = 30,000` per arm. With pre-period 14-day revenue (`ρ ≈ 0.7`), variance drops 49% → MDE achievable with `n ≈ 15,000`. Effectively **doubling throughput** of your experimentation platform.

#### Connection to ANCOVA

CUPED is a special case of **ANCOVA** (analysis of covariance). The classical ANCOVA form `Y ~ Treatment + X` gives the same treatment-effect estimator and SE as CUPED with a single covariate — same idea, different framing. ANCOVA assumes treatment effect is constant across X (no interaction); CUPED inherits this assumption.

#### Code template (production)

```python
def cuped_ate(Y, X, T):
    """Estimate ATE using CUPED. Y, X, T are arrays per user."""
    theta = np.cov(X, Y, ddof=1)[0, 1] / np.var(X, ddof=1)
    Y_adj = Y - theta * (X - np.mean(X))

    treated = T == 1; control = T == 0
    ate = np.mean(Y_adj[treated]) - np.mean(Y_adj[control])
    se = np.sqrt(np.var(Y_adj[treated], ddof=1) / treated.sum()
                + np.var(Y_adj[control], ddof=1) / control.sum())
    z = ate / se
    p = 2 * (1 - stats.norm.cdf(abs(z)))
    return ate, se, p
```

**Rule of thumb:** **CUPED = pre-experiment covariate regression adjustment**. **`Y_cuped = Y − θ·(X − X̄)`** with `θ` from pooled OLS. Variance drops by **`ρ²`**. With `ρ = 0.7`, sample-size requirement **halves**. Always **pool across arms** to compute `θ`. Best covariate is usually the **same metric measured in the pre-period**. Default tool at any experimentation platform serving > 100 tests/year.
