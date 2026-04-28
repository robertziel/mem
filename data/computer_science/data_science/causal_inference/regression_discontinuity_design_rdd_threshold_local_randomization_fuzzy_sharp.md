### Regression Discontinuity Design (RDD — threshold, local randomization, fuzzy / sharp)

**When:** treatment is assigned by a **deterministic cutoff** on a continuous "running variable" — student passing a test cutoff, age-based eligibility, vote-share threshold for office, credit-score cutoff for loans, sale-volume threshold for promotions. RDD compares units **just above and just below** the threshold, where assignment is essentially as-good-as-random.

**Schema:**

| Concept | Detail |
|---|---|
| **Running variable** `X` | Continuous score determining treatment |
| **Cutoff** `c` | Threshold value |
| **Treatment** `T` | `T = 1` if `X ≥ c` (sharp) or `T = f(X ≥ c)` (fuzzy) |
| **LATE at cutoff** | Causal effect for units near `X = c` |
| Identifying assumption | **Continuity** of potential outcomes at `c` (no other change at the cutoff) |

> Logic: just above and just below the cutoff, units differ by trivial amounts of `X` but **massively** in treatment status. The treatment effect "jumps" at `c` if it's real.

#### Sharp vs fuzzy RDD

| Variant | Treatment rule |
|---|---|
| **Sharp** | `T = 1` iff `X ≥ c` (deterministic) |
| **Fuzzy** | `P(T = 1 | X)` jumps at `c` but isn't 0/1 (probabilistic) |

#### Sharp RDD — the simplest

For each unit `i`, observe outcome `Y_i` and running variable `X_i`. Treatment is `T_i = 𝟙[X_i ≥ c]`.

**Effect at cutoff:**

`τ_RDD = lim_{x↘c} E[Y | X = x] − lim_{x↗c} E[Y | X = x]`

> The **jump in expected outcome** at the cutoff. Estimated by fitting two regressions (one each side of `c`) and taking the difference at `c`.

#### Local linear regression — the standard estimator

```python
import numpy as np
import statsmodels.api as sm

def sharp_rdd(X, Y, cutoff, bandwidth, kernel="triangular"):
    # Window of bandwidth h around cutoff
    in_window = np.abs(X - cutoff) <= bandwidth
    X_w, Y_w = X[in_window], Y[in_window]
    above = (X_w >= cutoff).astype(int)
    centered = X_w - cutoff

    # Triangular weights (give more weight near cutoff)
    if kernel == "triangular":
        weights = 1 - np.abs(centered) / bandwidth
    else:
        weights = np.ones_like(centered)

    # Y ~ above + centered + above*centered
    design = sm.add_constant(np.column_stack([above, centered, above * centered]))
    wls = sm.WLS(Y_w, design, weights=weights).fit()
    return wls.params[1], wls                        # coefficient on `above`
```

> **Local linear** (linear on each side of cutoff) is the standard choice. Avoid global high-order polynomials — they over-fit and bias the estimate.

#### Fuzzy RDD — IV at the cutoff

When treatment isn't deterministic at the cutoff (some "compliers" cross, some don't), use the cutoff as an **instrument**:

| Quantity | Estimator |
|---|---|
| **First stage**: jump in `T` at `c` | `lim_{x↘c} E[T] − lim_{x↗c} E[T]` |
| **Reduced form**: jump in `Y` at `c` | `lim_{x↘c} E[Y] − lim_{x↗c} E[Y]` |
| **Fuzzy RDD** = Wald estimator | Reduced form / first stage |

```python
# Fuzzy RDD via 2SLS
from linearmodels.iv import IV2SLS

df["above"] = (df["X"] >= cutoff).astype(int)
df["centered"] = df["X"] - cutoff
res = IV2SLS.from_formula(
    "Y ~ 1 + centered + [T ~ above]", data=df[df["X"].between(cutoff - h, cutoff + h)]
).fit(cov_type="robust")
```

> Identifies **LATE at cutoff** for compliers (units whose treatment status switched because `X ≥ c`).

#### Bandwidth selection

| Method | What |
|---|---|
| **MSE-optimal (Imbens-Kalyanaraman)** | Minimizes asymptotic MSE — default |
| **Imbens-Kalyanaraman 2012** | Updated formula |
| **Calonico-Cattaneo-Titiunik (CCT)** | Robust bias-corrected; standard now |
| **Cross-validation** | Pick `h` minimizing CV-MSE |
| **Visual / sensitivity** | Try several bandwidths; results should be stable |

```python
from rdrobust import rdrobust
res = rdrobust(y=Y, x=X, c=cutoff, kernel="triangular")
print(res)        # bandwidth, point estimate, robust SE
```

> **`rdrobust` (Calonico-Cattaneo-Titiunik)** is the modern standard — handles bandwidth selection, bias correction, robust inference automatically.

#### Visual diagnostics

| Plot | Purpose |
|---|---|
| **Binned scatter** of Y vs X | The "RDD plot" — shows the jump |
| **First-stage plot** (fuzzy) | Treatment uptake vs running variable |
| **Density of X near cutoff** | Manipulation check — should be smooth |
| **Covariate balance** above vs below cutoff | Pre-cutoff covariates shouldn't jump |

