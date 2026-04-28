### Instrumental Variables (IV — endogeneity, 2SLS, LATE, exclusion restriction)

**When:** estimate a causal effect when **treatment is endogenous** — correlated with unobserved factors that also affect the outcome. Standard regression / matching is biased; IV bypasses the endogeneity by isolating the part of treatment variation driven by something **as-good-as-random**. Used for: economic policy, randomized encouragement designs, Mendelian randomization, "natural experiments".

**Schema:**

| Concept | Detail |
|---|---|
| **Treatment** `T` | Possibly endogenous |
| **Outcome** `Y` | What we want the causal effect on |
| **Instrument** `Z` | A variable affecting `T` but **not** `Y` directly |
| **Endogeneity** | `Cov(T, ε) ≠ 0` — treatment correlated with unobserved error |
| **Exclusion restriction** | `Z` affects `Y` **only through** `T` |
| **Relevance** | `Cov(Z, T) ≠ 0` (instrument actually predicts treatment) |
| **Monotonicity** | `Z` moves `T` in the same direction for all units (no defiers) |

> **Three IV assumptions: relevance, exclusion, monotonicity.** Identifies the **Local Average Treatment Effect (LATE)** — the effect on units whose treatment was changed by the instrument (compliers).

#### The simplest IV (2SLS — two-stage least squares)

| Stage | Action |
|---|---|
| **First stage** | Regress `T` on `Z` (and any controls `X`); obtain fitted `T̂` |
| **Second stage** | Regress `Y` on `T̂` (and `X`); coefficient on `T̂` is the IV estimate |

```python
import statsmodels.api as sm

# First stage: T ~ Z + X
first = sm.OLS(T, sm.add_constant(np.column_stack([Z, X]))).fit()
T_hat = first.predict()

# Second stage: Y ~ T̂ + X
second = sm.OLS(Y, sm.add_constant(np.column_stack([T_hat, X]))).fit()
beta_iv = second.params[1]                    # coefficient on T̂
```

> **Don't compute SEs from the second stage manually** — they're wrong. Use `linearmodels.iv.IV2SLS` for proper SEs.

```python
from linearmodels.iv import IV2SLS

# Y ~ exog + [endog ~ instrument]
res = IV2SLS(Y, exog=sm.add_constant(X), endog=T, instruments=Z).fit()
print(res.summary)
```

#### IV identification — what it gives you

| Estimand | Definition |
|---|---|
| **ATE** | `E[Y₁ − Y₀]` — average effect over **all** units |
| **ATT** | `E[Y₁ − Y₀ | T = 1]` — effect on the **treated** |
| **LATE** | `E[Y₁ − Y₀ | complier]` — effect on **compliers** (units whose treatment was changed by Z) |

> IV identifies **LATE**, not ATE. The two coincide only under (strong) homogeneity. Be explicit about which estimand you're reporting.

#### Compliers, always-takers, never-takers, defiers

For a binary instrument `Z` (e.g., randomized assignment) and binary treatment `T`:

| Type | Behavior |
|---|---|
| **Compliers** | T = Z (took treatment iff assigned) |
| **Always-takers** | T = 1 regardless of Z |
| **Never-takers** | T = 0 regardless of Z |
| **Defiers** | T = 1 − Z (treatment **opposite** of assignment) |

> **Monotonicity rules out defiers.** Reasonable in most natural experiments; violated when Z's effect on T differs across subgroups.

#### Standard IV examples

| Setting | Treatment T | Instrument Z | Why Z is plausible |
|---|---|---|---|
| Effect of education on earnings | Years of schooling | Compulsory-schooling-law change | Law affects T but not directly earnings |
| Effect of military service on income | Veteran status | Vietnam draft lottery | Lottery affects service randomly |
| Effect of family size on labor supply | Number of children | Twin birth | Twins randomly increase family size |
| Effect of breastfeeding on health | Breastfeeding | Hospital lactation policy | Policy affects T, plausibly not direct on outcome |
| Encouragement design | Treatment uptake | Random assignment to receive offer | Standard intent-to-treat + IV |
| Mendelian randomization (epidemiology) | Behavior (e.g., alcohol) | Genetic variant | Genes affect T but inherited at random |
| App rollout encouragement | Push-notification | Notification timing | Random nudge ↑ uptake but doesn't affect Y directly |
| Quarter-of-birth (Angrist-Krueger) | Schooling | Quarter of birth | Birth quarter affects required schooling years |

#### Strong vs weak instruments

| Diagnostic | Threshold |
|---|---|
| **First-stage F-statistic on instrument** | > 10 (rough rule, Stock-Yogo) |
| **Stock-Yogo critical values** | Use exact tables for bias / size guarantees |
| **Anderson-Rubin test** | Robust to weak instruments |
| **Conditional likelihood ratio (CLR) test** | Better than 2SLS-z for weak IV |

> **Weak instruments are catastrophic** — IV estimate is biased toward OLS, SEs are too small, inference is unreliable. **Always report first-stage F**.

#### Encouragement design (the cleanest IV)

