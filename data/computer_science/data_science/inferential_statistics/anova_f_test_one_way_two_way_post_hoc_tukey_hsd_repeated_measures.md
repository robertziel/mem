### ANOVA (one-way, two-way, F-test, post-hoc, Tukey HSD, repeated measures)

**When:** comparing means across **3 or more groups** — A/B/C/D test variants, multi-arm experiments, comparing several treatments. Avoid running pairwise t-tests; ANOVA controls the family-wise error rate.

**Schema:**

| Concept | Detail |
|---|---|
| `H₀` | All group means are equal: `μ₁ = μ₂ = … = μₖ` |
| `H₁` | At least one mean differs |
| **F-statistic** | `MS_between / MS_within` — ratio of between-group to within-group variance |
| Significant F | "At least one group differs" — doesn't tell **which** |
| **Post-hoc tests** | Identify which pairs differ (Tukey, Bonferroni, Scheffé) |
| ANOVA decomposition | `SS_total = SS_between + SS_within` |

> ANOVA is a **t-test generalized to k groups**. With k = 2, ANOVA F = (t)². Same answer.

#### Variants

| Variant | Use |
|---|---|
| **One-way ANOVA** | One categorical factor, ≥ 3 levels (e.g., 4 ad creatives) |
| **Two-way ANOVA** | Two factors + their interaction (e.g., creative × device) |
| **Repeated-measures ANOVA** | Same subjects measured multiple times |
| **MANOVA** | Multiple dependent variables |
| **ANCOVA** | ANOVA with continuous covariate(s) controlled |
| **Mixed-effects ANOVA** | Random + fixed effects (random intercepts per user, etc.) |

#### One-way ANOVA mechanics

| Source | df | SS | MS |
|---|---|---|---|
| Between groups | k − 1 | `Σ nⱼ(x̄ⱼ − x̄)²` | `SS_b / (k−1)` |
| Within groups (residual) | n − k | `Σ Σ (xᵢⱼ − x̄ⱼ)²` | `SS_w / (n−k)` |
| Total | n − 1 | `Σ Σ (xᵢⱼ − x̄)²` | — |

**F = MS_between / MS_within**, compared to F-distribution with `(k−1, n−k)` df.

#### Assumptions

| Assumption | Check / fix |
|---|---|
| **Independence** of observations | Design (random sampling, no clustering) |
| **Normality** within each group | Shapiro-Wilk; n ≥ 30 per group → CLT robust |
| **Equal variances** (homoscedasticity) | Levene's / Bartlett's test; if violated → Welch's ANOVA |
| Random sampling | Design |
| Continuous DV, categorical IV | Otherwise use chi-square / regression |

> When equal-variance assumption fails: **Welch's ANOVA** or transform / use Kruskal-Wallis.

#### Post-hoc tests (after rejecting H₀)

| Test | When |
|---|---|
| **Tukey HSD** | Default; controls family-wise error rate (FWER) for all pairwise |
| **Bonferroni** | Few pre-planned comparisons; conservative |
| **Scheffé** | Complex contrasts (linear combinations of group means) |
| **Dunnett's** | All groups vs **one control** (more powerful) |
| **Games-Howell** | Unequal variances |
| **Holm-Bonferroni** | Sequentially less conservative than Bonferroni |

> If you only care about **vs control**, use **Dunnett's** — gives more power than all-pairs Tukey.

#### Code

```python
from scipy import stats
import statsmodels.api as sm
from statsmodels.stats.multicomp import pairwise_tukeyhsd

# One-way ANOVA
f, p = stats.f_oneway(group1, group2, group3, group4)

# Welch's ANOVA (unequal variances)
import pingouin as pg
pg.welch_anova(data=df, dv="metric", between="group")

# Tukey HSD post-hoc
res = pairwise_tukeyhsd(df["metric"], df["group"])
print(res)

# Two-way ANOVA via OLS
model = sm.formula.ols("metric ~ C(creative) * C(device)", data=df).fit()
sm.stats.anova_lm(model, typ=2)

# Repeated-measures ANOVA
pg.rm_anova(data=df, dv="score", within="condition", subject="subject_id")
```

#### Effect size

| Metric | Formula | Interpretation |
|---|---|---|
| **η²** (eta-squared) | `SS_between / SS_total` | % variance explained |
| **ω²** (omega-squared) | Bias-corrected η² | Better for small samples |
| **f** (Cohen's f) | `√(η² / (1 − η²))` | 0.1 small, 0.25 medium, 0.4 large |
| **partial η²** | `SS_effect / (SS_effect + SS_error)` | Multi-factor designs |

#### Two-way ANOVA — interaction

| Output term | Meaning |
|---|---|
| Main effect of A | Average effect of A across levels of B |
| Main effect of B | Average effect of B across levels of A |
| **A × B interaction** | Whether A's effect **depends on** B's level |

**Significant interaction** ⇒ don't interpret main effects in isolation; analyze simple effects.

#### When NOT to use ANOVA

| Situation | Use instead |
|---|---|
| Non-normal, n small | **Kruskal-Wallis** (non-parametric ANOVA) |
| Categorical DV | Chi-square / logistic regression |
| Continuous IV | Linear regression |
| Repeated measures, sphericity violated | Greenhouse-Geisser / Huynh-Feldt correction |
| Within-subject correlation | Mixed-effects model |
| Many factors / unbalanced design | OLS regression with categorical encoding |

#### ANOVA vs regression — same model

A one-way ANOVA on k groups is **identical** to a linear regression with `k − 1` dummy variables. The F-statistic is the same. Choose ANOVA framing for designed experiments, regression framing for observational covariates.

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Running k pairwise t-tests instead of ANOVA + post-hoc | FWER blows up; use ANOVA + Tukey |
| Reporting only F + p, no effect size | Add η² and post-hoc CIs |
| Ignoring assumption violations | Levene's test; fall back to Welch's or Kruskal-Wallis |
| Treating significant F as "all groups differ" | F says **at least one** differs — need post-hoc |
| Two-way ANOVA without checking interaction | Plot group means; check for crossover patterns |
| Unbalanced design + Type I SS | Use **Type II or Type III SS** (ordering of factors matters with Type I) |

#### Repeated-measures gotcha — sphericity

Sphericity = variances of differences between all pairs of within-subject conditions are equal. Test with **Mauchly's**; if violated:

| Severity | Correction |
|---|---|
| Mild violation | Greenhouse-Geisser correction (decreases df) |
| Severe | Huynh-Feldt or use multivariate (MANOVA) approach |

**Rule of thumb:** **3+ groups → ANOVA, then post-hoc**. Default post-hoc is **Tukey HSD**; use **Dunnett's** for "all vs control". For unequal variances, **Welch's ANOVA**. Always pair F + p with **η²** for effect size. **Two-way ANOVA**: check interactions before interpreting main effects. With k = 2 groups, just use a t-test — same answer.
