### Sequential Testing (SPRT, mSPRT, always-valid p-values, continuous monitoring, peeking)

**When:** you want to **monitor an A/B test continuously** and stop as soon as there's enough evidence — without inflating the Type-I error rate. Standard fixed-horizon p-values become invalid the moment you peek; sequential methods stay valid no matter when you look.

**Schema:**

| Concept | Detail |
|---|---|
| Fixed-horizon test | Single p-value computed at pre-specified n; valid only if you don't look early |
| **Peeking problem** | Repeatedly checking p < 0.05 inflates Type-I to ~30% (or worse) |
| **Sequential test** | Stop boundary that maintains overall α regardless of when you stop |
| **Always-valid p-value** | A p-value that's valid at **every moment** of the experiment |
| Trade-off | Slightly less powerful than fixed-horizon at the same `n`, but you can stop earlier |

#### The peeking problem (concretely)

You peek 10 times during an experiment, stopping if `p < 0.05` at any peek:

| Peeks | Family-wise Type-I error |
|---|---|
| 1 | 5% |
| 5 | ~14% |
| 10 | ~19% |
| 100 | ~37% |
| 1000 | ~53% |

> Continuous monitoring with naive p-values is roughly equivalent to **always rejecting** at typical experiment lengths.

#### SPRT (Sequential Probability Ratio Test — Wald 1945)

Tests `H₀: θ = θ₀` vs `H₁: θ = θ₁` (two simple hypotheses).

| Step | Action |
|---|---|
| 1 | Specify `α, β` (Type-I, Type-II) |
| 2 | Compute thresholds: `A ≈ (1 − β) / α`, `B ≈ β / (1 − α)` |
| 3 | After each new observation, update **likelihood ratio** `Λ_n = ∏ p(xᵢ | θ₁) / p(xᵢ | θ₀)` |
| 4 | If `Λ_n ≥ A` → reject H₀ (favor H₁) |
| 5 | If `Λ_n ≤ B` → accept H₀ |
| 6 | Otherwise → continue sampling |

**Optimality (Wald):** SPRT minimizes expected sample size among all tests with given `α, β` for the simple hypotheses tested.

#### mSPRT (mixture SPRT — composite hypotheses)

Real A/B tests have **composite** alternatives ("any improvement"). mSPRT mixes the SPRT over a prior distribution on the alternative effect:

- Prior `π(θ)` on the effect size under H₁
- Mixture likelihood: `Λ_n = ∫ ∏ p(xᵢ | θ) / p(xᵢ | θ₀) · π(θ) dθ`
- Same threshold rule

> **Used at Optimizely, Microsoft (Statistical Rigor), Eppo, Statsig.** The dominant industrial sequential test for A/B platforms.

#### Always-valid p-values

For each time step `t`, define a p-value `pₜ` such that:

`P(∃ t: pₜ ≤ α | H₀) ≤ α`

That is, the **supremum** of false rejections over all stopping times stays bounded by α. Implementations (Howard, Ramdas, McAuliffe, Sekhon 2021) use confidence sequences from concentration inequalities:

| Bound | When |
|---|---|
| Robbins / mixture supermartingale | General |
| Empirical Bernstein | Bounded outcomes |
| Sub-Gaussian | Variance-controlled outcomes |

#### Group sequential designs (pre-specified interim looks)

Different paradigm: pre-specify `K` interim looks at fractions `t₁ < t₂ < … < t_K = 1` of total `N`.

| Boundary | Behavior |
|---|---|
| **Pocock** | Same threshold at every look — easy stopping early |
| **O'Brien-Fleming** | Stricter early, looser late — minimal early-stopping bias |
| **Haybittle-Peto** | Very strict early (e.g., p < 0.001), normal at end |
| **α-spending function** | Continuous form; pick a function `α*(t)` that integrates to α |

> Standard in **clinical trials**. Less common in tech A/B because they require pre-specifying look times.

#### When to use each

