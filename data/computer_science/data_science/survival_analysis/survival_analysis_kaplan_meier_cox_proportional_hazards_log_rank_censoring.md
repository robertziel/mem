### Survival Analysis (Kaplan-Meier, Cox proportional hazards, log-rank, censoring)

**When:** **time-to-event** outcomes — customer churn, equipment failure, patient survival, conversion time. Standard regression / classification fail because (1) some events haven't happened yet (**censoring**), and (2) the response is **time** with non-trivial distribution.

**Schema:**

| Concept | Symbol | Detail |
|---|---|---|
| **Time** | `T` | Time until event |
| **Event indicator** | `δ` | 1 if event observed, 0 if censored |
| **Survival function** | `S(t) = P(T > t)` | Probability of surviving past time `t` |
| **Hazard function** | `h(t) = lim_{Δ→0} P(t ≤ T < t+Δ | T ≥ t) / Δ` | Instantaneous failure rate |
| **Cumulative hazard** | `H(t) = ∫₀ᵗ h(u) du = -log S(t)` | Aggregated hazard |
| **Censoring** | Event hasn't been observed by end of follow-up | Right-censored (most common); left-censored; interval-censored |

> Censoring is the **defining feature**. Survival analysis correctly handles partially observed times.

#### Censoring types

| Type | Detail |
|---|---|
| **Right-censored** | Event hasn't happened by study end (most common) |
| **Left-censored** | Event happened before study began |
| **Interval-censored** | Event happened in a known time window |
| **Informative censoring** | Cause of censoring is related to outcome — biases analysis |

> Standard methods assume **non-informative** censoring. If subjects who withdraw are sicker, your analysis is biased.

#### Kaplan-Meier estimator (non-parametric survival curve)

`S(t_i) = ∏_{j ≤ i} (1 - d_j / n_j)`

| Symbol | Meaning |
|---|---|
| `t_i` | Distinct event times |
| `d_j` | # events at time `t_j` |
| `n_j` | # at risk just before `t_j` |

```python
from lifelines import KaplanMeierFitter

kmf = KaplanMeierFitter()
kmf.fit(durations=T, event_observed=event_indicator)
kmf.plot_survival_function()
print(kmf.median_survival_time_)
print(kmf.confidence_interval_)
```

> KM gives a **step function** — survival drops at each observed event. Censored observations don't drop the curve but reduce the at-risk set.

#### Log-rank test (compare survival curves)

Tests whether two (or more) groups have the same survival distribution:

```python
from lifelines.statistics import logrank_test
result = logrank_test(T_A, T_B, event_observed_A=δ_A, event_observed_B=δ_B)
print(result.p_value, result.test_statistic)
```

| Property | Detail |
|---|---|
| Non-parametric | No assumption on hazard shape |
| Tests global difference | Doesn't say where curves differ |
| Sensitive to proportional hazards | Wilcoxon variant when hazards cross |

#### Cox proportional hazards (the workhorse regression)

`h(t | X) = h₀(t) · exp(β₁ X₁ + β₂ X₂ + …)`

| Component | Meaning |
|---|---|
| `h₀(t)` | Baseline hazard (left non-parametric) |
| `exp(β)` | Hazard ratio per unit X |
| Proportional hazards | Group hazard ratio is **constant over time** |
| Semi-parametric | Doesn't model `h₀(t)` shape |

```python
from lifelines import CoxPHFitter

df = pd.DataFrame({"T": T, "event": event, "age": age, "treatment": treatment})
cph = CoxPHFitter()
cph.fit(df, duration_col="T", event_col="event")
cph.print_summary()                           # coefficients, HR, p-values, CIs
cph.plot()
```

| Output | Interpretation |
|---|---|
| `exp(β) = 1.5` for treatment | Treated group has 1.5× the hazard rate |
| `exp(β) = 0.7` for new drug | New drug reduces hazard by 30% |
| Coefficient SE / Wald p | Significance of each predictor |

#### Proportional hazards assumption

