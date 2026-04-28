### Difference-in-Differences (DiD — parallel trends, quasi-experiment, two-way fixed effects)

**When:** estimate the causal effect of a **policy change / intervention / feature rollout** that affects some units (treatment group) while not affecting others (control group), using **before/after data** for both. The workhorse of causal inference in economics, policy, and modern tech experiments where randomization isn't feasible.

**Schema:**

| Concept | Detail |
|---|---|
| **Treatment group** | Units that experience the intervention at time `t*` |
| **Control group** | Units that don't (or experience it later) |
| **Pre-period** | Time before `t*` |
| **Post-period** | Time after `t*` |
| **DiD estimator** | `(Y_T,post − Y_T,pre) − (Y_C,post − Y_C,pre)` |
| **Key assumption** | **Parallel trends**: in the absence of treatment, both groups would have evolved similarly |

> **DiD differences out time-invariant confounders** (unobserved characteristics of each unit) and **common time trends**. What's left is the treatment effect.

#### The 2×2 setup

|   | Pre | Post |
|---|---|---|
| Treatment | `Y_T,pre` | `Y_T,post` |
| Control | `Y_C,pre` | `Y_C,post` |

```
DiD = (Y_T,post − Y_T,pre) − (Y_C,post − Y_C,pre)
    = (Y_T,post − Y_C,post) − (Y_T,pre − Y_C,pre)
```

> Two ways to read it: (1) treated change minus control change, or (2) cross-sectional difference at post minus at pre. Same number.

#### Visual intuition

```
Y                                     ╭─ Y_T,post (observed)
│            Treatment effect = ATE   │
│                                  ── ╰─ Y_T,post counterfactual (parallel trends)
│       ──────────────────────── ─
│      ╱
│     ╱──── Control trend extrapolated to post
│    ╱
│   ╱─── Y_C,post
│  ╱
│ ╱── Y_C,pre, Y_T,pre (parallel before)
└─────────────────► Time
       t*
```

> The **counterfactual** for the treated group is "what would Y_T,post have been **if** the treatment didn't happen" — assumed to track the parallel control trend.

#### Regression form (the practical implementation)

`Y_{i,t} = α + β·Treat_i + γ·Post_t + δ·(Treat_i × Post_t) + ε_{i,t}`

| Coefficient | Interpretation |
|---|---|
| `α` | Pre-period control mean |
| `β` | Time-invariant treated-vs-control difference (drops out in DiD) |
| `γ` | Common time trend (post − pre, control side) |
| **`δ`** | **DiD estimate — the treatment effect** |

```python
import statsmodels.formula.api as smf

# y_it ~ Treat + Post + Treat:Post  (clustered SEs by unit)
model = smf.ols("y ~ treat * post", data=df).fit(
    cov_type="cluster", cov_kwds={"groups": df["unit_id"]}
)
print(model.params["treat:post"])           # the DiD estimate δ
```

#### Two-way fixed effects (TWFE)

The full panel-data regression generalizes the 2×2:

`Y_{i,t} = α_i + λ_t + δ·D_{i,t} + ε_{i,t}`

| Term | Role |
|---|---|
| `α_i` | Unit fixed effects (absorb time-invariant unit characteristics) |
| `λ_t` | Time fixed effects (absorb common time shocks) |
| `D_{i,t}` | 1 if unit `i` is treated at time `t` |
| `δ` | TWFE estimator of treatment effect |

```python
# Using pyfixest (preferred for TWFE)
from pyfixest.estimation import feols
m = feols("y ~ D | unit_id + time", data=df)
print(m.summary())
```

> **TWFE = generalized DiD** for staggered treatment timing.

#### Parallel trends — the central assumption

Test by examining **pre-treatment** trends:

| Method | What |
|---|---|
| **Visual** | Plot Y over time for both groups; pre-period should track |
| **Pre-trend test** | Regress on leads of treatment; coefficients on `Treat × t_pre` should be ~0 |
| **Event study** | Estimate effect at each lead/lag of treatment; pre-period coefficients should be flat near zero |

```
Event study:  γ_k for k = -5, -4, ..., -1, 0, +1, ..., +5
Pre (k < 0):  should be flat / zero (parallel trends)
Post (k ≥ 0): treatment effect over time (dynamic)
```

```python
# Lead/lag indicators for event study
for k in range(-5, 6):
    df[f"lag_{k}"] = (df["t"] - df["treat_time"] == k).astype(int)
m = feols("y ~ " + " + ".join(f"lag_{k}" for k in range(-5, 6) if k != -1) + " | unit_id + time", data=df)
```

> **Always plot the event study**. If pre-trends differ, parallel trends fail and DiD is biased.

#### Staggered treatment (different units treated at different times)

Naïve TWFE is **biased** when treatment timing varies (Goodman-Bacon, de Chaisemartin & d'Haultfoeuille, Callaway & Sant'Anna 2021):

| Issue | Why |
|---|---|
| Already-treated units serve as "controls" for newly-treated | Implicit comparison can be **negatively weighted** |
| Treatment effect heterogeneity | TWFE produces a weighted average that may not match any meaningful estimand |
| Negative weights | Some 2×2 comparisons get **negative** weight in the average |

**Modern fixes:**

