### Nonparametric Tests (Mann-Whitney, Wilcoxon, Kruskal-Wallis, sign test, rank-based)

**When:** the data **violate normality** (skewed, ordinal, heavy-tailed, bounded counts) OR the sample size is too small for CLT to rescue you. Rank-based tests don't assume a parametric distribution; they trade some power for robustness.

**Schema:**

| Concept | Detail |
|---|---|
| Operate on **ranks** | Replace values with their ordinal rank, then compute statistics on ranks |
| Distribution-free | No assumption of normality, equal variance, etc. |
| Power | Slightly **less** than parametric when assumptions hold; **more** when violated |
| Effect size | Often reported via rank-biserial correlation or `r = Z / √n` |

#### Test picker

| Parametric test | Nonparametric equivalent | Tests for |
|---|---|---|
| One-sample t-test | **Sign test** / **Wilcoxon signed-rank** | Median ≠ μ₀ |
| Paired t-test | **Wilcoxon signed-rank** | Median paired difference ≠ 0 |
| Independent two-sample t-test | **Mann-Whitney U** (Wilcoxon rank-sum) | Distributions differ (or medians) |
| One-way ANOVA | **Kruskal-Wallis** | At least one group's distribution differs |
| Repeated-measures ANOVA | **Friedman test** | At least one condition differs |
| Pearson correlation | **Spearman's ρ** or **Kendall's τ** | Monotonic association |
| Chi-square (large samples) | **Fisher's exact** | Independence (small contingency tables) |

#### Mann-Whitney U (a.k.a. Wilcoxon rank-sum)

Tests whether two **independent** samples come from the same distribution (often interpreted as testing equal medians under shape-equality assumption).

```python
from scipy import stats
u, p = stats.mannwhitneyu(group_a, group_b, alternative="two-sided")
```

**Statistic:** rank both samples together, compute `U₁ = R₁ − n₁(n₁+1)/2` where `R₁` = sum of ranks in group 1.

#### Wilcoxon signed-rank

Tests whether **paired** observations have a symmetric distribution around zero.

```python
w, p = stats.wilcoxon(before, after)
```

| Step | Action |
|---|---|
| 1 | Compute differences `dᵢ = before − after` |
| 2 | Drop zeros |
| 3 | Rank `|dᵢ|` and apply signs |
| 4 | `W = Σ signed_ranks` |

#### Kruskal-Wallis

ANOVA's nonparametric cousin — tests whether ≥3 groups have the same distribution.

```python
h, p = stats.kruskal(g1, g2, g3, g4)
```

**Post-hoc:** **Dunn's test** (with Bonferroni / Holm correction) is the standard.

```python
import scikit_posthocs as sp
sp.posthoc_dunn(df, val_col="metric", group_col="group", p_adjust="holm")
```

#### Friedman test (repeated-measures nonparametric)

```python
f, p = stats.friedmanchisquare(cond1, cond2, cond3)
```

**Post-hoc:** Nemenyi or Wilcoxon signed-rank with correction.

#### Sign test (simplest nonparametric)

Counts how many paired differences are positive vs negative; H₀: 50/50.

```python
import numpy as np
n_pos = (np.array(diffs) > 0).sum()
n_neg = (np.array(diffs) < 0).sum()
p = stats.binomtest(n_pos, n_pos + n_neg, p=0.5).pvalue
```

> Less powerful than Wilcoxon (uses only sign, not rank magnitude). But makes **fewer assumptions**.

#### Rank correlations

| Coefficient | What it measures | Use |
|---|---|---|
| **Spearman ρ** | Pearson correlation **on ranks** — monotonic relationship | Default for non-linear monotonic |
| **Kendall τ** | Concordant minus discordant pairs / total pairs | Smaller-sample, more robust |
| **Pearson r** | Linear correlation on raw values | Default when relationship is linear and data are normal-ish |

```python
rho, p = stats.spearmanr(x, y)
tau, p = stats.kendalltau(x, y)
```

#### When parametric assumptions are slightly off

| Violation | Severity → choice |
|---|---|
| Mild non-normality, n ≥ 30 | t-test still fine (CLT) |
| Heavy outliers | **Mann-Whitney** or trimmed mean / robust SE |
| Ordinal data (Likert scales) | **Mann-Whitney / Kruskal-Wallis** |
| Highly skewed (income, response times) | Log-transform + parametric, or rank-based directly |
| Heteroscedasticity (unequal vars) | **Welch's** parametric, OR rank-based |
| Small n (< 10), no normality | Definitely nonparametric or **bootstrap** |

#### Effect size for nonparametric

| Test | Effect size |
|---|---|
| Mann-Whitney | `r = |Z| / √N`, or rank-biserial `r_b` |
| Wilcoxon signed-rank | `r = |Z| / √N` (where N = #non-zero pairs) |
| Kruskal-Wallis | `η²_H = (H − k + 1) / (n − k)` |
| Spearman / Kendall | The coefficient itself |

#### Power: parametric vs nonparametric

| Assumption | Parametric power | Nonparametric power |
|---|---|---|
| Truly Normal | Higher (~5% more) | Slightly lower |
| Heavy-tailed | Much lower | **Higher** |
| Ordinal | Inappropriate | Correct tool |
| Bounded / discrete | Possibly biased | Robust |

> Mann-Whitney's **Asymptotic Relative Efficiency vs t** is **3/π ≈ 0.955** under normality (so almost as good), but **much higher** under heavy tails. Cheap insurance.

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Running Mann-Whitney and reporting "medians differ" | Strictly tests **stochastic equality**; only reduces to median difference under shape equality |
| Reporting only p-value | Add rank-based effect size and CI |
| Using Wilcoxon signed-rank with asymmetric differences | The test assumes symmetry; if violated, use sign test |
| Comparing means after a rank-based test | Inconsistent — pick a paradigm |
| Applying parametric test to ordinal Likert data | Use Mann-Whitney / Kruskal-Wallis |
| Tied ranks not handled | Most implementations handle automatically; verify |
| Using nonparametric "just to be safe" when n is large and roughly normal | Loses some power for nothing |

#### Decision tree

```
Continuous, paired, normal-ish    → Paired t-test
Continuous, paired, non-normal    → Wilcoxon signed-rank
Continuous, 2 indep, normal-ish   → t-test (Welch's)
Continuous, 2 indep, non-normal   → Mann-Whitney U
Continuous, ≥3 indep, normal-ish  → ANOVA + Tukey
Continuous, ≥3 indep, non-normal  → Kruskal-Wallis + Dunn
Repeated, ≥3 conditions, normal   → Repeated-measures ANOVA
Repeated, ≥3 conditions, non-norm → Friedman + Nemenyi
Two categorical                   → Chi-square / Fisher's exact
Correlation, linear normal        → Pearson r
Correlation, monotonic / ordinal  → Spearman ρ / Kendall τ
```

**Rule of thumb:** **rank-based tests are the safe default when assumptions are violated** — Mann-Whitney for two groups, Kruskal-Wallis for many. Cost is ~5% lost power under normality; gain is robustness to outliers and skew. For correlations on monotonic-but-not-linear data, **Spearman ρ**. With paired data and asymmetric differences, **sign test**; with symmetric, **Wilcoxon signed-rank**.
