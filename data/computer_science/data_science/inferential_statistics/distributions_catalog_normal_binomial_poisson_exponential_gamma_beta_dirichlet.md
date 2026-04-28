### Distributions Catalog (Normal, Binomial, Poisson, Exponential, Gamma, Beta, Dirichlet)

**When:** picking a likelihood, modeling counts / waiting times / proportions, choosing priors, recognizing what test applies. Each distribution has a **canonical use case** — the cheat sheet for "which distribution fits this data?".

#### Continuous distributions

| Distribution | Support | Parameters | Mean | Var | Used for |
|---|---|---|---|---|---|
| **Normal** `N(μ, σ²)` | ℝ | μ, σ² | μ | σ² | Errors, sums of many small effects (CLT) |
| **Log-Normal** | (0, ∞) | μ, σ² (of log) | `e^{μ + σ²/2}` | `(e^{σ²}−1)·e^{2μ+σ²}` | Multiplicative growth, prices, response times |
| **Exponential** `Exp(λ)` | (0, ∞) | λ (rate) | 1/λ | 1/λ² | Waiting times (memoryless) |
| **Gamma** `Γ(k, θ)` | (0, ∞) | shape k, scale θ | kθ | kθ² | Sum of k exponentials; positive-only data |
| **Beta** `B(α, β)` | (0, 1) | α, β | α/(α+β) | αβ / ((α+β)²(α+β+1)) | Proportions, probabilities |
| **Uniform** `U(a, b)` | [a, b] | a, b | (a+b)/2 | (b−a)²/12 | "Anything in this range" |
| **Cauchy** | ℝ | location, scale | undefined | undefined | Heavy-tailed; ratio of two standard normals |
| **Student's t** | ℝ | df ν | 0 (ν > 1) | ν/(ν−2) (ν > 2) | Test statistic with estimated σ |
| **Chi-square** `χ²_k` | (0, ∞) | df k | k | 2k | Sum of k squared standard normals |
| **F** | (0, ∞) | df₁, df₂ | df₂/(df₂−2) | … | Ratio of two scaled chi-squares |
| **Weibull** | (0, ∞) | shape k, scale λ | λΓ(1+1/k) | … | Failure times, survival |
| **Pareto** | [xₘ, ∞) | xₘ, α | αxₘ/(α−1) | … | Heavy-tailed; income, file sizes |

#### Discrete distributions

| Distribution | Support | Parameters | Mean | Var | Used for |
|---|---|---|---|---|---|
| **Bernoulli** | {0, 1} | p | p | p(1−p) | Single binary trial |
| **Binomial** `Bin(n, p)` | {0, …, n} | n, p | np | np(1−p) | Successes in n independent trials |
| **Categorical** | {1, …, k} | p₁, …, pₖ | — | — | Single categorical outcome |
| **Multinomial** | k-tuples summing to n | n, p₁..pₖ | nᵢ = npᵢ | … | Multiple categorical trials |
| **Poisson** `Pois(λ)` | {0, 1, 2, …} | λ | λ | λ | Rare events / counts per interval |
| **Geometric** | {1, 2, …} | p | 1/p | (1−p)/p² | Trials until first success |
| **Negative Binomial** | {r, r+1, …} | r, p | r/p | r(1−p)/p² | Trials until r-th success; **overdispersed counts** |
| **Hypergeometric** | {0, …, K} | N, K, n | nK/N | … | Sampling without replacement |
| **Discrete Uniform** | {a, …, b} | a, b | (a+b)/2 | … | "Roll a die" |

#### Pick-a-distribution decision tree

```
Outcome type?
├─ Continuous, real-valued
│  ├─ Symmetric, light-tailed         → Normal
│  ├─ Heavy-tailed                    → Cauchy / Student's t / Pareto
│  └─ Skewed positive                 → Log-Normal / Gamma / Weibull
├─ Continuous, bounded [0, 1]         → Beta
├─ Continuous, positive               → Exponential / Gamma / Weibull
├─ Discrete count, no upper bound
│  ├─ Mean ≈ Variance                 → Poisson
│  └─ Variance > Mean (overdispersed) → Negative Binomial
├─ Discrete, bounded [0, n]           → Binomial
├─ Discrete categorical               → Categorical / Multinomial
└─ Time to event                      → Exponential / Weibull / Gamma
```

#### Conjugate priors (for Bayesian inference)

| Likelihood | Conjugate prior | Posterior |
|---|---|---|
| **Bernoulli / Binomial** | **Beta** `B(α, β)` | `B(α + #successes, β + #failures)` |
| **Categorical / Multinomial** | **Dirichlet** | Dirichlet with updated counts |
| **Normal** (known σ) | **Normal** | Normal with weighted mean |
| **Normal** (unknown μ, σ) | **Normal-inverse-gamma** | Same family |
| **Poisson** | **Gamma** | Gamma with updated count, time |
| **Exponential** | **Gamma** | Gamma with updated shape, rate |
| **Multivariate Normal** | **Normal-inverse-Wishart** | Same family |

