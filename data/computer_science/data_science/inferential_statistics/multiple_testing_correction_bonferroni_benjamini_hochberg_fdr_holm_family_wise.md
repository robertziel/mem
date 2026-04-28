### Multiple Testing Correction (Bonferroni, Benjamini-Hochberg, FDR, Holm, family-wise error)

**When:** running **many simultaneous hypothesis tests** — A/B test on 50 metrics, GWAS with 10⁶ SNPs, feature-importance significance, comparing all pairs of groups. Without correction, false positives compound rapidly.

**Schema:**

| Concept | Detail |
|---|---|
| **Family-wise error rate (FWER)** | `P(at least one false positive across the family)` |
| **False discovery rate (FDR)** | `E[V/R]` — expected proportion of false positives among rejections |
| Without correction | With `m` tests at α = 0.05, FWER ≈ `1 − (1 − 0.05)^m` (e.g., m=20 → 64% chance of ≥1 false positive) |
| Trade-off | Stricter correction = lower FWER/FDR but lower power |

> **FWER controls "any error"; FDR controls "fraction of errors"**. FDR is more permissive — keep it for exploratory, FWER for confirmatory.

#### The compounding problem

| `m` tests at α = 0.05 | `P(≥1 false positive)` |
|---|---|
| 1 | 5% |
| 5 | 23% |
| 10 | 40% |
| 20 | 64% |
| 100 | 99.4% |

#### Correction methods

| Method | Controls | Adjustment | Strength | Use when |
|---|---|---|---|---|
| **Bonferroni** | FWER | Reject if `pᵢ ≤ α / m` | Most conservative | Few tests, high cost of false positive |
| **Šidák** | FWER | `1 − (1 − α)^{1/m}` | Slightly less conservative | Independent tests |
| **Holm** | FWER | Sequential Bonferroni — see below | Less conservative than Bonferroni | Default for FWER |
| **Hochberg** | FWER | Step-up version of Holm | More powerful when independent | — |
| **Benjamini-Hochberg (BH)** | FDR | See below | Permissive | **Default for exploration** |
| **Benjamini-Yekutieli** | FDR under dependence | More conservative BH | Many correlated tests |
| **q-value (Storey)** | FDR | Adaptive BH | Genomics |
| **Tukey HSD** | FWER | All pairwise after ANOVA | Specific to ANOVA |
| **Dunnett's** | FWER | All-vs-control after ANOVA | All vs control |

#### Bonferroni (the simplest)

```python
m = len(p_values)
adjusted = [min(p * m, 1.0) for p in p_values]      # cap at 1.0
significant = [p < alpha for p in adjusted]
```

> Or equivalently: reject `Hᵢ` if `pᵢ < α / m`. **Conservative** — assumes worst case (all tests independent). Power drops fast as `m` grows.

#### Holm-Bonferroni (sequentially less conservative)

| Step | Action |
|---|---|
| 1 | Sort p-values ascending: `p₍₁₎ ≤ p₍₂₎ ≤ … ≤ p₍ₘ₎` |
| 2 | Find smallest `k` such that `p₍ₖ₎ > α / (m − k + 1)` |
| 3 | Reject all `H₍₁₎, …, H₍ₖ₋₁₎`; fail to reject the rest |

> Same FWER guarantee as Bonferroni, **strictly more power**. **Always prefer Holm to plain Bonferroni**.

#### Benjamini-Hochberg (FDR control)

| Step | Action |
|---|---|
| 1 | Sort p-values ascending: `p₍₁₎ ≤ p₍₂₎ ≤ … ≤ p₍ₘ₎` |
| 2 | Find largest `k` such that `p₍ₖ₎ ≤ (k / m) · q` (where `q` is the desired FDR, e.g., 0.05) |
| 3 | Reject all `H₍₁₎, …, H₍ₖ₎` |

```python
import numpy as np
from statsmodels.stats.multitest import multipletests

reject, adj_pvals, _, _ = multipletests(p_values, alpha=0.05, method="fdr_bh")
# methods: "bonferroni", "holm", "fdr_bh", "fdr_by", "sidak", "hommel", ...
```

> BH lets some false positives through but keeps the **expected fraction** of false positives among rejections at ≤ q. **Default for exploratory analysis** (gene expression, A/B test on many metrics).

#### FWER vs FDR — when to pick which

| Goal | Use |
|---|---|
| "I cannot tolerate even one false positive" (clinical trial primary endpoint) | FWER (Holm / Bonferroni) |
| "I'm okay with ≤ 5% of my discoveries being false" (exploratory analytics, GWAS) | FDR (BH) |
| "I want all individual tests at α = 0.05" (no correction) | Cherry-picking — don't do this |

#### Effect of correction on power

| Tests | Bonferroni | BH (FDR) |
|---|---|---|
| 5 | α/5 = 0.01 | k=5 thresholds at q · 1, 2/5, 3/5, 4/5, 5/5 |
| 100 | α/100 = 0.0005 | More permissive |
| 10⁶ (GWAS) | α/10⁶ → infeasible | BH still finds true positives |

> The bigger the family, the more BH (FDR) outperforms Bonferroni in power.

#### A/B test multi-metric scenarios

You have 1 primary metric and 5 guardrail metrics. Two common patterns:

| Pattern | Correction |
|---|---|
| Pre-specified primary → secondary hierarchy | **Hierarchical / gatekeeping**: only test secondaries if primary significant; no correction needed for secondaries (each at α individually) |
| Several primaries treated equally | **Bonferroni** or **Holm** within the family |
| Many exploratory metrics | **BH-FDR** at e.g. 5% |
| Sequential testing across time | Always-valid p-values / sequential SPRT (separate memo) |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Running 30 tests, reporting only the "winning" p < 0.05 | Garden of forking paths — correct or pre-register |
| Bonferroni on 10⁶ tests | Use FDR (BH) instead |
| Using BH on dependent tests assuming independence | Most practical cases are okay; for severe dependence use BY |
| Ignoring correction in subgroup analysis | Each subgroup is another test |
| Confusing per-test α with family-wise α | After correction, **family-wise** α is the controlled quantity |
| Re-running tests after small changes and not adjusting | Each re-run inflates FWER |

#### Visualization

A **p-value histogram** is the diagnostic to plot before correcting:

| Shape | Interpretation |
|---|---|
| **Uniform** [0, 1] | No real signal anywhere |
| Spike near 0 + uniform tail | Real signals + true negatives — BH will find them |
| Spike near 1 | Conservative test (or weird p-value calculation) |
| Bimodal | Mix of signals — investigate |

#### Family definition is a judgment call

A "family" is the set of tests over which you want to control the error rate. Examples:

- All metrics in one A/B test → 1 family
- All A/B tests in a quarter → 1 family per test (usually)
- All SNPs in GWAS → 1 family
- All hypotheses in a paper → arguably 1 family (rarely enforced)

> **Pre-register what counts as a family**. Disagreements about family definition are often disagreements about whether the analysis is exploratory or confirmatory.

**Rule of thumb:** **always correct when running multiple tests**. **Holm > Bonferroni** for FWER (same guarantee, more power). **BH-FDR** is the default for exploratory work where some false positives are acceptable. Plot a **p-value histogram first** — it tells you whether real signal exists before you pick a correction. Without correction, **20 tests ⇒ 64% chance of at least one false positive**.
