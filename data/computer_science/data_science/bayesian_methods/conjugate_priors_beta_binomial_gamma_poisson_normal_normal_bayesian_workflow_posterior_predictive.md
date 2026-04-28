### Conjugate Priors + Bayesian Workflow (Beta-Binomial, Gamma-Poisson, Normal-Normal, posterior predictive)

**When:** simple Bayesian inference with **closed-form posteriors** — A/B testing, hierarchical models with conjugate components, online updating. No MCMC needed; updates are arithmetic.

**Schema:**

| Likelihood | Conjugate prior | Posterior |
|---|---|---|
| **Bernoulli / Binomial(p)** | **Beta(α, β)** | Beta(α + #successes, β + #failures) |
| **Categorical / Multinomial** | **Dirichlet(α₁, …, αₖ)** | Dirichlet(αᵢ + count_i) |
| **Poisson(λ)** | **Gamma(α, β)** | Gamma(α + Σx, β + n) |
| **Exponential(λ)** | **Gamma(α, β)** | Gamma(α + n, β + Σx) |
| **Normal(μ, σ²)** known σ | **Normal(μ₀, σ₀²)** | Closed form (precision-weighted mean) |
| **Normal** unknown μ, σ | **Normal-Inverse-Gamma** | NIG family |
| **Multivariate Normal** | **Normal-Inverse-Wishart** | NIW |

> **Conjugate** = posterior is in the **same family** as prior. Lets you update beliefs analytically without sampling.

#### Why conjugate priors matter

| Benefit | Detail |
|---|---|
| Closed-form posterior | No MCMC; analytical update |
| Online updating | Each new datum updates parameters cheaply |
| Interpretable | Prior parameters as "pseudo-counts" |
| Fast | Constant-time per observation |
| Hierarchical building blocks | Compose with non-conjugate parts |

#### Beta-Binomial (the canonical example)

For coin-flip / conversion-rate problems:

| Step | Action |
|---|---|
| Prior | `p ~ Beta(α, β)` |
| Data | `k` successes in `n` trials |
| Likelihood | `Binomial(k | n, p)` |
| **Posterior** | `p | data ~ Beta(α + k, β + n − k)` |

```python
import numpy as np

# Prior: Beta(1, 1) = uniform
α, β = 1, 1

# Observe 7 successes in 10 trials
k, n = 7, 10

# Posterior
α_post, β_post = α + k, β + (n - k)
# = (8, 4)

# Posterior mean
post_mean = α_post / (α_post + β_post)         # 8/12 = 0.667

# 95% credible interval
from scipy.stats import beta
ci = beta.interval(0.95, α_post, β_post)        # (0.394, 0.876)

# Sample from posterior
samples = beta.rvs(α_post, β_post, size=10_000)
```

#### Prior interpretation as "pseudo-counts"

| Prior | Equivalent prior info |
|---|---|
| `Beta(1, 1)` | No info (uniform on [0, 1]) |
| `Beta(2, 2)` | Symmetric around 0.5; weakly toward middle |
| `Beta(10, 10)` | Stronger pull toward 0.5 |
| `Beta(50, 50)` | "I've seen 100 tosses, half heads" |
| `Beta(α, β)` general | "α successes + β failures observed in past" |

> Priors are **regularization**: more pseudo-counts = stronger pull toward prior mean.

#### Posterior predictive

For Beta-Binomial, the posterior predictive is **Beta-Binomial distribution**:

`P(k_new in n_new trials | data) = Beta-Binomial(n_new, α_post, β_post)`

```python
from scipy.stats import betabinom
# Probability of 5 successes in next 10 trials
betabinom.pmf(5, n=10, a=α_post, b=β_post)
```

> Posterior predictive **integrates over uncertainty in p**. More dispersed than Binomial(n, p̂).

#### Gamma-Poisson (count data)

For event-rate inference:

| Step | Action |
|---|---|
| Prior | `λ ~ Gamma(α, β)` (shape, rate) |
| Data | `n` observations totaling `Σx` events |
| **Posterior** | `λ | data ~ Gamma(α + Σx, β + n)` |
| Posterior mean | `(α + Σx) / (β + n)` |

```python
from scipy.stats import gamma

# Prior: weak Gamma(0.5, 0.5)
α, β = 0.5, 0.5

# Observed: 5 days, 12 events
n, sum_x = 5, 12

# Posterior
α_post, β_post = α + sum_x, β + n     # (12.5, 5.5)
post_mean_rate = α_post / β_post       # 2.27 events/day
ci = gamma.interval(0.95, a=α_post, scale=1/β_post)
```

#### Normal-Normal (continuous, known variance)

For inferring the mean of Normal data with known σ:

| Step | Action |
|---|---|
| Prior | `μ ~ Normal(μ₀, σ₀²)` |
| Data | `n` observations with sample mean `x̄` and known `σ²` |
| **Posterior** | `μ | data ~ Normal(μ_post, σ_post²)` |

**Precision-weighted update:**

`τ_post = τ₀ + n · τ` (precision = 1/σ²)
`μ_post = (τ₀ μ₀ + n τ x̄) / τ_post`

```python
def normal_normal_update(prior_mean, prior_var, data, data_var):
    n = len(data)
    x_bar = np.mean(data)
    prior_prec = 1 / prior_var
    data_prec = 1 / data_var
    post_prec = prior_prec + n * data_prec
    post_mean = (prior_prec * prior_mean + n * data_prec * x_bar) / post_prec
    post_var = 1 / post_prec
    return post_mean, post_var
```

> Posterior mean = **precision-weighted average** of prior mean and sample mean. As `n → ∞`, posterior approaches sample mean (data dominates prior).

#### Normal-Inverse-Gamma (unknown mean and variance)

For full Bayesian Normal inference:

| Prior | `μ | σ² ~ N(μ₀, σ²/κ₀)`; `σ² ~ InverseGamma(a₀, b₀)` |
| Data | `n` observations with `x̄`, `s²` |
| Posterior | Same family with updated `μ_n, κ_n, a_n, b_n` |

> Less commonly hand-derived; PyMC / Stan handle automatically.

#### Online (sequential) updating

```python
# Beta-Binomial — update one observation at a time
α, β = 1, 1
for outcome in data_stream:
    if outcome == 1: α += 1
    else:            β += 1
    print(f"Posterior: Beta({α}, {β}), mean={α/(α+β):.3f}")
```

> Conjugate updates are **streaming-friendly**: update parameters, no need to keep the data.

#### Bayesian workflow (the principled approach — Gelman et al.)

| Step | Action |
|---|---|
| 1. Pick a model | Likelihood + priors |
| 2. **Prior predictive check** | Simulate from prior; do simulated datasets look plausible? |
| 3. Fit (sample) | MCMC / VI / closed form |
| 4. Check convergence | R̂, ESS, divergences |
| 5. **Posterior predictive check** | Simulate from posterior; do they match observed? |
| 6. Sensitivity analysis | Varies prior; results stable? |
| 7. Reporting | Credible intervals + decision-relevant summaries |

#### Prior predictive check

```python
import pymc as pm
with pm.Model() as model:
    α = pm.Normal("α", 0, 10)
    β = pm.Normal("β", 0, 10)
    σ = pm.HalfNormal("σ", 1)
    obs = pm.Normal("obs", α + β * X, σ, observed=y)

with model:
    prior_pred = pm.sample_prior_predictive()
# Plot prior_pred["obs"] — does the implied data look reasonable?
```

> Prior predictive checks catch **prior misspecification**: if the simulated data range from -10⁹ to 10⁹, your prior is too wide.

#### Posterior predictive check

```python
with model:
    trace = pm.sample()
    post_pred = pm.sample_posterior_predictive(trace)

# Compare summary stats
import arviz as az
az.plot_ppc(post_pred)
```

If posterior-predictive distributions don't cover observed statistics, **model is misspecified**.

#### Hierarchical models with conjugate parts

```python
import pymc as pm

with pm.Model() as hier:
    # Hyperprior on overall conversion rate
    μ = pm.Beta("μ", 2, 2)
    κ = pm.HalfNormal("κ", 10)        # concentration

    # Per-group conversion rates
    p = pm.Beta("p", alpha=μ * κ, beta=(1 - μ) * κ, shape=n_groups)

    # Observations
    obs = pm.Binomial("obs", n=n_per_group, p=p, observed=successes)

    trace = pm.sample(2000)
```

> **Partial pooling** — groups borrow strength from each other. Low-data groups get pulled toward the global mean.

#### Bayesian model comparison

| Method | What |
|---|---|
| **Bayes factor** | Ratio of marginal likelihoods (sensitive to priors) |
| **WAIC** (Widely Applicable Information Criterion) | Posterior-aware information criterion |
| **LOO** (Leave-one-out) | Cross-validated log predictive density |
| **DIC** | Older; deprecated |

```python
with model:
    waic = pm.compute_log_likelihood(trace)
    loo = az.loo(trace)
```

> **WAIC and LOO are preferred** over Bayes factors for model selection. Bayes factors swing wildly with priors.

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Skipping prior predictive check | Run it — most prior bugs caught here |
| Improper prior leading to improper posterior | Use proper priors (Beta(α, β), Normal, Half-Normal) |
| Treating posterior mean as point estimate without uncertainty | Always report intervals |
| Beta(0.5, 0.5) as "noninformative" | It's actually a Jeffreys prior, U-shaped — careful |
| Assuming data dominates prior | True at large n; not at small n |
| Hierarchical model without non-centered param | Funnel divergence in NUTS |
| Bayes factor without sensitivity analysis | They're prior-sensitive |
| Ignoring posterior predictive checks | Misspecified model goes undetected |
| Conjugate where it doesn't apply | Most real-world likelihoods aren't conjugate; use MCMC |

#### Decision

```
Conjugate likelihood?
├─ Yes (Bernoulli, Poisson, Normal-known-σ)  → Closed-form Beta / Gamma / Normal update
└─ No                                          → MCMC (PyMC / Stan)

Online / streaming?
├─ Conjugate                                    → Constant-memory parameter updates
└─ Non-conjugate                                → Particle filter / online VI

Hierarchical structure?
└─ Yes                                          → MCMC (PyMC / Stan); use non-centered parameterization

Decision under uncertainty?
└─ Posterior predictive + utility function     → Bayesian decision theory
```

#### Use-case examples

| Application | Conjugate update |
|---|---|
| **A/B test conversion rate** | Beta-Binomial per arm |
| **Multi-arm bandit (Thompson sampling)** | Beta posteriors per arm; sample, pick max |
| **Email open-rate forecast** | Beta-Binomial |
| **Server load (Poisson rate)** | Gamma-Poisson |
| **Defect rate in manufacturing** | Gamma-Poisson |
| **Mean response time** | Normal-Normal (known σ) |
| **Topic models (LDA)** | Dirichlet-Multinomial |

**Rule of thumb:** **conjugate priors give closed-form posteriors** — Beta-Binomial for proportions, Gamma-Poisson for counts, Normal-Normal for means with known variance. Update parameters arithmetically; no MCMC needed. Always **prior + posterior predictive checks**. For non-conjugate or complex models, fall back to **PyMC / Stan with NUTS**. Conjugate priors are the **fast lane** of Bayesian inference.
