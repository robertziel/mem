### Hierarchical Bayesian Models (partial pooling, random effects, multilevel, shrinkage)

**When:** modeling **groups within a population** — users in cities, students in schools, products in categories, sessions per user. Hierarchical models share information across groups via **partial pooling**, giving low-data groups stable estimates without ignoring group differences.

**Schema (the three pooling regimes):**

| Pooling | Model | Behavior |
|---|---|---|
| **No pooling** | Each group estimated independently | High variance for small groups; ignores commonalities |
| **Complete pooling** | All groups share one parameter | Ignores group-level differences |
| **Partial pooling (hierarchical)** | Group params drawn from a population-level distribution | **Best of both** — borrows strength |

> Partial pooling = "rich get poorer, poor get richer" — small-sample groups are pulled toward the population mean; large-sample groups stay closer to their own data.

#### The classic 8-schools example (Gelman)

8 schools each have an estimated SAT-prep effect with standard error. Should we use each school's estimate, the average, or something in between?

| Approach | Outcome |
|---|---|
| **No pool** | Use each school's noisy estimate |
| **Complete pool** | Use grand average for all |
| **Partial pool** | Each school's estimate is a precision-weighted blend of school data and population mean |

> Partial pooling is **Stein-style shrinkage** done principally via Bayes.

#### Generic hierarchical model

```python
import pymc as pm

with pm.Model() as model:
    # Population-level (hyperpriors)
    μ = pm.Normal("μ", mu=0, sigma=10)            # global mean
    τ = pm.HalfNormal("τ", sigma=10)               # group-level SD

    # Group-level
    θ_group = pm.Normal("θ_group", mu=μ, sigma=τ, shape=n_groups)

    # Observation-level
    obs = pm.Normal("obs", mu=θ_group[group_idx], sigma=σ_obs, observed=y)

    trace = pm.sample(2000, target_accept=0.95)
```

| Layer | Role |
|---|---|
| **Hyperprior** (`μ, τ`) | Distribution from which group params are drawn |
| **Group level** (`θ_group`) | Per-group estimates — pulled toward `μ` if data is sparse |
| **Observation level** | Likelihood given group param |

#### Non-centered parameterization (essential for NUTS)

The "centered" form above creates **funnel geometry** that NUTS struggles with. Reparameterize:

```python
with pm.Model() as model_nc:
    μ = pm.Normal("μ", 0, 10)
    τ = pm.HalfNormal("τ", 10)
    θ_raw = pm.Normal("θ_raw", 0, 1, shape=n_groups)   # standard normal
    θ = pm.Deterministic("θ", μ + τ * θ_raw)            # transform

    obs = pm.Normal("obs", mu=θ[group_idx], sigma=σ_obs, observed=y)
```

> Decouples the location (μ) from scale (τ) — NUTS samples efficiently. **Always use non-centered for hierarchical funnels.**

#### Shrinkage in action

Estimate of a group with sparse data is pulled toward the population mean. Effect size:

`shrinkage = τ² / (τ² + σ²/n_g)`

- High `n_g` (lots of group data) → shrinkage near 0 (use group estimate)
- Low `n_g` → shrinkage near 1 (use population mean)
- High `τ` (groups are very different) → less shrinkage
- Low `τ` (groups similar) → more shrinkage

> Hyperprior on `τ` is **learned from data** — the model decides how much to shrink.

#### Beta-Binomial hierarchical (A/B testing across groups)

```python
with pm.Model() as multi_arm:
    μ = pm.Beta("μ", 2, 2)                       # global conversion rate
    κ = pm.HalfNormal("κ", 10)                    # concentration
    p = pm.Beta("p", alpha=μ * κ, beta=(1 - μ) * κ, shape=n_arms)
    obs = pm.Binomial("obs", n=n_per_arm, p=p, observed=successes)
    trace = pm.sample(2000)
```

> Cross-arm shrinkage: an arm with 0/100 successes is pulled toward the global rate, not declared dead.

#### Multilevel regression (random intercepts / slopes)

```python
# Random intercept per group
with pm.Model() as ri:
    α_pop = pm.Normal("α_pop", 0, 10)
    σ_α = pm.HalfNormal("σ_α", 5)
    α_group = pm.Normal("α_group", α_pop, σ_α, shape=n_groups)

    β = pm.Normal("β", 0, 10)
    σ = pm.HalfNormal("σ", 1)

    μ = α_group[group_idx] + β * X
    obs = pm.Normal("obs", μ, σ, observed=y)

# Random intercept + random slope per group
with pm.Model() as rs:
    α_pop = pm.Normal("α_pop", 0, 10)
    β_pop = pm.Normal("β_pop", 0, 10)
    σ_α = pm.HalfNormal("σ_α", 5)
    σ_β = pm.HalfNormal("σ_β", 5)

    α_group = pm.Normal("α_group", α_pop, σ_α, shape=n_groups)
    β_group = pm.Normal("β_group", β_pop, σ_β, shape=n_groups)

    μ = α_group[group_idx] + β_group[group_idx] * X
    obs = pm.Normal("obs", μ, σ_obs, observed=y)
```

