### A/B Testing Design (frequentist, two-sample proportion / mean test, metrics, randomization)

**When:** decide between two product variants by **randomized controlled trial** in production — UI changes, ranking algorithms, pricing, recommendations. The default DS interview question and FAANG bread-and-butter.

**Schema (the experiment lifecycle):**

| Phase | Action |
|---|---|
| 1. Hypothesis | Pre-specify primary metric, null `H₀: μ_A = μ_B`, alternative `H₁` (usually two-sided), MDE, α, power |
| 2. Sample size | Power analysis → `n_per_arm` |
| 3. Randomization | Assign units (users / sessions / requests) uniformly to A or B |
| 4. Run | Collect for **fixed duration** (don't peek; or use sequential test) |
| 5. Sanity checks | Sample ratio mismatch (SRM), pre-experiment metric balance |
| 6. Analyze | Compute test statistic, p-value, CI, effect size |
| 7. Decide | Ship / no-ship based on pre-specified rule (NOT just "p < 0.05") |

> **A/B testing = frequentist hypothesis testing applied to product changes.**

#### Metric design

| Metric type | Examples | Test |
|---|---|---|
| **Conversion rate** (binary per unit) | CTR, signup rate, purchase rate | Two-proportion z-test |
| **Continuous** (per unit) | Revenue, time spent, sessions | Welch's t-test on per-unit means |
| **Count** (per unit) | Clicks, page views | t-test on per-unit means (CLT) or log-transform |
| **Ratio metric** | Click-through-rate at session level (clicks / impressions) | **Delta method** for variance |
| **Bounded** | Bounce rate, satisfaction (1–5) | t-test or Mann-Whitney |

#### Primary, secondary, guardrail metrics

| Type | Purpose | Hypothesis |
|---|---|---|
| **Primary (OEC)** — Overall Evaluation Criterion | The metric the decision hinges on | Pre-specified single test |
| **Secondary** | Supporting evidence / mechanism | Reported but lower bar |
| **Guardrail** | Things that **shouldn't get worse** | Test for regression (one-sided) |
| **Counter-metric** | Detect gaming of primary | Sanity check |
| **Drivers** | Sub-components that explain primary | Diagnostic |

> Pre-specify **all** metrics, especially guardrails. Adding "I noticed metric X is significant!" post-hoc is multiple-testing abuse.

#### Two-proportion z-test (the classic for conversion)

| Quantity | Formula |
|---|---|
| Pooled rate | `p̂ = (x_A + x_B) / (n_A + n_B)` |
| Standard error | `SE = √(p̂(1−p̂)·(1/n_A + 1/n_B))` |
| Test statistic | `z = (p̂_B − p̂_A) / SE` |
| Two-sided p-value | `2·(1 − Φ(|z|))` |
| 95% CI for diff | `(p̂_B − p̂_A) ± 1.96·SE_unpooled` |

```python
from statsmodels.stats.proportion import proportions_ztest
z, p = proportions_ztest([x_A, x_B], [n_A, n_B], alternative="two-sided")
```

#### Welch's t-test (continuous metric)

```python
from scipy import stats
t, p = stats.ttest_ind(metric_A, metric_B, equal_var=False)
```

#### Sample-size recap

| Comparison | Approx n per arm (α=0.05, power=80%) |
|---|---|
| Two means, Cohen's d | `≈ 16 / d²` |
| Two proportions | `≈ (z_{α/2} + z_β)² · (p_A(1−p_A) + p_B(1−p_B)) / Δ²` |

For p_A = 0.10, lift = 10% relative (p_B = 0.11): **n ≈ 32,000 per arm**.

#### Randomization unit (matters more than you'd think)

| Unit | Implications |
|---|---|
| **User** (default) | Cleanest; one consistent experience per user |
| **Session** | More observations but **violates independence** (one user → multiple sessions) |
| **Request** | Highest power but cross-contamination risk |
| **Cluster** (school, geography) | Cluster-randomized; design effect inflates variance |

> **User-level randomization is the default**; bucket the user ID via stable hash. Avoid session/request-level unless you understand interference.

#### Hash-based assignment

```python
import hashlib

def assign(user_id, experiment_id, num_buckets=100, treatment_buckets=range(50)):
    key = f"{experiment_id}:{user_id}".encode()
    h = int(hashlib.md5(key).hexdigest(), 16)
    bucket = h % num_buckets
    return "B" if bucket in treatment_buckets else "A"
```

> Salt with `experiment_id` so users with one experiment's bucket don't get the same bucket in another experiment (correlated treatments).

#### Sanity checks (before declaring victory)

| Check | What |
|---|---|
| **SRM** (sample ratio mismatch) | Chi-square: observed split vs expected; p < 0.001 means broken assignment |
| **Pre-experiment metric A/A** | Should be ~equal; large differences mean bad randomization |
| **Pre-period parallel trends** | If using before/after, trends should match |
| **Spillover / contamination** | Inspect logs for cross-arm exposure |
| **Novelty / primacy effect** | Check trend over time; first-week effects often fade |
| **Outlier / cap policy** | Apply consistent winsorization |

#### Multiple comparisons in A/B testing

| Pattern | Correction |
|---|---|
| Single primary metric | None |
| Multiple primary metrics (treated equally) | Bonferroni or Holm |
| Many secondary / exploratory metrics | BH-FDR |
| Multiple variants (A/B/C/D) | Adjust for #comparisons |
| Many subgroups | FWER or FDR within subgroup analysis |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| **Peeking** at p-values daily and stopping when significant | Inflates Type-I error 2-3× — use **fixed duration** or **sequential test** |
| Choosing primary metric **after** seeing data | Pre-register |
| Ignoring SRM | Always run SRM check first |
| Selecting "winning" subgroup | Pre-register subgroup analyses; correct |
| Ratio metrics with naïve t-test | Use **delta method** SE or bootstrap at user level |
| Re-randomizing if you don't like the split | Each re-randomization inflates Type-I error |
| Not capping outliers | Heavy tails (revenue) wreck means — cap or use median |
| Treating "p > 0.05" as proof of no effect | Could be insufficient power; report CI and MDE |
| One-sided test without justification | Use two-sided unless direction is decided pre-experiment by hard logic |
| Running until significance ("trickle method") | Same as peeking |

#### Variance-reduction techniques (more power for free)

| Technique | Effect |
|---|---|
| **CUPED** (covariate adjustment) | 30–60% variance drop |
| Stratified randomization | 10–30% drop |
| Trimmed mean / winsorization | Outlier robustness |
| Pair / paired-id designs | Up to 80% if within-correlation high |
| Pre-period covariate as offset | Same family as CUPED |

(CUPED has its own memo.)

#### Ratio metrics — delta method

For `R = numerator / denominator` where each user has both:

`Var(R̄) ≈ (1/N) · (1/d̄²) · (Var(num) − 2·R̄·Cov(num, denom) + R̄²·Var(denom))`

> Don't compute the t-test on `clicks_total / impressions_total` directly; use **per-user** ratios with delta-method variance.

#### Decision rule

| Outcome | Decision |
|---|---|
| Significant lift on primary, no guardrail regression | Ship |
| Significant lift on primary, but guardrail regressed beyond threshold | Don't ship; investigate |
| Not significant, CI excludes meaningful negative | Probably safe to keep / ship; note inconclusive |
| Not significant, wide CI | Inconclusive — extend or redesign |
| Negative lift | Don't ship |

> Pre-specify the **decision matrix** before the experiment. Avoid re-litigating "what counts as a win".

#### A/A testing

Run an "experiment" with **no actual change** (both arms identical). Should produce p-values uniform on [0, 1] across many runs. Used to:

- Validate the experimentation platform
- Estimate empirical Type-I error
- Detect SRM issues, ID leakage

#### Interference / SUTVA

| Setting | Risk |
|---|---|
| Two-sided marketplace (Uber, eBay) | A's exposure affects B's experience via shared pool |
| Social network effects | Treated user's friends are affected |
| Auctions / pricing experiments | Treatment changes price for everyone |

> Use **cluster randomization**, **switchback experiments**, or **synthetic control** when interference is severe.

**Rule of thumb:** **pre-specify** primary metric, MDE, sample size, and decision rule before launch. **User-level random assignment** via stable hash. **Don't peek** — fixed duration or sequential test. **SRM check first** — if randomization is broken, nothing else matters. **Always report effect size + CI**, not just p-value. Apply **CUPED** for free power. Beware **ratio metrics** (use delta method), **interference** (use clusters), and **multiple comparisons**.