| Step | Action |
|---|---|
| 1 | Randomize encouragement (instrument) but not actual treatment |
| 2 | Some users comply (take treatment when encouraged) |
| 3 | IV gives effect of treatment **on compliers** |

```
Z (random encouragement) → T (treatment uptake) → Y (outcome)
```

> Used at FAANG when you can't force treatment but can randomize a nudge: **random push-notification → app open → engagement metric**. IV is just `(Y_T − Y_C) / (T_T − T_C)` in the binary case (Wald estimator).

#### Wald estimator (binary IV, binary T)

`τ̂_LATE = (E[Y | Z=1] − E[Y | Z=0]) / (E[T | Z=1] − E[T | Z=0])`

> **Numerator** = ITT (intent-to-treat) effect; **denominator** = compliance rate. IV inflates ITT by the inverse of compliance.

#### Multiple instruments

| Setup | Method |
|---|---|
| 1 endogenous T, multiple Z | 2SLS combines them |
| Multiple endogenous T's | Need ≥ 1 instrument **per** endogenous variable |
| Over-identified | More Z's than needed → can test exclusion restriction (Sargan / Hansen J test) |

#### IV vs alternatives

| Method | When | Identifies |
|---|---|---|
| **RCT** | Can randomize treatment | ATE |
| **PSM / IPW** | All confounders observed | ATE / ATT |
| **DiD** | Parallel trends | ATT |
| **RDD** | Treatment by threshold | LATE at threshold |
| **IV** | Exogenous instrument | LATE on compliers |
| **Synthetic control** | Single treated unit, panel | ATT |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Weak instrument (F < 10) | Find better instrument; report Anderson-Rubin |
| Manually computing 2SLS SEs | Use `linearmodels.iv.IV2SLS` for correct SEs |
| Treating IV estimate as ATE | It's **LATE** unless effects are homogeneous |
| Exclusion restriction violated (Z affects Y directly) | Find a different Z; can't test directly |
| Monotonicity violated | LATE not identified; rare to detect |
| Confusing IV and proxy variable | Proxy substitutes for missing variable; IV addresses endogeneity differently |
| "Just-identified" overconfidence | Only over-identified IV lets you test exclusion (Sargan); just-identified can't |
| Including instrument in second stage | Defeats the purpose; only `T̂` and controls go in second stage |
| Many weak instruments | LIML, JIVE more robust than 2SLS |

#### Validity tests

| Test | What it checks |
|---|---|
| **First-stage F** | Relevance |
| **Sargan / Hansen J** (over-identified only) | Joint validity of multiple instruments |
| **Exclusion** | Untestable directly; argued from theory / domain |
| **Monotonicity** | Untestable directly; usually argued |
| **Anderson-Rubin** | Inference robust to weak instruments |

> The **exclusion restriction is fundamentally untestable** with one instrument. You argue it from domain knowledge, then explore robustness.

#### Reduced form vs first stage vs IV

| Quantity | Definition |
|---|---|
| **Reduced form** | `Y` regressed on `Z` (and `X`) — total effect of instrument on outcome |
| **First stage** | `T` regressed on `Z` (and `X`) — effect of instrument on treatment |
| **IV / 2SLS** | Reduced form / first stage — effect of treatment on outcome |

> Always **report all three** for transparency. If reduced form is null but IV is significant, you've over-leveraged a weak first stage.

#### Code (linearmodels)

```python
import pandas as pd
from linearmodels.iv import IV2SLS

# Y ~ T (endog) + X (controls), instrument = Z
res = IV2SLS.from_formula(
    "Y ~ 1 + X + [T ~ Z]", data=df
).fit(cov_type="robust")

print(res.summary)
print(res.first_stage)              # first-stage diagnostics, F-stat
print(res.wooldridge_overid)        # over-id test if applicable
```

#### Heterogeneous effects (LATE vs ATE)

| Scenario | LATE = ATE? |
|---|---|
| Effect homogeneous across units | Yes |
| Effect heterogeneous, compliers representative | Approximately |
| Compliers very different from population | **No** — LATE may be far from ATE |

> Check by comparing complier characteristics to population characteristics (Angrist-Imbens, "characterizing compliers").

#### Mendelian randomization (epidemiology)

Genetic variants as instruments for behaviors / exposures:

| Component | Role |
|---|---|
| Z | SNP (genetic variant) |
| T | Modifiable exposure (alcohol, BMI) |
| Y | Outcome (heart disease, etc.) |

> Inheritance is essentially random at conception → Z is exogenous. Limitations: pleiotropy (gene affects Y through other paths) violates exclusion.

**Rule of thumb:** **IV requires three assumptions: relevance, exclusion, monotonicity**. **First-stage F > 10** is mandatory; weak instruments produce nonsense. **IV identifies LATE** (effect on compliers), not ATE — be explicit. **Always report** first stage, reduced form, and IV separately. Use **`linearmodels.iv.IV2SLS`** for proper SEs. The exclusion restriction is **untestable in just-identified models** — argue it from domain knowledge.