Cox model assumes hazard ratios are **constant over time**. Test:

```python
from lifelines.statistics import proportional_hazard_test
results = proportional_hazard_test(cph, df, time_transform="rank")
print(results.summary)             # p < 0.05 → assumption violated
```

| Violation fix | What |
|---|---|
| **Stratify** by violating variable | Different `h₀(t)` per stratum, same β elsewhere |
| **Time-varying coefficients** | Allow β to depend on time |
| **Accelerated failure time (AFT)** | Different parametric model |
| **Restricted cubic splines** | Flexible interaction with time |

#### Stratified Cox

```python
cph.fit(df, duration_col="T", event_col="event", strata=["sex", "site"])
```

> Each stratum has its own baseline hazard; covariates' effects are pooled.

#### Time-varying covariates

```python
# Long-format data: one row per (subject, time interval)
from lifelines import CoxTimeVaryingFitter
ctvf = CoxTimeVaryingFitter()
ctvf.fit(long_df, id_col="id", event_col="event", start_col="start", stop_col="stop")
```

#### Parametric models (Accelerated Failure Time, AFT)

Specify the survival distribution:

| Model | Distribution | Use |
|---|---|---|
| **Exponential** | Constant hazard | Memoryless events |
| **Weibull** | Polynomial hazard | Increasing / decreasing failure rates |
| **Log-Normal** | Hazard rises then falls | Time-to-failure with peak |
| **Log-Logistic** | Similar; longer tails | Same |
| **Generalized gamma** | Flexible | Diagnostic |

```python
from lifelines import WeibullFitter, LogNormalFitter
wb = WeibullFitter().fit(T, event_indicator)
print(wb.lambda_, wb.rho_)
wb.plot_survival_function()
```

> AFT models are useful when (a) you need extrapolation to long horizons, (b) PH assumption fails, or (c) you need a parametric form for simulation.

#### Survival metrics for ML

| Metric | What |
|---|---|
| **Concordance (C-index)** | Fraction of pairs ranked correctly by predicted risk; 0.5 = random, 1 = perfect |
| **Time-dependent AUC** | AUC at each `t` |
| **Brier score** | MSE-like for survival probabilities |
| **Integrated Brier score** | Brier averaged over horizon |
| **D-calibration** | Calibration of predicted survival probabilities |

```python
from lifelines.utils import concordance_index
c = concordance_index(T, -predicted_risk, event_observed=event)
```

#### Modern ML-flavored survival

| Method | What |
|---|---|
| **Random Survival Forest** | Forests adapted for censored data |
| **Gradient Boosting Survival** | XGBoost / LightGBM with survival loss |
| **DeepSurv** | Neural Cox; deep learning |
| **DeepHit** | Neural; competing risks |
| **Survival neural networks** (deepsurv, pycox) | Various deep models |

```python
# Scikit-survival: random survival forest
from sksurv.ensemble import RandomSurvivalForest
rsf = RandomSurvivalForest(n_estimators=200)
rsf.fit(X, structured_y)               # y = (event, time) structured array
risk_scores = rsf.predict(X_test)
```

#### Competing risks

When subjects can experience **different** events (e.g., death from cause A vs cause B):

| Approach | Detail |
|---|---|
| **Cause-specific Cox** | Separate Cox per cause |
| **Fine-Gray model** | Subdistribution hazard |
| **Aalen-Johansen** | Multi-state non-parametric |
| **DeepHit** | Joint deep learning |

#### Interpretation

| Coefficient | Interpretation |
|---|---|
| `β = 0.5`, `exp(β) = 1.65` | Hazard ratio 1.65 — 65% higher event rate |
| `β = -0.2`, `exp(β) = 0.82` | 18% lower event rate |
| Categorical: HR vs reference | "Treatment B has 0.7× hazard of Treatment A" |
| Continuous: HR per unit | "Each year of age increases hazard by 5%" |

#### Visualization