#### Frequentist counterparts

| Bayesian | Frequentist |
|---|---|
| Hierarchical model | Mixed-effects model / lme4 / statsmodels MixedLM |
| Random intercept | Random effect |
| Partial pooling | BLUP (best linear unbiased predictor) |
| Hyperprior | Variance components |
| Posterior interval | Confidence interval (asymptotic) |

> The math is similar; Bayesian gives you full posterior over all parameters including group-level.

#### When to use hierarchical

| Scenario | Hierarchical helps |
|---|---|
| Many groups, varying sample sizes | Stabilize small groups via shrinkage |
| Outcome varies by group | Allow group-level variation |
| Group structure (school, region, user) | Natural hierarchical specification |
| Repeated measures | Random effects per subject |
| Multi-level data (students within schools within districts) | Nested hierarchies |
| Pooling small studies (meta-analysis) | Partial pool across studies |

#### When NOT to bother

| Scenario | Why |
|---|---|
| Single group | No hierarchy to model |
| All groups have huge sample | Pooling has little effect; flat model is enough |
| Group structure not meaningful | Model misspecification |
| Need very fast inference | Closed-form Beta-Binomial may suffice |

#### Common patterns

##### Random intercepts

```
y_{ij} = α + α_j + β x_{ij} + ε_{ij}
α_j ~ N(0, τ²)
```

> Each group has its own intercept; one slope shared.

##### Random intercepts + slopes

```
y_{ij} = α + α_j + (β + β_j) x_{ij} + ε_{ij}
(α_j, β_j) ~ MVN(0, Σ)
```

> Each group has its own intercept AND slope. Σ captures correlation between intercept and slope.

##### Three-level (students in schools in districts)

```
y_{ijk} = α + α_k + α_{jk} + β x_{ijk} + ε_{ijk}
```

#### Practical issues

| Issue | Fix |
|---|---|
| Slow sampling | Non-centered parameterization |
| Divergent transitions | Increase target_accept; reparameterize |
| One group dominates | Robust priors (e.g., Cauchy on hyperparams) |
| Convergence problems | Run more chains; check trace plots |
| Many groups (>1000) | Variational inference / SVI |
| Cross-classified hierarchies | Use multivariate hyperprior |

#### Multilevel regression in lme4 / statsmodels

```python
# statsmodels (frequentist) — quick alternative
import statsmodels.formula.api as smf
model = smf.mixedlm("y ~ x", data, groups=data["group"]).fit()
print(model.summary())
```

| When | Use |
|---|---|
| Quick mixed-effects regression | statsmodels MixedLM / lme4 |
| Full Bayesian with priors | PyMC / brms / Stan |

#### Communicating hierarchical results

| What to report | Detail |
|---|---|
| Population-level estimate | `μ` and its CrI |
| Group-level variance (`τ`) | How much groups differ |
| Shrinkage factors | Per-group; visualize |
| Per-group estimates | With CrIs |
| Posterior predictive checks | Per-group |
| Comparison to no-pool / full-pool | Show advantage of partial |

#### Visualizations

| Plot | What |
|---|---|
| **Forest plot** | Per-group posterior with CrI |
| **Funnel plot** | Estimate vs precision; shrinkage visible |
| **Posterior of `τ`** | How heterogeneous the groups are |
| **Caterpillar plot** | Posterior intervals stacked |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Centered parameterization in funnel | Non-centered |
| Ignoring shrinkage in interpretation | Group estimates are not raw means |
| Treating hyperparams as data-determined absolutely | They have posterior uncertainty too |
| Hierarchical when no group structure | Adds noise, not signal |
| Too few groups (< 5) for stable hyperprior | Use weakly-informative prior, expect wide intervals |
| Reporting only point estimates | Always intervals — uncertainty is the point |

#### Examples

| Application | Hierarchical structure |
|---|---|
| Student test scores | Students within schools within districts |
| Sports analytics | Players within teams within seasons |
| Drug efficacy | Patients within trials within drugs |
| Conversion rate per region | Regions within country |
| Recommendation rating | Users within demographic groups |
| Survey data | Respondents within strata |
| Sensor networks | Sensors within sites within regions |

**Rule of thumb:** **hierarchical Bayesian = partial pooling** — small groups borrow strength from the population, large groups keep their own estimates. Always **non-centered parameterization** for NUTS efficiency. Use **PyMC / Stan / brms** for full Bayesian; **statsmodels MixedLM / lme4** for fast frequentist mixed-effects. The big wins are **stable estimates for sparse groups**, **calibrated uncertainty across levels**, and **shared learning across the hierarchy**.
