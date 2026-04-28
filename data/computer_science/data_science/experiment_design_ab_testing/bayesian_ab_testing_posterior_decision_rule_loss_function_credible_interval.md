### Bayesian A/B Testing (posterior, decision rule, loss function, credible interval)

**When:** A/B testing where you want **direct probabilistic statements** like "P(B beats A) = 87%" or "expected loss of choosing B = $0.02 / user". Bayesian framing avoids the peeking problem natively, allows decision-theoretic choices, and yields more interpretable outputs for stakeholders.

**Schema:**

| Concept | Detail |
|---|---|
| **Prior** | Belief about the metric before the experiment (often weakly informative) |
| **Likelihood** | `P(data | parameter)` — same as frequentist |
| **Posterior** | `P(parameter | data) ∝ likelihood × prior` |
| **Credible interval** (CrI) | Posterior interval containing parameter with given probability |
| `P(B > A)` | Posterior probability that variant B's metric beats A's |
| **Expected loss** | Posterior expected cost of picking the wrong variant |
| Decision rule | Pre-specify threshold (e.g., ship B if `P(B > A) > 0.95` AND `E[loss(A)] < ε`) |

> **Bayesian = direct probability statements about parameters**. Frequentist = probability statements about data given hypotheses.

#### Beta-Binomial — the canonical case

For a conversion-rate experiment with `xᵢ` successes in `nᵢ` trials and **Beta(α, β) prior**:

| Variant | Posterior |
|---|---|
| A | Beta(α + x_A, β + n_A − x_A) |
| B | Beta(α + x_B, β + n_B − x_B) |

```python
import numpy as np
rng = np.random.default_rng()

def bayes_ab_beta(x_A, n_A, x_B, n_B, alpha=1, beta=1, draws=20_000):
    post_A = rng.beta(alpha + x_A, beta + n_A - x_A, draws)
    post_B = rng.beta(alpha + x_B, beta + n_B - x_B, draws)
    p_b_beats_a = float((post_B > post_A).mean())
    expected_lift = float((post_B - post_A).mean())
    cri = np.percentile(post_B - post_A, [2.5, 97.5])
    expected_loss_choose_a = float(np.maximum(post_B - post_A, 0).mean())
    expected_loss_choose_b = float(np.maximum(post_A - post_B, 0).mean())
    return {
        "P(B>A)": p_b_beats_a,
        "expected_lift": expected_lift,
        "95% CrI lift": cri.tolist(),
        "E[loss | choose A]": expected_loss_choose_a,
        "E[loss | choose B]": expected_loss_choose_b,
    }
```

#### Continuous outcomes — Normal-Normal

For revenue per user `Y ~ N(μ, σ²)` with `Y_A` and `Y_B`:

```python
def bayes_ab_normal(Y_A, Y_B, draws=20_000):
    n_A, n_B = len(Y_A), len(Y_B)
    mean_A, mean_B = Y_A.mean(), Y_B.mean()
    se_A = Y_A.std(ddof=1) / np.sqrt(n_A)
    se_B = Y_B.std(ddof=1) / np.sqrt(n_B)
    post_A = rng.normal(mean_A, se_A, draws)
    post_B = rng.normal(mean_B, se_B, draws)
    return {
        "P(B>A)": float((post_B > post_A).mean()),
        "expected_lift": float((post_B - post_A).mean()),
        "95% CrI lift": np.percentile(post_B - post_A, [2.5, 97.5]).tolist(),
    }
```

> Uses **uninformative-ish** posterior (mean ± SE) — rough but practical. For full rigor use a proper hierarchical model in PyMC / Stan.

#### Choosing the prior

| Goal | Prior |
|---|---|
| **Uninformative** | Beta(1, 1) for proportion = uniform |
| **Weakly informative** (preferred) | Beta(α, β) with α + β small but matching baseline expectation |
| **Empirical Bayes** | Estimate prior from past similar experiments |
| **Skeptical** | Prior centered on H₀ (no effect) — "show me the evidence" |
| **Optimistic** | Prior centered on expected lift |

> A common default for CTR-type experiments: Beta(α, β) where `α / (α + β) = baseline_rate` and `α + β = 50` (mild regularization).

#### Credible interval vs confidence interval

| Bayesian credible interval | Frequentist confidence interval |
|---|---|
| "95% probability the parameter is in `(L, U)`" | "95% of CIs over replications would contain the parameter" |
| Direct probabilistic statement | Indirect long-run frequency |
| Depends on prior | Doesn't depend on prior |
| Numerically similar with weak priors | — |

#### Decision rules

| Rule | Ship if |
|---|---|
| **Threshold on P(B > A)** | `P(B > A) > 0.95` |
| **Expected loss** | `E[loss | ship B] < ε` (where ε is acceptable risk in metric units) |
| **Highest posterior density (HPD)** | 95% CrI excludes 0 |
| **Combined** | `P(B > A) > 0.95` AND `expected_lift > MDE` AND `E[loss(B)] < $0.01` |

> **Expected loss** is the most decision-useful: "if I pick B and B is actually worse, on average I lose $X per user". Use it to compare across experiments by **business cost**, not just statistical strength.

