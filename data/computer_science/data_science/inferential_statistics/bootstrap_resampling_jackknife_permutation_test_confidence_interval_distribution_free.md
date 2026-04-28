### Bootstrap, Jackknife, Permutation Tests (resampling, distribution-free CI / p-value)

**When:** the statistic of interest has **no clean closed-form distribution** (median, ratio, correlation difference, AUC, percentiles), or distributional assumptions are violated. Resampling replaces parametric formulas with computation.

**Schema:**

| Method | What it does | Best for |
|---|---|---|
| **Bootstrap** | Resample with replacement, B times; compute statistic each time → empirical distribution | CIs, SEs for arbitrary statistics |
| **Jackknife** | Leave-one-out, n versions; compute statistic each time | Bias estimation, simpler SE |
| **Permutation test** | Shuffle group labels, recompute statistic; null distribution | Hypothesis tests without parametric form |

> Bootstrap **estimates the sampling distribution** by resampling. Permutation **simulates H₀** by reshuffling.

#### Bootstrap — the workhorse

```python
import numpy as np
rng = np.random.default_rng()

def bootstrap_ci(data, statistic=np.mean, B=10_000, alpha=0.05):
    n = len(data)
    boots = np.array([statistic(rng.choice(data, n, replace=True)) for _ in range(B)])
    return np.percentile(boots, [100*alpha/2, 100*(1-alpha/2)])

def bootstrap_se(data, statistic=np.mean, B=10_000):
    n = len(data)
    boots = [statistic(rng.choice(data, n, replace=True)) for _ in range(B)]
    return np.std(boots, ddof=1)
```

**B (number of bootstrap replicates):**

| Goal | B |
|---|---|
| Standard error | 200–1,000 |
| 95% CI (percentile) | 1,000–10,000 |
| 99% CI / extreme percentiles | 10,000+ |
| Tail probabilities | 10,000+ |

> Cost is cheap; default to **B = 10,000** unless the statistic is expensive.

#### Bootstrap CI variants

| Variant | How | When |
|---|---|---|
| **Percentile** | `[θ̂_{α/2}, θ̂_{1−α/2}]` | Default; fast and easy |
| **Basic / pivot** | `[2θ̂ − θ̂_{1−α/2}, 2θ̂ − θ̂_{α/2}]` | Better when distribution is shifted |
| **BCa** (bias-corrected, accelerated) | Adjusts for bias + skewness | Most accurate; default for production |
| **Studentized** | Use bootstrap SE in pivot | Best for small samples; slowest |
| **Bias-corrected (BC)** | Adjusts for bias only | Simpler than BCa |

```python
from scipy.stats import bootstrap
res = bootstrap((data,), np.median, n_resamples=10_000, method="BCa")
print(res.confidence_interval)
```

#### When NOT to use bootstrap (failures)

| Situation | Why bootstrap fails |
|---|---|
| **Maximum / minimum** as statistic | Bootstrap underestimates extremes |
| **Heavy-tailed distributions without finite variance** | Cauchy, etc. — bootstrap unreliable |
| **Dependent data** (time series, spatial, clustered) | Use **block bootstrap** instead |
| **Tiny n (≤ ~10)** | Resamples lack diversity |
| **Statistics that depend on the entire CDF** (e.g., density estimates) | Direct bootstrap underperforms; specialized variants exist |

#### Block bootstrap (for time series / dependent data)

| Variant | Mechanism |
|---|---|
| **Moving block** | Resample contiguous blocks of fixed length |
| **Stationary** (Politis-Romano) | Block lengths drawn from geometric distribution |
| **Circular** | Wrap around end of series |

> Block size `≈ n^{1/3}` is a common rule of thumb; pick by autocorrelation length.

#### Permutation test (hypothesis test without parametric form)

```python
def permutation_test(a, b, statistic=np.mean, B=10_000):
    obs = statistic(a) - statistic(b)
    pooled = np.concatenate([a, b])
    nA = len(a)
    null = []
    for _ in range(B):
        rng.shuffle(pooled)
        null.append(statistic(pooled[:nA]) - statistic(pooled[nA:]))
    null = np.array(null)
    p = (np.abs(null) >= np.abs(obs)).mean()
    return obs, p
```