```python
# Binscatter Y vs X with fitted lines
import matplotlib.pyplot as plt
df["bin"] = pd.cut(df["X"], bins=40)
df.groupby("bin")[["X", "Y"]].mean().plot.scatter("X", "Y")
plt.axvline(cutoff, color="red", linestyle="--")
```

#### McCrary density test (manipulation check)

If units **manipulate** their `X` to be on the desired side of cutoff (sorting), the running-variable density will jump at `c` — invalidating RDD.

```python
from rdd import RDD
mc = RDD.density_test(X, cutoff)
# Reject if p < 0.05 → manipulation present
```

| Setting | Manipulation risk |
|---|---|
| Test scores graded by humans, scores near pass cutoff | High (graders may bump up) |
| Birth dates, age cutoff for school | Low (can't change birthdate) |
| Vote share | Low |
| Income for benefit eligibility | Possible (under-reporting) |

> If McCrary fails, RDD assumption is violated — **find another method or argue why manipulation is innocuous**.

#### Continuity check on covariates

| Check | What |
|---|---|
| Plot pre-treatment covariates `W` vs `X` | Should be smooth at cutoff |
| Run RDD on `W` as outcome | Should give 0 jump |
| Failure → | Cutoff likely correlated with other treatments / selection |

#### Bandwidth sensitivity

| Result | Interpretation |
|---|---|
| Estimate stable across bandwidths (50%, 100%, 200% of h_optimal) | Robust |
| Estimate flips sign / changes magnitude with h | RDD assumption may be violated |

> Always report **bandwidth-sensitivity table**.

#### When RDD applies (real examples)

| Setting | X (running var) | Cutoff | Effect estimated |
|---|---|---|---|
| Effect of college acceptance | Test score | Admission cutoff | Earnings later |
| Effect of medical treatment | Disease severity score | Eligibility threshold | Mortality |
| Effect of drinking age | Age | 21 | Mortality, health |
| Effect of incumbency | Vote share | 50% | Re-election rate |
| Effect of class size | Enrollment | Maimonides rule (40 students) | Test scores |
| Effect of credit | Credit score | Approval cutoff | Default rate |
| Effect of tax bracket | Income | Bracket boundary | Reported income |
| Effect of school start | Birthdate | Cutoff date | Long-term outcomes |
| Effect of disability benefits | Disability score | Approval cutoff | Labor supply |
| Effect of customer reward | Spend tier threshold | Tier cutoff | Subsequent spend |

#### RDD vs alternatives

| Method | When |
|---|---|
| **RDD** | Sharp threshold-based assignment |
| **DiD** | Pre/post + treated/control |
| **PSM / IPW** | Rich observational covariates |
| **IV** | Exogenous instrument exists |
| **RCT** | Randomization possible |

> RDD's strength: **highly credible identification near the cutoff**. Weakness: **only LATE at cutoff**, not over the full population.

#### External validity caveat

RDD identifies the effect **at the cutoff** — for units near `X = c`. Effects for units far from the cutoff may be very different. **Don't extrapolate**.

> "The effect of admission on earnings for borderline applicants" ≠ "the effect of admission on average".

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Global polynomial regression (cubic, quartic) | Use **local linear** with bandwidth |
| Ignoring manipulation of running variable | McCrary density test |
| Single bandwidth without sensitivity check | Show estimates across bandwidth grid |
| Using narrow window without checking sample size | Need adequate data near cutoff |
| Treating fuzzy RDD as sharp | Use IV (Wald estimator) instead |
| Not testing covariate continuity | Pre-cutoff covariates should be smooth |
| Multiple cutoffs but pooling | Estimate per cutoff, then pool with care |
| Reporting RDD as ATE | It's LATE at cutoff |
| Using RDD when there's no real cutoff | "Sort-of cutoff" doesn't work — must be deterministic |

#### Sharp RDD — quick recipe

```python
from rdrobust import rdrobust, rdplot

# Visual
rdplot(y=Y, x=X, c=cutoff, kernel="triangular")

# Estimation with optimal bandwidth + robust inference
res = rdrobust(y=Y, x=X, c=cutoff,
               kernel="triangular", bwselect="mserd")
print(f"Effect: {res.coef[0, 0]:.4f} ± {res.se[0, 0]:.4f}")
```

#### Donut RDD (handle near-cutoff anomalies)

If observations within `±δ` of cutoff are problematic (e.g., manipulation), exclude them and estimate on the "donut":

```python
df_donut = df[(df["X"] - cutoff).abs() > delta]
```

> Trade-off: removes the most informative observations; check sensitivity to `δ`.

**Rule of thumb:** **RDD requires a deterministic cutoff** on a continuous running variable. Use **local linear regression** with **MSE-optimal bandwidth**. Run **McCrary density test** for manipulation, **plot covariate continuity**, and report **bandwidth sensitivity**. Identifies **LATE at the cutoff**, not ATE. **`rdrobust`** package is the modern standard. Avoid global polynomials — they bias the estimate.
