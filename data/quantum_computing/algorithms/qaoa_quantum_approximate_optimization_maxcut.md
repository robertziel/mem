### QAOA — Quantum Approximate Optimization Algorithm

**Problem:** Approximately solve combinatorial optimization — maximize (or minimize) an objective `C(z) = Σ_α C_α(z)` over `z ∈ {0,1}^n`. Canonical example: **Max-Cut** (partition graph vertices into two sets to maximize the number of edges crossing the cut).

**Quantum approach (Farhi–Goldstone–Gutmann 2014):**
1. Encode objective as a diagonal "cost" Hamiltonian: `H_C|z⟩ = C(z)|z⟩`. For Max-Cut on edge `(i,j)`: `H_C = Σ_{(i,j)∈E} (I − Z_i Z_j)/2`.
2. Define mixer `H_M = Σ_i X_i` (standard) — drives population between bitstrings.
3. Initial state: `|+⟩^n = H^{⊗n}|0⟩^n` (uniform superposition, ground state of `−H_M`).
4. **Layered ansatz of depth `p`:**
   `|γ, β⟩ = e^{−iβ_p H_M} e^{−iγ_p H_C} ... e^{−iβ_1 H_M} e^{−iγ_1 H_C} |+⟩^n`.
5. Measure `⟨γ, β|H_C|γ, β⟩` and pass to a classical optimizer over `2p` parameters `(γ_1, β_1, ..., γ_p, β_p)`.
6. Sample from the optimized state and output the best bitstring seen.

**Complexity / approximation:**
| Depth | Approximation ratio (Max-Cut, 3-regular) |
|---|---|
| `p = 1` | `≥ 0.6924` (Farhi et al., tight) |
| `p = 2` | `≥ 0.7559` (Wurtz–Love) |
| `p = ∞` | Converges to optimum (adiabatic limit, no Trotter error) |

**Known separations:**
- `p = 1` QAOA beats Goemans–Williamson (0.8785) on some structured instances; in general, classical SDP rounding (Goemans–Williamson) is *better* than low-depth QAOA on Max-Cut.
- Hastings 2019 / Marwaha 2021: on bounded-degree Max-Cut, there exist classical algorithms matching constant-`p` QAOA up to a small gap.
- For specific problems (e.g., Max-`q`-XOR, some constraint satisfaction), QAOA at low `p` has been shown to exceed classical approximation ratios.

**Qiskit code (Max-Cut, `p = 1`):**
```python
from qiskit import QuantumCircuit
from qiskit.primitives import StatevectorEstimator, StatevectorSampler
from qiskit.quantum_info import SparsePauliOp
from scipy.optimize import minimize
import numpy as np

n = 4
edges = [(0, 1), (1, 2), (2, 3), (3, 0), (0, 2)]
H_C = SparsePauliOp.from_sparse_list(
    [("ZZ", [i, j], 0.5) for i, j in edges], num_qubits=n
)  # ignoring constant; minimize this is same as maximizing cut count

def qaoa_circuit(gamma, beta, p):
    qc = QuantumCircuit(n)
    qc.h(range(n))
    for l in range(p):
        for i, j in edges:
            qc.rzz(2 * gamma[l], i, j)          # e^{-i γ (Z_i Z_j / 2) · 2}
        for q in range(n):
            qc.rx(2 * beta[l], q)
    return qc

p = 1
estimator = StatevectorEstimator()

def cost(params):
    g, b = params[:p], params[p:]
    return estimator.run([(qaoa_circuit(g, b, p), H_C)]).result()[0].data.evs

res = minimize(cost, np.random.uniform(0, np.pi, 2 * p), method="COBYLA")

qc = qaoa_circuit(res.x[:p], res.x[p:], p); qc.measure_all()
print(StatevectorSampler().run([qc], shots=2048).result()[0].data.meas.get_counts())
```

**Key insight:** QAOA is a Trotterized interpolation between the easy Hamiltonian `H_M` (whose ground state you know) and the hard `H_C` (whose ground state encodes the solution). At `p → ∞` with the right schedule, it reproduces adiabatic quantum computation; at small `p`, it's a shallow variational heuristic with structural symmetries (concentration of optimal parameters across instances).

**Caveats:**
- No proof of quantum supremacy for QAOA on most benchmarks; often comparable to — or beaten by — well-tuned classical heuristics (SDP, simulated annealing, tensor networks).
- Reachability limits: QAOA at constant `p` on some problems provably cannot beat the best classical algorithms (e.g., MaxBisection on expander graphs).
- Parameter concentration: optimal `(γ, β)` cluster across random graph instances, so transfer learning works — but also indicates limited expressivity.
- Noise erodes shallow-depth advantage quickly; error mitigation is essential on hardware.

**Rule of thumb:** QAOA is a *NISQ-friendly optimization heuristic* without proven supremacy; view it as a quantum analogue of simulated annealing, not an algorithm with a polynomial speedup guarantee.