| Estimator | Approach |
|---|---|
| **Callaway-Sant'Anna** | Use **never-treated** as clean control; aggregate group-time ATEs |
| **de Chaisemartin-d'Haultfoeuille** | DID_M estimator with explicit weights |
| **Sun & Abraham** | Interaction-weighted estimator |
| **Borusyak-Jaravel-Spiess** | Imputation estimator |

```python
# Callaway-Sant'Anna in Python
from differences import ATTgt
att = ATTgt(data=df, cohort_name="treat_year", outcome="y", control_group="nevertreated").fit()
```

> If treatment timing varies, **don't use plain TWFE**. Use one of the modern staggered-DID estimators.

#### Robust SEs — clustering

DiD residuals are correlated within unit over time. **Always cluster SEs at the unit (panel) level**:

```python
model.fit(cov_type="cluster", cov_kwds={"groups": df["unit_id"]})
```

> Without clustering, SEs are too small → false significance.

#### Triple-differences (DDD)

Add a third dimension to control for time-trend differences:

`y ~ Treat * Post * Subgroup` + lower-order terms

> Useful when parallel trends hold within a subgroup but not overall (e.g., effect of a policy on women, controlling for time trends in men).

#### Falsification / placebo tests

| Test | What |
|---|---|
| **Placebo treatment time** | Pretend treatment happened at a fake earlier date — DiD estimate should be ~0 |
| **Placebo outcome** | Apply DiD to an unrelated outcome — should be ~0 |
| **Lead test** | Regress on `Treat × t_lead` — coefficients should be 0 |

> Failing placebo tests = parallel trends violated.

#### When DiD won't work

| Situation | Why / use instead |
|---|---|
| Treatment affects control group too (spillover) | Use cluster randomization, geography-based DiD |
| Selection into treatment correlated with trend | Conditional DiD with PSM, or matching DiD |
| No suitable control group | Synthetic control method |
| Treatment is continuous, not binary | Generalized DiD with continuous treatment |
| Sharp threshold rule | Regression discontinuity |
| Clear instrument | Instrumental variables |

#### DiD vs alternatives

| Method | Assumption | When |
|---|---|---|
| **DiD** | Parallel trends | Before/after with control group |
| **Synthetic control** | Pre-period weighting → counterfactual | Single treated unit |
| **PSM** | No unmeasured confounders | Rich covariates, no panel |
| **IV** | Valid instrument | Endogeneity |
| **RDD** | Continuity at threshold | Cutoff-based assignment |
| **RCT** | Randomization | You can randomize |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Not clustering SEs by unit | Always cluster |
| Plain TWFE with staggered treatment | Use Callaway-Sant'Anna or similar |
| No pre-trend / event-study check | Always plot event study |
| Choosing post-period that's too long | Effects can fade; check dynamic profile |
| Ignoring spillovers (treatment leaks to control) | Use clusters, geography, or distance-based controls |
| Assuming parallel trends without testing | Run placebo / pre-trend tests |
| Not weighting by population if units differ in size | Weight regressions by unit size |
| Treating DiD coefficient as RCT-equivalent | Quasi-experimental — quantify sensitivity to assumption violations |

#### Real-world examples

| Setting | Treatment | Control | Outcome |
|---|---|---|---|
| Min wage increase (NJ vs PA, Card-Krueger) | NJ workers | PA workers | Employment |
| State legalization | Legalized states | Non-legalized | Tax revenue |
| Feature rollout to subset of users | Treated cohort | Hold-out cohort | Engagement metric |
| Marketing campaign in some cities | Treated cities | Untreated cities | Sales |
| Vaccine introduction by region | Vaccinated areas | Non-vaccinated | Disease incidence |
| New school curriculum | Pilot schools | Other schools | Test scores |

#### Worked example

A company rolls out a new homepage to **half its markets** on Jan 1. You have monthly revenue per market for 12 months before and 6 months after.

```python
df["post"] = (df["month"] >= "2024-01-01").astype(int)
df["treat"] = (df["market"].isin(treated_markets)).astype(int)

# 1. Visual check
df.groupby(["month", "treat"])["revenue"].mean().unstack().plot()

# 2. Event study
df["months_since_treat"] = df["month"].dt.to_period("M") - pd.Period("2024-01-01")
# Lead/lag dummies for k = -12 to +6, omit k = -1 as reference

# 3. DiD regression
m = smf.ols("revenue ~ treat * post + C(market) + C(month)", data=df).fit(
    cov_type="cluster", cov_kwds={"groups": df["market"]})
print(m.params["treat:post"])  # treatment effect
```

#### Reporting

| Required | Why |
|---|---|
| Event study plot | Visualize parallel trends |
| Point estimate + clustered SE | Inference |
| Sample sizes per group | Power |
| Pre-period mean for context | Effect size in absolute terms |
| Robustness: alternative time windows | Check sensitivity |
| Placebo test | Falsification |
| Sensitivity to control set | If multiple control sets available |

**Rule of thumb:** **DiD = pre/post + treated/control + parallel trends**. Always **plot an event study** to verify parallel trends. Use **two-way fixed effects** for the regression form. **Cluster SEs by unit**. With **staggered treatment**, switch to **Callaway-Sant'Anna** or similar — plain TWFE is biased. Apply **placebo tests** and report sensitivity. The strength of DiD is differencing out time-invariant confounders; the weakness is the **parallel-trends assumption** is unverifiable in the post period.
