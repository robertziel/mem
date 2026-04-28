### Bayesian Inference (PyMC, Stan, MCMC, Metropolis-Hastings, NUTS, Hamiltonian)

**When:** quantify uncertainty about model parameters, combine prior knowledge with data, build hierarchical models, do A/B testing with credible intervals. Bayesian inference gives **posterior distributions over parameters**, not just point estimates — directly answering "what's the probability that θ > 0?" without p-value gymnastics.

**Schema:**

| Concept | Symbol | Detail |
|---|---|---|
| **Prior** | `p(θ)` | Belief about parameters before data |
| **Likelihood** | `p(data | θ)` | Probability of data given parameters |
| **Posterior** | `p(θ | data) ∝ p(data | θ) · p(θ)` | Updated belief after data |
| **Marginal likelihood** | `p(data) = ∫ p(data | θ) p(θ) dθ` | Normalizing constant |
| **Credible interval** | 95% interval of posterior | Bayesian "confidence interval" |
| **Posterior predictive** | `p(y_new | data) = ∫ p(y | θ) p(θ | data) dθ` | Forecast distribution |

> Bayes' rule: `posterior ∝ likelihood × prior`. For most problems the integral is intractable; we **sample** from the posterior via MCMC.

#### MCMC algorithms (sampling from posterior)

| Algorithm | What | When |
|---|---|---|
| **Metropolis-Hastings** | Propose, accept/reject by likelihood ratio | Universal but slow for complex posteriors |
| **Gibbs sampling** | Sample each variable conditionally on others | Conjugate models |
| **Hamiltonian Monte Carlo (HMC)** | Use gradient + momentum to traverse posterior | Continuous; high-dim |
| **NUTS** (No-U-Turn Sampler) | Auto-tunes HMC trajectory length | **Default in Stan / PyMC** |
| **SMC** (Sequential Monte Carlo) | Particle-based; handles multimodal | Niche |
| **VI** (Variational Inference) | Approximate posterior with simpler distribution | Fast; less accurate |
| **ADVI** (Auto-diff Variational) | VI with autodiff | PyMC default for fast |

#### Metropolis-Hastings (the foundational algorithm)

```python
def metropolis_hastings(log_posterior, x0, n_samples, proposal_std=1.0):
    samples = [x0]
    x = x0
    log_p = log_posterior(x)
    for _ in range(n_samples - 1):
        x_new = x + np.random.normal(0, proposal_std)
        log_p_new = log_posterior(x_new)
        if np.log(np.random.random()) < log_p_new - log_p:
            x, log_p = x_new, log_p_new
        samples.append(x)
    return np.array(samples)
```

| Property | Detail |
|---|---|
| Acceptance rate | Tune `proposal_std` to ~0.234 (Roberts-Gelman-Gilks) |
| Burn-in | Discard first 10–50% of chain |
| Autocorrelation | Thin samples or accept higher autocorrelation |
| Mixing | Multiple chains starting from different points |

#### NUTS / HMC (modern default)

Use **gradient information** to move efficiently through the posterior. Avoids the random-walk inefficiency of Metropolis-Hastings.

| Property | Detail |
|---|---|
| Requires differentiable posterior | Most parametric models qualify |
| Auto-tunes step size + trajectory length | Less manual tuning |
| 10–100× more efficient than M-H per sample | Standard for high-dim |
| Implemented in Stan, PyMC, Numpyro, TFP | Cross-platform |

#### PyMC (the Python default)

```python
import pymc as pm
import numpy as np

# Bayesian linear regression
with pm.Model() as model:
    # Priors
    α = pm.Normal("α", mu=0, sigma=10)
    β = pm.Normal("β", mu=0, sigma=10)
    σ = pm.HalfNormal("σ", sigma=1)

    # Likelihood
    μ = α + β * X
    obs = pm.Normal("obs", mu=μ, sigma=σ, observed=y)

    # Sample posterior
    trace = pm.sample(2000, tune=1000, chains=4, target_accept=0.95)

# Diagnose
pm.summary(trace)
pm.plot_trace(trace)

# Posterior predictive
with model:
    pp = pm.sample_posterior_predictive(trace)
```

