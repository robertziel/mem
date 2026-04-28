### Hypothesis Testing (z-test, t-test, chi-square, p-value, α / β errors)

**When:** "is this difference real, or could it be chance?" — comparing means / proportions / distributions before claiming an effect. Foundational inferential-statistics machinery.

**Schema:**

| Concept | Detail |
|---|---|
| `H₀` (null) | Default "no effect"; what you'd believe absent evidence |
| `H₁` (alternative) | The effect / direction you're testing for |
| **α** | Type-I error — `P(reject H₀ | H₀ true)`; usually `0.05` |
| **β** | Type-II error — `P(fail to reject H₀ | H₁ true)` |
| **Power** | `1 − β` — `P(detect effect | effect exists)` |
| **p-value** | `P(observed test statistic or more extreme | H₀)` |
| Decision | Reject `H₀` iff `p < α` |
| Test statistic | Standardized "distance" from `H₀` (z, t, F, χ²) |

> **p-value misinterpretation is universal**: it's NOT `P(H₀ | data)`, NOT `P(effect is real)`, NOT a measure of effect size. It's only `P(data | H₀)`.

#### Test picker

| Question | Test | Assumption |
|---|---|---|
| Is sample mean = μ₀? (σ known, n large) | **Z-test** | Normal or n ≥ 30 |
| Is sample mean = μ₀? (σ unknown) | **One-sample t-test** | Normal or n ≥ 30 |
| Are two group means equal? (equal var) | **Two-sample t-test (Student's)** | Normal, equal var |
| Are two group means equal? (unequal var) | **Welch's t-test** | Normal (default in practice) |
| Are paired observations different? | **Paired t-test** | Differences ~ Normal |
| Is sample proportion = p₀? | **Z-test for proportions** | `np`, `n(1−p) ≥ 5` |
| Are two proportions equal? | **Two-proportion z-test** | Same |
| Does observed match expected? (categorical) | **Chi-square goodness-of-fit** | Each expected cell ≥ 5 |
| Are two categorical vars independent? | **Chi-square test of independence** | Same |
| Small contingency table | **Fisher's exact test** | Any cell count |
| Three+ group means equal? | **One-way ANOVA** | Normal, equal var |
| Non-normal continuous, two groups | **Mann-Whitney U** | Independent samples |
| Non-normal paired | **Wilcoxon signed-rank** | Symmetric distribution |
| Non-normal three+ groups | **Kruskal-Wallis** | — |

#### Test statistics — quick formulas

| Test | Statistic |
|---|---|
| One-sample z | `(x̄ − μ₀) / (σ / √n)` |
| One-sample t | `(x̄ − μ₀) / (s / √n)`, df = n − 1 |
| Two-sample t (pooled) | `(x̄₁ − x̄₂) / (s_p · √(1/n₁ + 1/n₂))`, df = n₁ + n₂ − 2 |
| Welch's t | `(x̄₁ − x̄₂) / √(s₁²/n₁ + s₂²/n₂)`, df via Welch-Satterthwaite |
| Two-proportion z | `(p̂₁ − p̂₂) / √(p̂(1−p̂)·(1/n₁ + 1/n₂))` |
| Chi-square | `Σ (O − E)² / E` |

#### One-tailed vs two-tailed

| Test | When |
|---|---|
| Two-tailed (`H₁: μ ≠ μ₀`) | **Default** — testing for any difference |
| One-tailed (`H₁: μ > μ₀`) | Only when direction is decided **before** seeing data, by domain logic |

> Sneaking from two-tailed to one-tailed after seeing data **doubles** the false-positive rate. Pre-register.

#### Quick recipes (Python)

```python
from scipy import stats

# One-sample t (mean vs μ₀)
t, p = stats.ttest_1samp(data, popmean=0.0)

# Two-sample t (Welch's)
t, p = stats.ttest_ind(a, b, equal_var=False)

# Paired t
t, p = stats.ttest_rel(before, after)

# Two-proportion z (manually or via statsmodels)
from statsmodels.stats.proportion import proportions_ztest
z, p = proportions_ztest([s1, s2], [n1, n2])

# Chi-square independence
chi2, p, dof, expected = stats.chi2_contingency(contingency_table)

# Mann-Whitney
u, p = stats.mannwhitneyu(a, b, alternative='two-sided')
```

#### Critical values (cheat sheet, two-tailed)

| α | z | t (df = 30) |
|---|---|---|
| 0.10 | 1.645 | 1.697 |
| 0.05 | **1.960** | 2.042 |
| 0.01 | 2.576 | 2.750 |
| 0.001 | 3.291 | 3.646 |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| p < 0.05 ⇒ "effect is real" | p-value is `P(data | H₀)`, not posterior probability |
| Ignoring effect size | Report Cohen's d / odds ratio / Δproportion |
| p-hacking (test until significant) | Pre-register; correct for multiple testing |
| Using student's t with unequal variances | Default to **Welch's** |
| Two-sample t on paired data | Use **paired** t — much higher power |
| Chi-square with cells < 5 | Use **Fisher's exact** |
| Switching to one-tailed after seeing data | Always pre-specify direction |
| Treating non-significant as "no effect" | "Absence of evidence ≠ evidence of absence" — report power / CI |
| Multiple comparisons without correction | Bonferroni / BH-FDR (separate memo) |
| Assumption violations | Check normality (Shapiro / QQ plot); use nonparametric if violated |

#### Effect size accompanies every p-value

| Test | Effect size |
|---|---|
| Two-sample t | Cohen's `d = (x̄₁ − x̄₂) / s_pooled` |
| ANOVA | η² (eta-squared) |
| Chi-square | Cramér's V |
| Correlation | r |
| Two proportions | Risk difference, odds ratio |

> Cohen's d guidelines: 0.2 = small, 0.5 = medium, 0.8 = large.

**Rule of thumb:** **always pair p-value with effect size and CI**. Pick test by data type (continuous → t / Welch's; categorical → χ² / Fisher's; non-normal → Mann-Whitney / Wilcoxon). For two means with potentially unequal variances, **Welch's t is the safe default**. p < α only tells you the data are unlikely under H₀ — not that the effect is real, large, or important.