> Conjugacy gives **closed-form posteriors** — fast Bayesian inference. Beta-Binomial is the canonical example: prior `B(1, 1)` (uniform) + 7 successes in 10 trials → posterior `B(8, 4)`.

#### Useful identities

| Statement | Truth |
|---|---|
| Sum of independent Normals | Normal with summed mean and variance |
| Sum of independent Poissons | Poisson with summed rate |
| Sum of `n` Exp(λ) | Gamma(n, 1/λ) |
| Sum of squared standard Normals | Chi-square |
| Ratio of two squared Normals | Cauchy / F |
| Bernoulli is Binomial(1, p) | — |
| Geometric is special case of Negative Binomial(1, p) | — |
| Limit of Binomial(n, λ/n) as n→∞ | Poisson(λ) |
| Beta(1, 1) = Uniform(0, 1) | — |

#### Distribution properties cheat sheet

| Property | Distribution(s) |
|---|---|
| **Memoryless** | Exponential, Geometric |
| **Heavy-tailed** | Cauchy, Pareto, log-Normal (mildly) |
| **Bounded** | Beta, Uniform, Binomial |
| **Positive** | Exponential, Gamma, Weibull, log-Normal |
| **Symmetric** | Normal, Cauchy, Uniform, Student's t |
| **Skewed** | Log-Normal, Gamma, Exponential |
| **Maximum entropy given mean / variance** | Normal |
| **Maximum entropy given mean only (positive)** | Exponential |
| **Maximum entropy given mean only (counts)** | Geometric |

#### Code

```python
from scipy import stats
import numpy as np

# Sample
samples = stats.norm(loc=0, scale=1).rvs(1000)
samples = stats.binom(n=10, p=0.3).rvs(1000)
samples = stats.poisson(mu=5).rvs(1000)

# PDF / PMF
stats.norm.pdf(0)            # 0.3989...
stats.binom(10, 0.5).pmf(5)  # 0.246

# CDF
stats.norm.cdf(1.96)         # ~0.975

# Inverse CDF (quantile)
stats.norm.ppf(0.975)        # 1.96

# Fit MLE parameters from data
mu, sigma = stats.norm.fit(samples)
shape, loc, scale = stats.gamma.fit(samples)
```

#### Real-world mapping

| Real-world quantity | Default distribution |
|---|---|
| Heights / weights / IQ | Normal (approximately) |
| File sizes / web latency / income | Log-Normal or Pareto |
| Click probability per impression | Beta (prior); Bernoulli (likelihood) |
| #Clicks per session | Poisson or Negative Binomial |
| Time between events | Exponential |
| Time-to-failure | Weibull |
| Uplift in A/B test | Approximately Normal (CLT on means) |
| Conversions / 100 visitors | Binomial |
| Dice / lottery | Discrete Uniform |
| Revenue per user | Often Pareto / log-Normal |
| Order amount | Gamma or log-Normal |
| Occupancy / utilization | Beta |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Assuming Normal for everything | Check histogram / QQ plot first |
| Modeling counts with Normal | Use Poisson / Negative Binomial |
| Modeling proportions with Normal | Use Beta or apply logit transform first |
| Modeling waiting times with Normal | Use Exponential / Gamma |
| Ignoring overdispersion in counts | Switch from Poisson to Negative Binomial |
| Conjugate prior with wrong likelihood | Pair correctly (Beta-Binomial, Gamma-Poisson, etc.) |
| Heavy-tailed data with t-test for mean | Mean may not exist — use median / nonparametric |
| Confusing rate `λ` and scale `1/λ` | scipy uses `scale = 1/λ` for Exponential |

#### Visual recognition

| Shape | Likely distribution |
|---|---|
| Bell-shaped, symmetric | Normal |
| Right-skewed positive | Log-Normal, Gamma, Weibull |
| Decay from 0 | Exponential, Geometric |
| U-shape on [0, 1] | Beta(α<1, β<1) |
| Inverse-J on [0, 1] | Beta(α<1, β>1) |
| Unimodal on [0, 1] | Beta(α>1, β>1) |
| Long heavy tail | Pareto, Cauchy, log-Normal |
| Bimodal | Mixture (e.g., GMM) |

**Rule of thumb:** **the distribution should match the data type and support**. Counts → **Poisson** (or **Negative Binomial** if overdispersed). Proportions → **Beta**. Waiting times → **Exponential / Gamma**. Continuous symmetric → **Normal**. Skewed positive → **log-Normal / Gamma**. For Bayesian work, use **conjugate priors** when the math is closed-form. Always **plot a histogram first** before assuming Normal.