| Plot | What |
|---|---|
| **KM curve** | Survival vs time, per group |
| **Cumulative hazard plot** | log H(t) often easier to compare |
| **Schoenfeld residuals** | Diagnose PH violation |
| **Forest plot of HRs** | Multi-variable Cox results |
| **Calibration plot** | Predicted vs observed survival |

#### Use cases

| Application | Time-to-event |
|---|---|
| Customer churn | Days until cancellation |
| Loan default | Months until missed payment |
| Equipment failure | Hours until breakdown |
| Patient survival | Days until death / disease progression |
| Conversion in funnel | Hours until purchase |
| Email engagement | Time to first open |
| Subscription retention | Months until churn |
| Click-through prediction | Time to first click on item |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Treating censored observations as event = 0 | Lose information; use survival framework |
| Logistic regression on "churned by 30 days" | Throws away variable follow-up time |
| Cox PH without checking PH assumption | Wrong inferences if violated |
| Ignoring informative censoring | Bias remains |
| Comparing means / medians directly | Censoring distorts; use KM medians |
| Single time-point analysis | Misses dynamic hazard structure |
| Combining competing-risks events | Inflates apparent hazard |
| Predicting survival without calibration check | Predictions miscalibrated |
| Using time-varying covariates as fixed | Mis-specifies relationship |

#### Decision tree

```
Time-to-event with censoring?
├─ Compare two/more groups, no covariates    → Kaplan-Meier + log-rank
├─ Hazard ratios for covariates              → Cox PH (check PH assumption)
├─ Need parametric extrapolation             → Weibull / Log-Normal AFT
├─ Time-varying effects                       → Stratified or time-varying Cox
├─ Competing events                           → Cause-specific Cox / Fine-Gray
├─ Many features, ML flavor                   → Random Survival Forest / DeepSurv
└─ Discrete-time / interval                   → Discrete-time logistic
```

#### Tools

| Tool | What |
|---|---|
| **`lifelines`** (Python) | Pythonic survival analysis library |
| **`scikit-survival`** | sklearn-style API |
| **`pycox`** | Deep survival models |
| **`survival`** (R) | Reference implementation |
| **`survminer`** (R) | Visualizations |
| **`flexsurv`** (R) | Many parametric models |

#### Code (full example)

```python
import pandas as pd
from lifelines import KaplanMeierFitter, CoxPHFitter
from lifelines.statistics import logrank_test, proportional_hazard_test

df = pd.read_csv("churn.csv")        # columns: tenure, event, age, plan, ...

# 1. KM by plan
kmf_basic = KaplanMeierFitter()
kmf_pro = KaplanMeierFitter()
kmf_basic.fit(df.query("plan == 'basic'")["tenure"],
              df.query("plan == 'basic'")["event"], label="basic")
kmf_pro.fit(df.query("plan == 'pro'")["tenure"],
            df.query("plan == 'pro'")["event"], label="pro")
kmf_basic.plot_survival_function()
kmf_pro.plot_survival_function()

# 2. Log-rank
lr = logrank_test(df.query("plan == 'basic'")["tenure"],
                  df.query("plan == 'pro'")["tenure"],
                  event_observed_A=df.query("plan == 'basic'")["event"],
                  event_observed_B=df.query("plan == 'pro'")["event"])
print(f"log-rank p = {lr.p_value:.4f}")

# 3. Cox
cph = CoxPHFitter()
cph.fit(df, duration_col="tenure", event_col="event")
cph.print_summary()

# 4. Check PH
ph_test = proportional_hazard_test(cph, df)
print(ph_test.summary)
```

**Rule of thumb:** **survival analysis = time-to-event with censoring**. Use **Kaplan-Meier** for non-parametric survival curves, **log-rank** for group comparison, **Cox PH** for hazard-ratio regression. **Always check the PH assumption** (Schoenfeld residuals); if violated, stratify or use time-varying coefficients. For ML flavor, **Random Survival Forest** or **DeepSurv**. Don't dichotomize time-to-event into "churned by 30d" — you throw away variable follow-up.