> **H₀ here = exchangeability** (group labels carry no info). Test is exact under that null. Useful for **any statistic**: difference of means, AUC difference, correlation difference, etc.

#### Permutation test variants

| Variant | When |
|---|---|
| Two-sample (above) | Comparing two groups on any statistic |
| **Paired** | Randomly flip signs within pairs |
| **Stratified** | Permute within strata to preserve covariate balance |
| **Approximate** (Monte Carlo) | B random permutations (default) |
| **Exact** | All `n! / (n_A! · n_B!)` permutations — only for small n |
| **Sign-flip** | For paired / regression residuals |

#### Jackknife

| Step | Action |
|---|---|
| 1 | For each `i`, compute `θ̂_{(i)}` = statistic with observation `i` removed |
| 2 | Jackknife mean: `θ̂_{(·)} = (1/n) Σ θ̂_{(i)}` |
| 3 | Bias estimate: `(n − 1)(θ̂_{(·)} − θ̂)` |
| 4 | SE estimate: `√((n−1)/n · Σ (θ̂_{(i)} − θ̂_{(·)})²)` |

> Cheaper than bootstrap (n evaluations vs B), but less powerful. **Use jackknife mainly to estimate bias**; use bootstrap for everything else.

#### When to pick which

| Need | Use |
|---|---|
| CI for an arbitrary statistic | **Bootstrap** (BCa) |
| SE for arbitrary statistic | Bootstrap or jackknife |
| Hypothesis test without parametric assumptions | **Permutation** |
| Bias correction | Jackknife |
| Time series CI | **Block bootstrap** |
| Regression coefficient CI | Bootstrap residuals or pairs |
| AUC / ranking metric difference | Bootstrap or permutation |

#### Examples worth memorizing

**1. CI for the median:**

```python
ci = bootstrap_ci(data, statistic=np.median)
```

**2. CI for the **difference** in medians:**

```python
def diff_median(a, b): return np.median(a) - np.median(b)

# Resample each group separately
def two_sample_bootstrap_ci(a, b, statistic=diff_median, B=10_000, alpha=0.05):
    boots = []
    for _ in range(B):
        a_boot = rng.choice(a, len(a), replace=True)
        b_boot = rng.choice(b, len(b), replace=True)
        boots.append(statistic(a_boot, b_boot))
    return np.percentile(boots, [100*alpha/2, 100*(1-alpha/2)])
```

**3. CI for AUC:**

Bootstrap `AUC(y_true_resample, y_score_resample)`; use percentile or BCa.

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Bootstrap on dependent data | Use **block bootstrap** |
| Treating bootstrap CI as Bayesian | It's frequentist — same caveats |
| Bootstrapping max / min / extremes | Bootstrap underestimates extremes |
| `B = 100` for a 99% CI | Too few replicates; need 10,000+ |
| Bootstrapping a hypothesis test stat under H₁ | Permutation tests simulate **H₀**, not the alternative |
| Resampling **rows** when **groups** matter | Resample at the right unit (cluster, user) |
| Forgetting to set seed | Reproducibility — set `rng = np.random.default_rng(42)` |
| Reporting only point estimate | Always pair with CI |

#### Connection to other methods

| Concept | Relation to bootstrap |
|---|---|
| **Bagging** (RF, etc.) | Bootstrap aggregating — train on B bootstrap samples, average |
| **Out-of-bag estimate** | Use unselected observations as validation |
| **Cross-validation** | Different idea (split, don't resample) |
| **Bayesian bootstrap** | Reweighting via Dirichlet draws; converges to posterior under flat prior |

#### Permutation vs t-test (when both apply)

| Property | t-test | Permutation |
|---|---|---|
| Assumption | Normal (or large n) | Exchangeability under H₀ |
| Statistic | Means | **Any** |
| Speed | O(1) | O(B · n) |
| Power | Higher under normality | Slightly less, but robust |

> If **both apply**, t-test is faster; if **either** is questionable, permutation is the safer choice.

**Rule of thumb:** **bootstrap for CIs of arbitrary statistics; permutation for hypothesis tests of arbitrary statistics; jackknife for bias correction**. Default to **B = 10,000** with **BCa percentile**. For dependent data, **block bootstrap**. Bootstrap **fails** on extremes (max/min), heavy-tailed without finite variance, and tiny n.
