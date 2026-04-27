### VQE — Variational Quantum Eigensolver

**Problem:** Find the ground-state energy `E_0 = min_ψ ⟨ψ|H|ψ⟩` of a Hamiltonian `H` (typically a molecular electronic Hamiltonian in quantum chemistry).

**Complexity:**
- Exact classical diagonalization: `O(N^3)` for an `N × N` matrix, but `N = 2^n` in `n`-qubit (second-quantized) form → intractable.
- Classical heuristics (DMRG, QMC, coupled cluster) scale polynomially but suffer accuracy/sign-problem limitations.
- VQE: per iteration, `O(M · poly(n) / ε²)` circuit shots for `M` Hamiltonian terms and precision `ε`. Convergence iterations depend on the optimizer — not worst-case bounded.

**VQE vs. QPE:** QPE gives the ground-state energy exactly (to `t` bits) but needs long coherent circuits and an eigenstate. VQE trades depth for shot count, making it the canonical **NISQ-era** algorithm.

**Quantum approach (hybrid loop):**
1. Choose a parameterized ansatz `|ψ(θ)⟩ = U(θ)|0⟩^n` (hardware-efficient, UCCSD, HVA, ADAPT, etc.).
2. Decompose `H = Σ_k c_k P_k` into Pauli strings `P_k`.
3. **Quantum step:** estimate each `⟨ψ(θ)|P_k|ψ(θ)⟩` by sampling in the Pauli basis → compute `E(θ) = Σ c_k ⟨P_k⟩`.
4. **Classical step:** optimizer (COBYLA, SPSA, L-BFGS-B, Adam) updates `θ → θ'`.
5. Repeat until convergence.

**Ansatz choices:**
| Ansatz | Pros | Cons |
|---|---|---|
| Hardware-efficient (alternating entanglers + rotations) | shallow, works on real hardware | prone to barren plateaus |
| UCCSD (unitary coupled cluster, singles/doubles) | chemistry-motivated, accurate | deep, needs fermion→qubit mapping |
| HVA (Hamiltonian variational ansatz) | respects `H`'s locality | problem-specific |
| ADAPT-VQE | grows ansatz term-by-term, accurate + shallow | many gradient evaluations |

**Qiskit code (H₂ ground state):**
```python
from qiskit.circuit.library import EfficientSU2
from qiskit.primitives import StatevectorEstimator
from qiskit.quantum_info import SparsePauliOp
from scipy.optimize import minimize
import numpy as np

# H₂ at 0.735 Å (Jordan–Wigner) — STO-3G
H = SparsePauliOp.from_list([
    ("II", -1.052373245772859),  ("IZ",  0.39793742484318045),
    ("ZI", -0.39793742484318045),("ZZ", -0.01128010425623538),
    ("XX",  0.18093119978423156),
])

ansatz = EfficientSU2(num_qubits=2, reps=2)           # hardware-efficient
estimator = StatevectorEstimator()

def energy(theta):
    job = estimator.run([(ansatz, H, theta)])
    return job.result()[0].data.evs

x0 = np.random.uniform(-np.pi, np.pi, ansatz.num_parameters)
res = minimize(energy, x0, method="COBYLA", options={"maxiter": 200})
print("VQE energy:", res.fun, "(FCI reference: -1.8572)")
```

**Key insight:** Energy is a quadratic form `⟨ψ|H|ψ⟩` on state space; a quantum computer can prepare `|ψ(θ)⟩` and sample its energy exponentially faster than classically simulating the wavefunction, while a classical optimizer steers `θ`. The variational principle guarantees `E(θ) ≥ E_0` — every quantum sample is a *bound*, not just an estimate.

**Caveats:**
- **Measurement cost:** `H` may have `O(n^4)` Pauli terms for molecules; grouping into commuting cliques and shadow tomography reduce shot counts but are essential in practice.
- **Optimization is non-convex:** local minima, barren plateaus, and noise-induced bias are major failure modes.
- **Noise:** error mitigation (zero-noise extrapolation, probabilistic error cancellation, dynamical decoupling) is nearly always required on hardware.
- **No proven speedup:** VQE is a *heuristic*; no polynomial-time guarantee over classical methods.

**Rule of thumb:** VQE is the "hello world" of NISQ chemistry/condensed-matter — demonstrate on H₂, LiH, BeH₂; expect scaling trouble beyond ~20 qubits without serious error mitigation and adaptive ansätze.
