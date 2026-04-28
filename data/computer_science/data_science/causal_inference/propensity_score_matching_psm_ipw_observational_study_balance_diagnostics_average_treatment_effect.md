### Propensity Score Matching (PSM) + IPW (observational study, balance, ATE)

**When:** estimate the **causal effect** of a treatment from **observational data** where you couldn't randomize — was a feature rollout responsible for revenue lift, did a marketing campaign drive purchases, did joining a program improve retention. PSM/IPW emulate randomization by balancing covariates between treated and control.

**Schema:**

| Concept | Detail |
|---|---|
| **Treatment** `T ∈ {0, 1}` | Whether a unit got the intervention |
| **Outcome** `Y` | Metric of interest |
| **Covariates** `X` | Features that affect both `T` and `Y` (confounders) |
| **Propensity score** `e(X) = P(T = 1 | X)` | Probability of treatment given covariates |
| **ATE** | `E[Y₁ − Y₀]` — average treatment effect |
| **ATT** | `E[Y₁ − Y₀ | T = 1]` — effect on the treated |
| Key assumption | **Conditional ignorability** + positivity — `(Y₀, Y₁) ⊥ T | X` and `0 < e(X) < 1` |

> **PSM and IPW require all confounders to be observed** (no unmeasured confounding). They handle observed bias, not hidden bias.

#### Why propensity scores work

> **Rosenbaum-Rubin theorem (1983):** if `(Y₀, Y₁) ⊥ T | X` (no unmeasured confounders), then `(Y₀, Y₁) ⊥ T | e(X)`. Conditioning on the **scalar** propensity score is enough to remove confounding from `X`.

You don't need to balance every covariate — just the propensity. Massive dimensionality win.

#### Workflow

| Step | Action |
|---|---|
| 1. Specify confounders `X` | Include anything affecting both T and Y |
| 2. Estimate `e(X)` | Logistic regression / GBM / random forest |
| 3. Check overlap | Plot propensity histograms by group; trim if non-overlapping |
| 4. Apply matching / weighting | PSM, IPW, or doubly-robust |
| 5. Check balance | Standardized mean differences across covariates |
| 6. Estimate effect | Differences in matched/weighted outcomes |
| 7. Sensitivity analysis | What unmeasured confounding would erase the effect? |

#### Estimating propensity

```python
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier

# Logistic regression (default)
ps_model = LogisticRegression(max_iter=1000)
ps_model.fit(X, T)
e_X = ps_model.predict_proba(X)[:, 1]

# Boosted trees (better balance, less interpretable)
ps_model = GradientBoostingClassifier(max_depth=3, n_estimators=200)
ps_model.fit(X, T)
e_X = ps_model.predict_proba(X)[:, 1]
```

> **GBM-based propensity scores** typically achieve better balance than logistic regression but are harder to interpret. Pick by your audience.

#### Method 1 — Propensity Score Matching (PSM)

For each treated unit, find the closest control by propensity score:

```python
from sklearn.neighbors import NearestNeighbors

treated = df[df["T"] == 1]
control = df[df["T"] == 0]

nn = NearestNeighbors(n_neighbors=1).fit(control[["e_X"]])
distances, indices = nn.kneighbors(treated[["e_X"]])
matched_control = control.iloc[indices.flatten()]

ate = treated["Y"].mean() - matched_control["Y"].mean()
```

| Variant | What |
|---|---|
| **1:1 nearest neighbor** | One control per treated; simplest |
| **k:1 (k > 1)** | More controls per treated; less variance, possible bias |
| **Caliper matching** | Reject matches where propensity diff > threshold (e.g., 0.05) |
| **Mahalanobis matching** | Match on covariate distance, not just propensity |
| **Optimal matching** | Globally minimize total distance; uses LP |
| **With or without replacement** | With replacement = better matches; without = simpler |

> **Caliper of 0.2 SDs of logit propensity** is a common default to avoid bad matches.

#### Method 2 — Inverse Propensity Weighting (IPW)

Re-weight observations so that treated and control look like the same population:

```python
import numpy as np

# Stabilize by overall treatment rate
p_T = df["T"].mean()
df["weight"] = np.where(df["T"] == 1,
                        p_T / df["e_X"],
                        (1 - p_T) / (1 - df["e_X"]))

# Stabilized IPW estimator of ATE
ate = (
    np.average(df.loc[df["T"]==1, "Y"], weights=df.loc[df["T"]==1, "weight"]) -
    np.average(df.loc[df["T"]==0, "Y"], weights=df.loc[df["T"]==0, "weight"])
)
```

| Variant | When |
|---|---|
| **Plain IPW** | `1 / e(X)` for treated, `1 / (1 − e(X))` for control |
| **Stabilized IPW** | Multiply by overall treatment rate — reduces variance |
| **Trimmed IPW** | Drop or cap weights > some threshold (e.g., 99th percentile) |
| **Truncated** | Replace extreme weights with capped values |

> Extreme propensity scores (near 0 or 1) → enormous weights → unstable estimates. **Always check weight distribution.**

#### Method 3 — Doubly Robust (AIPW)

Combine **outcome regression** with **propensity weighting**:

`τ̂_AIPW = mean[(T·Y − (T − e(X))·μ̂₁(X)) / e(X)] − mean[((1−T)·Y + (T − e(X))·μ̂₀(X)) / (1−e(X))]`

| Property | Detail |
|---|---|
| **Doubly robust** | Consistent if **either** outcome model **or** propensity model is correctly specified |
| **Cross-fitting** (Chernozhukov et al.) | Train models on different folds to reduce overfitting bias |
| **Targeted maximum likelihood (TMLE)** | A specific doubly-robust estimator |