| Situation | Use |
|---|---|
| Industrial A/B platform with continuous monitoring | **mSPRT** / always-valid p-values |
| Pre-registered look at days 7, 14, 28 | Group sequential (O'Brien-Fleming default) |
| Single fixed-horizon test | Standard t-test / z-test |
| Bandits (allocate to better arm) | Multi-armed bandit (different paradigm) |
| Phase III clinical trial | Group sequential with FDA-approved boundaries |

#### Code (mSPRT for two-proportion test, normal approximation)

```python
import numpy as np
from scipy import stats

class mSPRT_proportions:
    def __init__(self, alpha=0.05, prior_var=0.01):
        self.alpha = alpha; self.prior_var = prior_var
        self.x_A = self.x_B = self.n_A = self.n_B = 0

    def update(self, conv_A, n_new_A, conv_B, n_new_B):
        self.x_A += conv_A; self.n_A += n_new_A
        self.x_B += conv_B; self.n_B += n_new_B

    def always_valid_pvalue(self):
        p_A = self.x_A / max(self.n_A, 1)
        p_B = self.x_B / max(self.n_B, 1)
        diff = p_B - p_A
        var = (p_A*(1-p_A)/max(self.n_A,1) + p_B*(1-p_B)/max(self.n_B,1))
        # mixture likelihood ratio under N(0, prior_var) prior on effect
        ratio = np.sqrt(var / (var + self.prior_var)) * np.exp(
            (diff**2) / (2*var) * (self.prior_var / (var + self.prior_var))
        )
        # always-valid p-value
        return min(1.0, 1.0 / ratio)
```

> Real implementations handle continuous outcomes, robust priors, and edge cases (empty arms, zero variance). Use **production libraries** (Eppo / Statsig SDK, `confseq` Python package).

#### Stopping rules — what to compare against

| Boundary | Approximate value |
|---|---|
| SPRT upper threshold (`A`) | `(1 − β) / α` ≈ `1/α` for small β |
| SPRT lower threshold (`B`) | `β / (1 − α)` ≈ β |
| mSPRT critical likelihood ratio | `1/α` |
| Confidence sequence at α = 0.05 | Wider than the fixed-horizon CI; converges to fixed-horizon at `t → ∞` |

#### Power vs sample size — sequential vs fixed

| Method | Expected n under H₁ | Worst-case n |
|---|---|---|
| Fixed-horizon | n_fixed (pre-computed) | n_fixed |
| **SPRT** | ~50% of n_fixed | unbounded (truncate) |
| **mSPRT** | ~60% of n_fixed | larger than fixed if no truncation; truncate at e.g. `2 · n_fixed` |
| Group sequential (O'Brien-Fleming) | ~80% of n_fixed | n_fixed |

> Sequential tests **save sample size when the effect is real**, at the cost of more conservatism when there's no effect.

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Using fixed-horizon p-value while peeking | Use mSPRT or always-valid p-value |
| Choosing α at each look = full α | Pre-specify spending or use sequential |
| Using SPRT for composite hypotheses without mixing | Use **mSPRT** instead of plain SPRT |
| Stopping early on a small effect | mSPRT can fire early on tiny effects; pair with **MDE** check |
| Continuing past truncation | Set a hard `max_n` and treat as "inconclusive" if reached |
| Reporting SPRT confidence intervals using fixed-horizon CI | Use **anytime-valid CI** (confidence sequence) |
| Assuming sequential always saves time | If effect is small / null, sequential may take **longer** than fixed-horizon |
| Mixing prior misspecification | Verify with simulation; mSPRT is robust but not invariant to absurd priors |

#### Confidence sequences (the CI counterpart)

A **confidence sequence** is a sequence `(L_t, U_t)` such that:

`P(∀ t: θ ∈ (L_t, U_t)) ≥ 1 − α`

> Anytime-valid: you can stop and report the CI at **any** time without inflating coverage. Wider than fixed-horizon CIs at the same `t`, but valid at **every** `t`.

#### Industrial implementations

| Vendor / library | Method |
|---|---|
| **Optimizely Stats Engine** | mSPRT |
| **Microsoft ExP / VWO** | Group sequential |
| **Eppo** | Always-valid via mSPRT-style |
| **Statsig** | Sequential / always-valid |
| **NetEase / Booking.com** | Combinations of the above |
| Open-source: **`confseq` Python package** | Robbins-style anytime CIs |

#### Interpretation difference

| Test | "What does p < α mean?" |
|---|---|
| Fixed-horizon | "Among experiments with no effect, ≤ α reject at this exact n" |
| **Always-valid p** | "Among experiments with no effect, ≤ α reject at **any time**" |

**Rule of thumb:** **continuous monitoring requires sequential methods**. Use **mSPRT or always-valid p-values** for tech A/B platforms; **group sequential (O'Brien-Fleming)** for pre-specified interim looks. Sequential tests **save n when the effect is real**, at the cost of being slightly more conservative when there's no effect. Always **truncate** at a hard `max_n` and report inconclusive there. Never use **fixed-horizon p-values** with peeking — Type-I error inflates from 5% to >30% at typical peeking rates.