#### Bayesian sequential / no peeking problem

A core appeal: posterior summaries are valid **at every moment** (you can stop whenever you want):

> `P(B > A | data so far)` is a coherent probability statement regardless of n.

**Caveat:** classical Bayesian inference is well-defined under stopping; Type-I-error guarantees in the **frequentist sense** are not automatic. Some platforms still pair Bayesian inference with a frequentist sequential boundary for FDR control.

#### Bayesian vs frequentist A/B — comparison

| Aspect | Frequentist | Bayesian |
|---|---|---|
| Output | p-value, CI | Posterior, CrI, P(B>A), expected loss |
| Peeking | Inflates Type-I error | Posterior valid always |
| Prior | None | Required (default: weak / uniform) |
| Stakeholder communication | Indirect | Direct: "B has 92% chance of being better" |
| Multi-arm | Multiple comparisons explosion | Posterior over all arms; pick max |
| Decision-theoretic | Manual | Native via expected loss |
| Industry adoption | Default at most companies | Optimizely (legacy), Convoy, some ML stacks |

#### Worked example

A/B test on signup conversion. n = 5,000 per arm, x_A = 250 (5%), x_B = 280 (5.6%).

```python
result = bayes_ab_beta(250, 5_000, 280, 5_000, alpha=1, beta=1)
# Output:
# P(B>A) ≈ 0.83
# expected_lift ≈ 0.0060 (60 bps)
# 95% CrI lift ≈ [-0.0030, +0.0150]
# E[loss | ship B] ≈ 0.0006 (i.e., risk avg $0.6/1000 if we ship and B is wrong)
```

> If your decision rule is "ship if `P(B > A) > 0.95`": **don't ship yet** (need more data). If rule is "ship if `E[loss] < 0.001`": **ship**. Decision rule must be pre-specified.

#### Hierarchical Bayesian models

For **multiple variants** or **multiple metrics**, use a hierarchical model:

```python
# PyMC sketch
import pymc as pm

with pm.Model() as m:
    mu_global = pm.Normal("mu_global", 0.05, 0.05)        # population baseline
    sigma_v = pm.HalfNormal("sigma_v", 0.02)              # variant-level variability
    p_arm = pm.Normal("p_arm", mu_global, sigma_v, shape=K)
    obs = pm.Binomial("obs", n=trials, p=pm.math.invlogit(p_arm), observed=successes)
    trace = pm.sample()
```

> Hierarchical priors **share strength** across arms — better estimates for low-traffic variants, partial pooling regularizes extremes.

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Treating priors as "Bayesian magic" | Validate prior on past data; sensitivity-analyze |
| Reporting `P(B > A) > 0.95` as ironclad | Sensitive to prior; report sensitivity |
| Using Beta(1, 1) for everything | OK for proportions but not for skewed metrics — pick prior matching domain |
| Stopping early on weak prior signal | Combine probability + expected loss |
| Reporting CrI but using NHST framing | Pick a paradigm and stick with it |
| Ignoring multiple variants | Hierarchical model or proper joint posterior |
| Frequentist peeking but calling it "Bayesian" | If decision rule controls Type-I, declare it; mixed paradigms are common in industry |

#### Posterior predictive

`P(future_y | data)` — expected behavior of next user / impression. Useful for forecasting impact:

> "If we ship B to 1M users, our expected total revenue is $X with 95% CrI [$Y, $Z]." More actionable for product managers than abstract effect sizes.

#### Simulation-based design

Before running the experiment, **simulate** outcomes under varying truths to check operating characteristics:

```python
def simulate_decision_rule(true_p_A, true_p_B, n, n_sims=1000, threshold=0.95):
    decisions = []
    for _ in range(n_sims):
        x_A = np.random.binomial(n, true_p_A)
        x_B = np.random.binomial(n, true_p_B)
        result = bayes_ab_beta(x_A, n, x_B, n)
        decisions.append(result["P(B>A)"] > threshold)
    return np.mean(decisions)        # power if true_p_B > true_p_A; type-1 if equal
```

#### Multi-arm Bayesian (no multiple-testing correction needed)

```python
posteriors = [rng.beta(1 + x_i, 1 + n_i - x_i, draws) for x_i, n_i in arms]
joint = np.stack(posteriors, axis=1)               # (draws, K)
P_best = np.mean(np.argmax(joint, axis=1) == np.arange(K)[:, None], axis=1)
# P_best[k] = P(arm k is the best given data)
```

> Bayesian framework gives you `P(arm k is best)` directly without a correction step.

**Rule of thumb:** **Bayesian A/B = direct probability statements + decision-theoretic choices**. Use **Beta-Binomial** for proportions, **Normal-Normal** for continuous, **PyMC / Stan** for hierarchical / complex. Combine `P(B > A)` with **expected loss** in the decision rule. Posteriors are **valid at any stopping time** (no peeking problem), though frequentist Type-I guarantees still need extra care if you want them. The big win is **stakeholder communication** — "82% chance B is better" beats "p = 0.18" every time.