#### Stan (the reference implementation)

```python
# stan_model.stan
"""
data {
    int<lower=0> N;
    vector[N] x;
    vector[N] y;
}
parameters {
    real alpha;
    real beta;
    real<lower=0> sigma;
}
model {
    alpha ~ normal(0, 10);
    beta ~ normal(0, 10);
    sigma ~ normal(0, 1);
    y ~ normal(alpha + beta * x, sigma);
}
"""
import cmdstanpy
model = cmdstanpy.CmdStanModel(stan_file="stan_model.stan")
fit = model.sample(data={"N": len(y), "x": x, "y": y}, chains=4)
```

> Stan is **the gold standard**; PyMC and Numpyro implement similar algorithms in Python.

#### Convergence diagnostics

| Diagnostic | Meaning |
|---|---|
| **`R̂` (R-hat / Gelman-Rubin)** | < 1.01 = converged across chains |
| **ESS** (effective sample size) | Should be ≥ 400 for posterior intervals |
| **Divergences** (HMC) | Should be 0 — non-zero indicates problem geometry |
| **Trace plots** | Should look like "fuzzy caterpillars" |
| **Autocorrelation** | Should decay quickly |

```python
print(pm.summary(trace, var_names=["α", "β", "σ"]))
# r_hat column should be < 1.01 for all parameters
# ess_bulk and ess_tail should be > 400
```

#### Common issues + fixes

| Issue | Fix |
|---|---|
| Divergences during sampling | Increase `target_accept=0.99`; reparameterize hierarchical model (non-centered) |
| Slow mixing (high autocorrelation) | Use NUTS not Metropolis; reparameterize; standardize predictors |
| Multimodal posterior | Multiple chains; SMC sampler |
| `R̂ > 1.01` | More tuning + samples; check priors |
| Funnel geometry (hierarchical) | **Non-centered parameterization** |

#### Non-centered parameterization (key trick)

Hierarchical models often have **funnel** geometries that NUTS struggles with. Reparameterize:

```python
# CENTERED (problematic)
σ_group = pm.HalfNormal("σ_group", 1)
μ_group = pm.Normal("μ_group", mu=0, sigma=σ_group, shape=n_groups)

# NON-CENTERED (better)
σ_group = pm.HalfNormal("σ_group", 1)
μ_raw = pm.Normal("μ_raw", mu=0, sigma=1, shape=n_groups)
μ_group = pm.Deterministic("μ_group", σ_group * μ_raw)
```

> The non-centered form decouples the location from the scale, making the geometry NUTS-friendly.

#### Variational Inference (VI / ADVI) — fast alternative

Approximate the posterior with a simpler family (e.g., Normal):

```python
with model:
    approx = pm.fit(method="advi", n=20_000)
    trace = approx.sample(2000)
```

| Pro | Con |
|---|---|
| 10–1000× faster than MCMC | Can underestimate variance |
| Scales to large data | Doesn't recover correlations across parameters in mean-field |
| Differentiable | Limited to continuous posteriors |

> Use VI for **prototyping / large data**; check key results with MCMC if accuracy critical.

#### When Bayesian beats frequentist

| Use case | Why |
|---|---|
| Small sample, prior knowledge available | Prior regularizes |
| Complex hierarchical structure | Natural in Bayesian framework |
| Need P(parameter > X) | Direct from posterior |
| Decision under uncertainty | Posterior predictive + utility |
| Sequential / online inference | Update posterior as data arrives |
| Combining studies (meta-analysis) | Hierarchical models |
| Calibrated uncertainty | Better than point estimates |
| Missing data | Treat as parameter; impute via posterior |

#### When frequentist might be better

| Use case | Why |
|---|---|
| Very large data, weak prior | Posterior dominated by likelihood — same answer |
| Need long-run frequency guarantees | Frequentist designed for this |
| Speed-critical | MCMC is slow |
| Black-box model (no likelihood) | Use bootstrap |
| Regulatory / familiar to consumers | p-values still expected |

#### Posterior predictive checks

