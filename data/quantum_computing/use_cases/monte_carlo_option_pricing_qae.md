### Option Pricing — Quantum Amplitude Estimation (QAE) for Monte Carlo

**Problem:** Price a derivative with payoff `f(S_T)` given a stochastic model for the underlying `S_t` (geometric Brownian motion, Heston, jump-diffusion). Fair price `= e^{-rT} E[f(S_T)]`. Classical Monte Carlo converges at `O(1/√M)` for `M` samples → need `M ~ 10^6–10^8` for tight quotes on exotic / path-dependent instruments.

**Quantum formulation:** Load the risk-neutral distribution `p(s)` into amplitudes via a state-preparation unitary `A`:
`A|0⟩ = Σ_s √p(s) |s⟩`.
Apply a payoff encoder that rotates an ancilla by an angle proportional to `f(s)`:
`|s⟩|0⟩ → |s⟩(√(1 − f̃(s)) |0⟩ + √f̃(s) |1⟩)` with `f̃` linear-in-`f` after rescaling. The ancilla's measured `|1⟩` probability equals `E[f̃(S_T)]`; **QAE** estimates this expectation to precision `ε` using `O(1/ε)` circuit calls — a **quadratic speedup** over `O(1/ε²)` classical MC.

**Expected speedup:** `O(√N)` in samples → genuine polynomial advantage, one of the cleanest quantum-algorithmic wins for a non-structured workload. Caveat: the prefactor hides the cost of (a) loading `p(s)` and (b) depth required by canonical QAE (phase estimation on the Grover operator). The cross-over point against a modern classical MC engine (with QMC, Sobol sequences, control variates) sits at ε small enough that the depth is outside NISQ reach — a fault-tolerant story.

**Key insight:** QAE is Grover's algorithm repurposed for expectation values: the Grover operator reflects the state about the "success" subspace, and its eigenvalues encode the hit-probability `p` we want. Phase estimation on that operator extracts `p` to precision `ε` in `O(1/ε)` queries, replacing MC's `O(1/ε²)`. The structural quadratic win is *not problem-specific* — it applies to any expectation-of-function-of-a-sampled-random-variable workload, not just options.

**Status 2026 (concept-level):** Shallow variants — **iterative QAE (IQAE), MLQAE, canonical QAE** — are well-studied and demonstrated on NISQ for tiny instances (vanilla European options, small Asian / barrier). Verified advantages exist in domain X = *asymptotic-shot regime*, i.e., where ε is tight enough that `1/ε` beats `1/ε²` despite depth overhead. Production option desks still use classical MC; quantum remains R&D. The cleanest use-case narrative: risk-sensitive calculations (CVaR, tail losses, regulatory capital) where ε requirements are tight and the payoff structure is simple enough to encode shallowly.

**Qiskit Finance snippet (European call via QAE):**
```python
from qiskit_finance.circuit.library import LogNormalDistribution
from qiskit_finance.applications.estimation import EuropeanCallPricing
from qiskit_algorithms import IterativeAmplitudeEstimation
from qiskit.primitives import StatevectorSampler

n_qubits = 3                                              # 2^3 price grid
uncertainty = LogNormalDistribution(num_qubits=n_qubits,
                                    mu=0.03, sigma=0.1,
                                    bounds=(0.5, 1.5))
call = EuropeanCallPricing(num_state_qubits=n_qubits,
                           strike_price=1.0, rescaling_factor=0.25,
                           bounds=(0.5, 1.5), uncertainty_model=uncertainty)
iqae = IterativeAmplitudeEstimation(epsilon_target=0.01, alpha=0.05,
                                    sampler=StatevectorSampler())
result = call.evaluate(iqae)
print("estimated fair value:", result)
```

**QAE variants — depth vs. shots trade-off:**
| Variant | Max circuit depth | Shots | Estimator |
|---|---|---|---|
| Canonical QAE (QPE-based) | `O(1/ε)` (deep) | `O(1)` per run | exact bits from phase estimation |
| MLQAE | graded depths | many | MLE over fidelity curve |
| IQAE | adaptive Grover powers | adaptive | confidence-interval driven |
| Power-law / faster QAE | tunable | tunable | trades depth for shots |

**Related workloads:** the QAE machinery carries over to Value-at-Risk and Conditional VaR estimation, CVA / XVA adjustments, credit-portfolio loss distributions, and any expectation of a payoff function under a loaded distribution. The hard part — preparing `A|0⟩ = Σ √p(s) |s⟩` — is the same; the payoff encoding is the instrument-specific piece. Price and CVaR can share a loader, which makes QAE attractive for risk desks that must recompute many functionals on the same distribution.

**Loader options in practice:** qGAN training fits a shallow circuit to match target moments of `p(s)`, trading circuit depth for distribution error; Grover-Rudolph works for analytically integrable distributions; piecewise-polynomial encodings cover heavy-tailed distributions when moments matter more than shape. Budget the distribution error as a fixed term `ε_load` added to the QAE error `ε_qae` — the effective precision is `ε_load + ε_qae`, not `ε_qae` alone.

**Pitfalls:**
- **Loading `p(s)` is the bottleneck.** Amplitude encoding a generic distribution is exponentially expensive; use low-depth circuits (qGAN-trained, fitted Gaussian, Hadamard mixtures) and accept distribution error as an additive term in the final price bound.
- **Rescaling the payoff** (so the encoded amplitude stays in `[0, 1]`) inflates `ε` back toward classical; budget the rescaling factor against the target basis-point precision.
- **Depth vs. noise:** canonical QAE needs phase-estimation depth that NISQ can't reach at useful precision; pick IQAE / MLQAE / power-law QAE. The depth budget trades against shot count on a continuum.
- **Path-dependent payoffs** (Asian, barrier) need multi-step loading — extra qubits per time step, driving depth up quickly. Consider loading the joint terminal distribution directly if possible.
- **Greeks (delta, gamma, vega)** need separate amplitude estimations unless shared structure is exploited — budget for the full vector, not just the price.
- **Confidence-interval reporting** matters in finance: IQAE gives explicit CIs, canonical QAE bits are hardware-exact — pick by audit requirements, not just by mean error.

**Rule of thumb:** QAE buys a `√N` shot-count win *asymptotically*; on hardware today, it's a depth-vs-shots knob rather than a production speedup. Use it as the canonical example of a real quadratic advantage when the depth budget exists.
