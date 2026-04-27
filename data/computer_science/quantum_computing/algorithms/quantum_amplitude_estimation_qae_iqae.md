### Quantum Amplitude Estimation — QAE and IQAE

**What it is:** Given an oracle `A` that prepares `A|0⟩ = √(1-a)|ψ_0⟩|0⟩ + √a|ψ_1⟩|1⟩`, estimate `a` to additive error `ε`. QAE achieves `O(1/ε)` oracle calls — a **√N Monte Carlo speedup** over the classical `O(1/ε²)` rate. This is the engine behind quantum Monte Carlo, quantum finance (option pricing, VaR), quantum risk analysis, and numerical integration.

**Standard QAE:** Runs QPE on the Grover-like operator `Q = A S_0 A† S_ψ` whose eigenphase encodes `θ = arcsin(√a)`. Uses `m` counting qubits → `2^m` controlled-`Q` applications → `a` estimated to `O(2^{-m})`.

**IQAE (Iterative QAE):** Grinko–Gacon–Zoufal–Woerner 2021. Avoids QPE and QFT entirely. Instead runs `m` rounds of `A Q^{k_i} A†` at increasing powers `k_i`, collecting Bernoulli statistics each round, and uses a likelihood/confidence-interval shrinkage schedule to achieve the same `O(1/ε)` scaling — with dramatically shallower circuits.

**Comparison:**

| Variant | Ancillas | Max depth | QFT | NISQ-friendly |
|---|---|---|---|---|
| Classical MC | 0 | 0 | — | Yes |
| Standard QAE (QPE) | `m` | `2^m · depth(Q)` | Yes | No |
| MLE-QAE (Suzuki 2020) | 0 | tunable | No | Partial |
| IQAE (2021) | 0 | tunable, adaptive | No | **Yes** |

**Math:** Standard QAE outputs `ã = sin²(π y / 2^m)` where `y` is the measured QPE outcome. Additive error `ε ~ π / 2^m`. IQAE uses the same `sin²(kθ)` probability structure but estimates `θ` by combining shot counts at a sequence of `k` values chosen adaptively.

**Qiskit code (IQAE):**
```python
from qiskit_algorithms import IterativeAmplitudeEstimation, EstimationProblem
from qiskit.primitives import Sampler

# toy problem: oracle prepares state with known amplitude a
problem = EstimationProblem(state_preparation=A_circuit,
                            objective_qubits=[0])

iqae = IterativeAmplitudeEstimation(
    epsilon_target=0.01,       # additive error
    alpha=0.05,                # confidence 1-alpha
    sampler=Sampler(),
)
result = iqae.estimate(problem)
print(result.estimation, result.confidence_interval)
```

**When to use:**
- Monte Carlo integration where the integrand can be loaded as an amplitude.
- Option pricing: `a = E[payoff]` under risk-neutral measure encoded in `A`.
- Any expectation-value estimate that would otherwise need `1/ε²` samples.

**Example: European option pricing.**
1. Load risk-neutral price distribution into amplitudes via a shallow QGAN or direct `RY` rotations.
2. Apply a "payoff circuit" that writes `max(S_T − K, 0)` into an ancilla amplitude.
3. Run IQAE on the ancilla-flag probability → estimate of `E[payoff]` to `ε` in `O(1/ε)` oracle calls.
Classical Monte Carlo would need `1/ε²` samples; at `ε = 10⁻⁴` QAE saves 10⁴× in oracle queries — provided data loading is `O(polylog(N))`.

**Depth / oracle trade-off:**

| `ε` target | Classical MC shots | IQAE oracle calls | Max circuit depth (multiple of `A` gate) |
|---|---|---|---|
| 10⁻² | 10⁴ | ~100 | ~50 |
| 10⁻³ | 10⁶ | ~1k | ~500 |
| 10⁻⁴ | 10⁸ | ~10k | ~5000 |

**Pitfalls:**
- State preparation `A` itself can be expensive — classical Monte Carlo only needs samples, QAE needs an *oracle preparing the full distribution*. Data-loading cost can swamp the speedup.
- The speedup is *quadratic*, not exponential. For `ε = 10^{-3}` you save ~1000×; for `ε = 10^{-6}` you save ~10⁶× — worth it when precision matters.
- Bias from Trotter / finite-precision A circuit directly contaminates `ã`; IQAE cannot correct a systematic bias in the oracle.
- IQAE's confidence interval is asymptotic; at very small sample counts per round it can be over-optimistic. Verify with Clopper–Pearson bounds.

**Rule of thumb:** IQAE is the practical choice for depth-limited hardware: you get the full `O(1/ε)` oracle-query scaling without needing a QPE block. Reach for standard QAE only when you already have fault tolerance.
