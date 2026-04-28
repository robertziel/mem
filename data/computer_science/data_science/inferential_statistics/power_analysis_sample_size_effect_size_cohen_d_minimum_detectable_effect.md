### Power Analysis (sample size, effect size, Cohen's d, minimum detectable effect)

**When:** **before** running an experiment / study — answer "how many subjects do I need to detect a meaningful effect?". Essential for A/B testing, clinical trials, surveys. Skipping power analysis = wasting your sample budget or accepting unknown false-negative rates.

**Schema:**

| Symbol | Meaning |
|---|---|
| **α** | Type-I error rate (false positive) — typically 0.05 |
| **β** | Type-II error rate (false negative) |
| **Power = 1 − β** | Probability of detecting an effect that's real — typically target **80% or 90%** |
| **Effect size** | Standardized magnitude of the effect (Cohen's d, h, w, f) |
| **MDE** (minimum detectable effect) | Smallest effect size detectable at given α, β, n |
| **n** | Sample size per group |

> **Four-way trade-off**: (`α`, `power`, `effect size`, `n`) — fix any 3 and the 4th is determined.

#### Sample-size formulas — quick reference

| Comparison | Formula |
|---|---|
| Two means (equal n) | `n = 2σ²(z_{α/2} + z_β)² / Δ²` |
| Two means (Cohen's d) | `n ≈ 16 / d²` for α=0.05, power=80% (rough) |
| Two proportions | `n ≈ (z_{α/2} + z_β)² · (p₁(1−p₁) + p₂(1−p₂)) / (p₁ − p₂)²` |
| Single proportion vs p₀ | `n = (z_{α/2}·√(p₀(1−p₀)) + z_β·√(p̂(1−p̂)))² / (p̂ − p₀)²` |
| Correlation | `n ≈ ((z_{α/2} + z_β) / arctanh(r))² + 3` |

For **80% power, α = 0.05, two-sided**: `(z_{α/2} + z_β)² = (1.96 + 0.84)² ≈ 7.85`.

#### Cohen's effect-size conventions

| Comparison | Statistic | Small | Medium | Large |
|---|---|---|---|---|
| Two means | Cohen's `d = (μ₁ − μ₂) / σ` | 0.2 | 0.5 | 0.8 |
| Two proportions | Cohen's `h = 2·arcsin√p₁ − 2·arcsin√p₂` | 0.2 | 0.5 | 0.8 |
| Chi-square | Cohen's `w` | 0.1 | 0.3 | 0.5 |
| ANOVA | Cohen's `f` | 0.1 | 0.25 | 0.4 |
| Correlation | r | 0.1 | 0.3 | 0.5 |

> Don't reverse-engineer effect size from past data and call it the MDE — that's circular. Use **what's practically meaningful**.

#### Sample size table — cheat sheet

For two-sample t-test, two-sided, α = 0.05, power = 80%:

| Cohen's d | n per group |
|---|---|
| 0.1 (very small) | ~1,571 |
| 0.2 (small) | ~393 |
| 0.3 | ~175 |
| 0.5 (medium) | ~64 |
| 0.8 (large) | ~26 |
| 1.0 | ~17 |

For two proportions, baseline 10%, target 11%, two-sided, α=0.05, power=80%:

| Lift | n per arm |
|---|---|
| 5% (10% → 10.5%) | ~127,000 |
| 10% (10% → 11%) | ~32,000 |
| 20% (10% → 12%) | ~8,000 |
| 50% (10% → 15%) | ~1,500 |

> **Halving the MDE quadruples the sample size.** This is the most-violated rule in practice — teams want tiny lifts with small samples.

#### Code

```python
from statsmodels.stats.power import TTestIndPower, NormalIndPower
from statsmodels.stats.proportion import proportion_effectsize

# Two-sample t-test, given d
analysis = TTestIndPower()
n = analysis.solve_power(effect_size=0.5, alpha=0.05, power=0.80)
# → n ≈ 64 per group

# Two proportions
es = proportion_effectsize(0.10, 0.11)
n = NormalIndPower().solve_power(effect_size=es, alpha=0.05, power=0.80)

# MDE given fixed n
mde_d = analysis.solve_power(nobs1=1000, alpha=0.05, power=0.80)
```

#### Power vs the four levers

| Increase | Effect on required n |
|---|---|
| Increase **effect size** (d) | n drops as `1/d²` |
| Increase **power** | n grows |
| Decrease **α** (e.g., 0.01) | n grows |
| One-sided test | n drops slightly (use only when justified) |
| Add covariates / paired design | n drops (lower variance) |
| Use CUPED | n drops 50%+ when covariate strongly correlated |

#### A priori vs post-hoc power

| Type | Use |
|---|---|
| **A priori** (pre-experiment) | Determine `n` from `(α, power, MDE)` — **the only legitimate use** |
| **Post-hoc** (after observing) | Plugging observed effect back in is **uninformative** (tautological with the p-value) — generally discouraged |
| **Sensitivity** | "Given this n, what effect size could I detect?" — useful framing |

> Post-hoc power analysis using the **observed** effect is methodologically suspect. Use a **pre-specified MDE** instead.

#### Sequential / adaptive designs

If you might **stop early** for efficacy / futility, sample size from a fixed-design power analysis is wrong. Use:

| Approach | When |
|---|---|
| **Group sequential** (O'Brien-Fleming, Pocock) | Pre-specified interim looks |
| **Always-valid p-values / SPRT** | Continuous monitoring |
| **Adaptive sample size re-estimation** | Recalc based on interim variance |

(See sequential-testing memo.)

#### Variance reduction → smaller n

| Technique | Variance reduction |
|---|---|
| **CUPED** (covariate adjustment) | 30–60% with strong pre-experiment covariate |
| **Stratification** (block on covariates) | 10–30% |
| **Paired design** | Up to 80% if within-subject correlation high |
| **Difference-in-differences** | Strips out level effects |
| **Trimmed means / winsorization** | Robustness to outliers |

> **CUPED** routinely halves the required sample size when there's a strong pre-experiment covariate. Always-on at FAANG-scale experimentation.

#### Power analysis for non-standard tests

| Setup | Approach |
|---|---|
| Time-to-event (survival) | Schoenfeld formula based on hazard ratio + #events |
| Cluster-randomized | Inflate by **design effect** = `1 + (m̄ − 1)·ICC` |
| Mixed effects | Simulation (Monte Carlo) — rare closed forms |
| Bayesian | Probability that posterior credible interval excludes 0 |
| Nonparametric (Mann-Whitney) | Multiply parametric n by 1/0.95 ≈ 1.05 (small penalty) |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Picking effect size from prior published "significant" results | Selection bias inflates effect estimates — use a smaller MDE |
| Setting MDE = "whatever lift would be exciting" | Tie MDE to a real **decision** boundary |
| Planning for one MDE, then accepting "directionally positive but n.s." | Pre-register; don't move goalposts |
| Power analysis for "primary metric only" but planning to also test 5 secondaries | Use family-wise correction (Bonferroni / Holm) in the n calc |
| Assuming variance = published estimate | It varies — pad with 10–20% buffer |
| 2-sample but observations are paired | Use paired-design power (drops n) |
| Computing power = 0.80 once, ignoring hierarchy | Each subgroup test needs its own power |

#### Power curves

For each `n`, plot **power vs effect size** to communicate trade-offs:

```python
import numpy as np
import matplotlib.pyplot as plt
from statsmodels.stats.power import TTestIndPower

ds = np.linspace(0.1, 1.0, 50)
analysis = TTestIndPower()
for n in [50, 100, 250, 1000]:
    powers = [analysis.power(effect_size=d, nobs1=n, alpha=0.05) for d in ds]
    plt.plot(ds, powers, label=f"n={n}")
plt.axhline(0.8, color="k", linestyle="--")
plt.xlabel("Cohen's d"); plt.ylabel("Power"); plt.legend()
```

#### Cheat sheet — A/B testing on a proportion

| Baseline `p` | Lift `Δp` | n per arm (α=0.05, power=80%, two-sided) |
|---|---|---|
| 0.05 | +0.005 (10%) | ~73,000 |
| 0.10 | +0.01 (10%) | ~32,000 |
| 0.20 | +0.02 (10%) | ~17,000 |
| 0.50 | +0.05 (10%) | ~6,300 |

**Rule of thumb:** **always run a power analysis before the experiment** with a **pre-specified MDE tied to a real decision**. For 80% power, two-sided α = 0.05, two-sample t-test: **n ≈ 16 / d²** per group. **Halving MDE quadruples n**. Use **CUPED** to cut required sample size by 30–60%. Post-hoc power on the observed effect is **uninformative**.
