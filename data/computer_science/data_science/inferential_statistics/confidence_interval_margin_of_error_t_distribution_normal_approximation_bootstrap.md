### Confidence Intervals (margin of error, t-distribution, normal approximation, bootstrap)

**When:** quantify **uncertainty around an estimate** (mean, proportion, difference, regression coefficient). The companion to every point estimate. Almost always more informative than a p-value alone.

**Schema:**

| Concept | Detail |
|---|---|
| **Confidence interval (CI)** | Range likely to contain the true parameter at a given confidence level |
| Confidence level (1 − α) | 90% → α = 0.10; 95% → α = 0.05; 99% → α = 0.01 |
| **Margin of error** | `critical_value × standard_error` |
| **Standard error (SE)** | Standard deviation of the **estimator's sampling distribution** |
| Critical value | `z_{α/2}` if known σ, or `t_{α/2, df}` if estimated |

> **Frequentist interpretation**: "if we repeated the experiment many times, 95% of the resulting CIs would contain the true parameter". NOT "there's a 95% chance the parameter is in this CI" (that's a Bayesian credible interval).

#### CI formulas — quick reference

| Parameter | CI |
|---|---|
| Mean (σ known) | `x̄ ± z_{α/2} · (σ/√n)` |
| Mean (σ unknown) | `x̄ ± t_{α/2, n−1} · (s/√n)` |
| Proportion (Wald) | `p̂ ± z_{α/2} · √(p̂(1−p̂)/n)` |
| Proportion (Wilson — better for small n) | See Wilson-score formula |
| Proportion (Clopper-Pearson — exact) | Beta-distribution-based |
| Difference of means (Welch) | `(x̄₁ − x̄₂) ± t_{α/2, ν} · √(s₁²/n₁ + s₂²/n₂)` |
| Difference of proportions | `(p̂₁ − p̂₂) ± z_{α/2} · √(p̂₁(1−p̂₁)/n₁ + p̂₂(1−p̂₂)/n₂)` |
| Regression coefficient | `β̂ ± t_{α/2, df} · SE(β̂)` |
| Variance | `((n−1)s²/χ²_{α/2}, (n−1)s²/χ²_{1−α/2})` |

#### Critical values (two-sided)

| Confidence | z | t (df=30) |
|---|---|---|
| 90% | 1.645 | 1.697 |
| **95%** | **1.960** | 2.042 |
| 99% | 2.576 | 2.750 |
| 99.9% | 3.291 | 3.646 |

#### Code

```python
from scipy import stats
import numpy as np

# Mean with unknown σ — t-based
def ci_mean(data, alpha=0.05):
    x̄ = np.mean(data); s = np.std(data, ddof=1); n = len(data)
    t_crit = stats.t.ppf(1 - alpha/2, df=n - 1)
    me = t_crit * s / np.sqrt(n)
    return x̄ - me, x̄ + me

# Proportion — Wilson score (better than Wald, esp. for small n / extreme p)
def ci_proportion(k, n, alpha=0.05):
    p̂ = k / n
    z = stats.norm.ppf(1 - alpha/2)
    denom = 1 + z*z/n
    center = (p̂ + z*z/(2*n)) / denom
    me = z * np.sqrt(p̂*(1-p̂)/n + z*z/(4*n*n)) / denom
    return center - me, center + me

# Bootstrap — distribution-free
def bootstrap_ci(data, statistic=np.mean, B=10_000, alpha=0.05):
    rng = np.random.default_rng()
    boots = [statistic(rng.choice(data, len(data), replace=True)) for _ in range(B)]
    return np.percentile(boots, [100*alpha/2, 100*(1-alpha/2)])
```

#### When to use which CI for proportions

| n · p | Method | Why |
|---|---|---|
| Both `np` and `n(1−p)` ≥ 10 | Wald (`p̂ ± z·√(p̂(1−p̂)/n)`) | Simple; fine for "well-behaved" |
| Small n or p near 0 / 1 | **Wilson score** | Doesn't go below 0 or above 1; better coverage |
| Need exact guarantee | **Clopper-Pearson** | Conservative but exact |
| Streaming / heavy-tailed | **Bootstrap** | No distributional assumption |

#### Bootstrap CI variants

| Variant | How |
|---|---|
| **Percentile** | `[θ̂_{α/2}, θ̂_{1−α/2}]` from B resamples |
| **Basic / pivot** | `[2θ̂ − θ̂_{1−α/2}, 2θ̂ − θ̂_{α/2}]` |
| **BCa** (bias-corrected, accelerated) | Adjusts for bias and skewness; usually best |
| **Studentized** | Use bootstrap SE; most accurate but slower |

> Default to **percentile** for ease, **BCa** when accuracy matters, **studentized** for tiny samples.

#### CI vs hypothesis test — same machine

| Statement | Equivalent |
|---|---|
| Two-sided 95% CI for `μ₁ − μ₂` excludes 0 | Reject `H₀: μ₁ = μ₂` at α = 0.05 |
| 99% CI excludes 0 | Reject at α = 0.01 |
| CI **includes** 0 | Fail to reject `H₀` |

> CIs convey **effect size + uncertainty** in one figure — usually more useful than the p-value alone.

#### Width vs sample size

CI half-width shrinks like `1/√n`. To **halve** the CI, **quadruple** the sample size.

| n | 95% CI half-width (proportion p̂ = 0.5) |
|---|---|
| 100 | ±0.098 |
| 400 | ±0.049 |
| 1,600 | ±0.024 |
| 10,000 | ±0.010 |

#### One-sided CI (rare but exists)

`[x̄ − z_α · σ/√n, +∞)` — used when only one tail of error matters (e.g., "lower bound on revenue").

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Saying "95% chance true value is in CI" | That's Bayesian; frequentist CI is about long-run repetition |
| Wald CI for proportions near 0 / 1 | Use Wilson or Clopper-Pearson |
| Pooling variances when groups clearly differ | Use Welch's CI for difference of means |
| Forgetting `s` (sample SD) ≠ `SE` | `SE = s / √n` |
| Symmetric CI on bounded parameters (e.g., variance) | Use chi-square CI for variance, log-transform for ratios |
| Reporting one-sided CI without justification | Default two-sided unless pre-specified |
| Multiple CIs without joint correction | Bonferroni-style adjustment for simultaneous coverage |

#### Bayesian credible interval — adjacent concept

| Frequentist 95% CI | Bayesian 95% credible interval |
|---|---|
| 95% of CIs contain true value (across replications) | 95% posterior probability the parameter is in this interval |
| Computed from likelihood | Computed from posterior |
| Doesn't depend on prior | Depends on prior |
| Default in classical stats | Common in PyMC / Stan workflows |

**Rule of thumb:** **CIs > p-values for communication** — they show effect size and uncertainty together. **Use t-based** when σ is estimated (almost always); **Wilson** for proportions; **bootstrap** when distributional assumptions don't hold or you need a CI for a non-standard statistic. CI **width shrinks like 1/√n** — halving width quadruples cost.
