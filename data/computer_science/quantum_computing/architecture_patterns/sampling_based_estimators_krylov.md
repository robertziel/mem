### Sampling-Based Estimators — Krylov / SQD Post-Processing

**Pattern:** Instead of using the `EstimatorV2` primitive (which returns `<H>` directly with error mitigation baked in), use a **Sampler** to harvest raw bitstrings, then run a **classical post-processor** that builds `<H>` by projecting the Hamiltonian into a subspace spanned by the observed configurations. This is the core of **SQD** (Sample-based Quantum Diagonalization) and related **quantum Krylov** methods. The quantum computer becomes a **sampling oracle** rather than an expectation-value oracle.

**When to use:**
- Circuits are so large that Estimator's error-mitigation overhead (ZNE, PEC) is unaffordable.
- Hamiltonian is naturally sparse in the computational basis (chemistry in Jordan–Wigner, Hubbard, Heisenberg).
- The interesting states are **low-entropy** — a few thousand bitstrings capture most of the support.
- You want an eigenvalue, not just `<psi|H|psi>` of a fixed ansatz.

**Algorithm shape (SQD):**
```python
from qiskit_ibm_runtime import SamplerV2
from qiskit_addon_sqd.subsampling import postselect_and_subsample
from qiskit_addon_sqd.fermion import solve_fermion
import numpy as np

# 1. Sample the ansatz many times
counts = SamplerV2(backend).run([isa]).result()[0].data.meas.get_counts()

# 2. Postselect physical configurations (e.g. correct particle count)
configs = postselect_and_subsample(
    counts, hamming_weight=N_elec, num_batches=5, samples_per_batch=1000,
)

# 3. Classical eigensolve in the sampled subspace
energy, coeffs = solve_fermion(hamiltonian=H_ferm, bitstrings=configs)

# 4. Iterate: use new |psi> to re-sample, expanding the subspace
```

**Math of the subspace projection:**
Given a bitstring pool `S = {|x_1>, ..., |x_m>}`, build `H_S_ij = <x_i|H|x_j>`. Diagonalize — the lowest eigenvalue bounds the true ground state from above and converges as `S` grows.

**Comparison — Estimator primitive vs sampling-based:**

| Axis | Estimator (primitive) | Sampling-based (SQD / Krylov) |
|------|------------------------|-------------------------------|
| Output | `<H>` scalar | Eigenvalue + eigenvector (in subspace) |
| Noise handling | Built-in (resilience 0–3) | External (postselection, self-consistency) |
| Scaling with H terms | Linear (1 PUB per group) | Independent of term count |
| Scaling with qubits | Transpile cost | Subspace size, classical cost |
| Best at | Medium circuits, many observables | Very large circuits, one eigenvalue |

**Trade-offs:**
- **Pros:** Classical post-processing can be made **noise-robust via postselection** (drop bitstrings violating symmetries); costs per extra observable are near-zero once you have the samples.
- **Cons:** Works only when the true ground state has support on a tractable number of configurations. Highly entangled volume-law states blow up the subspace.
- You pay no shot multiplier for mitigation but you pay **many more raw shots** (often 10^5–10^7) to cover the bitstring support.

**Pitfalls:**
- Confusing sampling-based estimation with variational Monte Carlo — SQD is **exact in the sampled subspace**, not stochastic.
- Forgetting symmetry postselection — a noisy sample polluted with wrong-particle-number configs poisons the `H_S` matrix.
- Subsampling without bootstrap batches — you underestimate the variance of the energy.
- Trying it on circuits whose output distribution has no concentration (Haar-random) — you will never enumerate the support.
- Growing the subspace without a stopping criterion — classical diagonalization cost scales as O(m^3) in subspace size `m`; add a convergence check on energy between iterations.

**Interplay with other patterns:**

| Combined with | Why it helps |
|---------------|--------------|
| Shot-budget allocation | Sampler has no per-term budget knob — overall shot count still matters |
| Mid-circuit measurement | Qubit-reuse ansatze still produce valid bitstrings for SQD |
| Circuit cutting | Wire-cut bitstreams can be knit into SQD's config pool directly |

**Example:** 77-qubit N2 chemistry on IBM Heron — SQD with ~10^6 shots, 5 batches of 1000 configs each, classical diagonalization solves sub-problems that are 1000x1000 matrices. No resilience level above 1 needed because postselection cleans the data.

**Rule of thumb:** When the circuit is too big for `EstimatorV2` to mitigate, and the target state is low-entropy, switch to a Sampler + classical Krylov/SQD pipeline — you trade QPU mitigation cost for classical subspace diagonalization cost, and usually win.