> AIPW + cross-fit ML for both `e(X)` and `μ_t(X)` is the modern gold standard.

#### Balance check (after matching/weighting)

For each covariate `X_j`, compute the **standardized mean difference (SMD)** between treated and control:

`SMD = (X̄_treated − X̄_control) / √((s²_treated + s²_control) / 2)`

| SMD | Interpretation |
|---|---|
| ≤ 0.1 | **Balanced** (target) |
| 0.1–0.2 | Borderline |
| > 0.2 | **Imbalanced** — refit propensity model with more flexibility |

```python
def smd(treated, control, col):
    return (treated[col].mean() - control[col].mean()) / np.sqrt(
        (treated[col].var() + control[col].var()) / 2)

# Plot SMD before vs after matching for every covariate (Love plot)
```

> **Always show a Love plot** of SMDs before vs after adjustment. Stakeholders trust the picture more than a single number.

#### Overlap / positivity diagnostic

Histogram of `e(X)` by treatment group. Both should have density across the same range.

| Diagnostic | Implication |
|---|---|
| **Overlap is good** | Causal effect is identifiable from data |
| **Treated has propensities near 0** | Some treated units have no comparable controls — **trim them** |
| **Control has propensities near 1** | Mirror problem |
| **Severe non-overlap** | Causal effect not identified — your data can't answer the question |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| **Forgetting unmeasured confounders** | PSM only handles **observed** confounding — quantify sensitivity to hidden bias |
| Including post-treatment variables in `X` | Blocks part of the causal effect — controllers must be **pre-treatment** |
| Including instruments / colliders | Can introduce bias (M-bias, collider bias) — use a DAG to decide |
| Reporting unmatched standard errors | Matched data needs **clustered or robust** SEs |
| Skipping balance check | The whole point is balance — verify |
| Extreme weights with IPW | Trim / stabilize / truncate |
| Same data for propensity model and outcome | Use cross-fitting for AIPW |
| Treating PSM as RCT-equivalent | Stronger assumptions; report sensitivity |
| Confusing ATE and ATT | Pick by question: "what if everyone got it?" (ATE) vs "what was the effect on those who got it?" (ATT) |

#### Sensitivity analysis (Rosenbaum bounds, E-values)

Quantify how strong an unmeasured confounder would have to be to nullify the result:

| Method | What it asks |
|---|---|
| **Rosenbaum bounds** | "What odds ratio of treatment given unmeasured confounder would erase significance?" |
| **E-value** | Minimum strength of association between confounder and both T and Y to explain away effect |
| **Tipping point** | Effect size of confounder that flips conclusion |

> **Always report sensitivity** alongside causal estimates from observational data. "Effect persists unless an unmeasured confounder has E-value > 2" is much stronger than just a point estimate.

#### When NOT to use PSM/IPW

| Situation | Use instead |
|---|---|
| **Randomized experiment available** | Just analyze the RCT — PSM is unnecessary |
| **Time-varying treatment** | Marginal structural models / G-methods |
| **Strong unmeasured confounding** | Instrumental variables (if instrument available) |
| **Threshold-based assignment** | Regression discontinuity |
| **Sharp policy change** | Difference-in-differences |
| **Network / interference** | Specialized methods (cluster, time-staggered DID) |

#### PSM vs DiD vs IV vs RDD (full causal toolkit)

| Method | Identifying assumption | Use when |
|---|---|---|
| **RCT** | Randomization | You can randomize |
| **PSM / IPW** | No unmeasured confounders | Rich observational covariates |
| **DiD** | Parallel trends | Pre-treatment period available |
| **IV** | Instrument affects T but not Y directly | Have a valid instrument |
| **RDD** | Continuity at threshold | Treatment assigned by cutoff |
| **Synthetic control** | Pre-period match implies post-period match | Single treated unit, panel data |

#### Code (clean pipeline)

```python
import pandas as pd, numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import NearestNeighbors

def psm_ate(df, treatment_col, outcome_col, covariates, caliper=0.05):
    # 1. Estimate propensity
    X = df[covariates]; T = df[treatment_col]
    e_X = LogisticRegression(max_iter=1000).fit(X, T).predict_proba(X)[:, 1]
    df = df.assign(e_X=e_X, logit_ps=np.log(e_X / (1 - e_X)))

    # 2. Trim non-overlap (top/bottom 1% of propensities)
    lo, hi = np.quantile(e_X, [0.01, 0.99])
    df = df[(df["e_X"] >= lo) & (df["e_X"] <= hi)]

    # 3. 1:1 caliper matching
    treated = df[df[treatment_col] == 1].reset_index(drop=True)
    control = df[df[treatment_col] == 0].reset_index(drop=True)
    nn = NearestNeighbors(n_neighbors=1).fit(control[["logit_ps"]])
    dist, idx = nn.kneighbors(treated[["logit_ps"]])
    keep = dist.flatten() < caliper
    matched_treated = treated[keep]
    matched_control = control.iloc[idx.flatten()[keep]]

    # 4. ATE estimate
    ate = matched_treated[outcome_col].mean() - matched_control[outcome_col].mean()
    se = np.sqrt(matched_treated[outcome_col].var() / len(matched_treated)
               + matched_control[outcome_col].var() / len(matched_control))
    return ate, se, len(matched_treated)
```

**Rule of thumb:** **PSM/IPW emulate an RCT from observational data** — only valid when **all confounders are observed**. **Estimate propensity with logistic regression or GBM**, then **match (PSM)** or **reweight (IPW)**. Always **check covariate balance** (SMD ≤ 0.1) and **overlap** (propensity histograms). For ML-flavored modern causal inference, use **AIPW + cross-fitting**. **Always report sensitivity to unmeasured confounding** — a point estimate without it is suspect.