```python
# Generate data from posterior
with model:
    pp = pm.sample_posterior_predictive(trace, var_names=["obs"])

# Compare to observed
pp_y = pp.posterior_predictive["obs"].values    # (chains, draws, n_obs)
plt.hist(pp_y.mean(axis=(0, 1)), label="posterior predictive mean")
plt.axvline(y.mean(), color="red", label="observed mean")
```

> Compare summary statistics of posterior-predictive samples to observed data. If they don't match, model is misspecified.

#### Bayesian A/B testing example

```python
with pm.Model() as ab:
    # Conversion rate priors
    p_A = pm.Beta("p_A", alpha=1, beta=1)
    p_B = pm.Beta("p_B", alpha=1, beta=1)

    # Likelihood
    obs_A = pm.Binomial("obs_A", n=n_A, p=p_A, observed=x_A)
    obs_B = pm.Binomial("obs_B", n=n_B, p=p_B, observed=x_B)

    # Quantity of interest
    diff = pm.Deterministic("diff", p_B - p_A)

    trace = pm.sample(2000)

# Direct probability statements:
prob_b_better = (trace.posterior["diff"].values > 0).mean()
print(f"P(B > A) = {prob_b_better:.3f}")
```

#### Choosing priors

| Type | Use |
|---|---|
| **Uninformative / flat** | When you genuinely have no info; risky |
| **Weakly informative** | Default — gentle regularization |
| **Conjugate** | Closed-form; Beta-Binomial, Normal-Normal |
| **Empirical** | Estimate from past data |
| **Hierarchical** | Pool from related units |
| **Skeptical** | Centered on null effect |
| **Optimistic** | Centered on expected effect |

> **Always do prior predictive checks**: simulate from prior alone — does the data look plausible? If not, prior is too tight or too wide.

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Improper prior leading to improper posterior | Use proper, weakly informative priors |
| Not checking convergence | Always inspect R̂ and trace plots |
| Single chain | Run ≥ 4 chains |
| Tiny ESS reported as "fine" | ESS < 400 means inadequate sampling |
| Centered parameterization in funnel | Non-centered |
| MCMC on huge data without subsampling | VI or stochastic VB |
| Comparing Bayes factor without checking sensitivity to priors | They're prior-sensitive; report sensitivity |
| Ignoring HMC divergences | They signal model issues — don't dismiss |
| Reporting CI without accounting for prior | Cl is informed by prior — be transparent |

#### Workflow

| Step | Action |
|---|---|
| 1 | Specify model (priors + likelihood) |
| 2 | Prior predictive check |
| 3 | Sample posterior (MCMC / VI) |
| 4 | Check convergence (R̂, ESS, divergences) |
| 5 | Posterior predictive check |
| 6 | Summarize: posterior intervals, P(quantity) |
| 7 | Sensitivity analysis (different priors) |

#### Tools

| Tool | Strength |
|---|---|
| **Stan / CmdStanPy** | Gold standard; fast |
| **PyMC** | Pythonic; large ecosystem |
| **Numpyro / TFP** | JAX / TensorFlow; GPU-friendly |
| **brms** (R) | Stan-backed; formula syntax |
| **rstan** (R) | R wrapper |
| **emcee** | Pure Python; affine-invariant ensemble sampler |
| **JAGS / BUGS** | Older, Gibbs-based |

#### Speed tips

| Speed-up | How |
|---|---|
| Center / scale predictors | Better mixing |
| Non-centered parameterization | Hierarchical models |
| Vectorize | Batch likelihoods |
| GPU (Numpyro, JAX) | 10× on large models |
| VI / ADVI | When MCMC too slow |
| Subsample data | For initial prototyping |
| Compile model once | PyMC / Stan auto-cache |

**Rule of thumb:** **Bayesian = posterior over parameters via MCMC**. Use **NUTS** (Stan / PyMC default) for continuous models, **VI / ADVI** for fast approximate. **Always check convergence** (R̂ < 1.01, ESS > 400, no divergences). **Non-centered parameterization** for hierarchical funnels. **Weakly informative priors** unless you have strong knowledge. The big wins are **direct probability statements**, **hierarchical structure**, and **calibrated uncertainty**.
