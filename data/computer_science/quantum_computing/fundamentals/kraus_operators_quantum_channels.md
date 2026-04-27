### Kraus Operators — Quantum Channels in Operator-Sum Form

**What it is:**
A **quantum channel** is the most general state transformation allowed by quantum mechanics: a linear, **completely positive, trace-preserving** (CPTP) map ε. Every such map admits a **Kraus (operator-sum) representation** — a finite set `{E_k}` of operators with `Σ_k E_k† E_k = I` that acts on density matrices.

**Math:**
```
ε(ρ) = Σ_k E_k ρ E_k†          (CPTP)
Σ_k E_k† E_k = I               (trace preservation)
Σ_k E_k E_k† = I               (unitality, stronger; only some channels)
```
Number of terms needed is the **Kraus rank** `r ≤ d²` (d = dim of system).

**Common channels:**
| Channel | Kraus operators |
|---|---|
| Unitary U | `{U}`, rank 1 |
| Bit-flip (p) | `{√(1-p) I, √p X}` |
| Depolarizing (p) | `{√(1-3p/4) I, √(p/4) X, √(p/4) Y, √(p/4) Z}` |
| Amplitude damping (γ) | `E₀ = diag(1, √(1-γ))`, `E₁ = √γ · \|0⟩⟨1\|` |
| Phase damping (λ) | `E₀ = diag(1, √(1-λ))`, `E₁ = diag(0, √λ)` |

Amplitude damping is **non-unital** (energy relaxation to |0⟩); bit-flip and depolarizing are unital (`ε(I) = I`).

**Non-uniqueness:**
`{E_k}` and `{F_j = Σ_k U_{jk} E_k}` for any isometry U give the same channel. Only ε itself is physical.

**Qiskit:**
```python
import numpy as np
from qiskit.quantum_info import Kraus, DensityMatrix, SuperOp

gamma = 0.1                                           # amplitude damping
E0 = np.array([[1, 0], [0, np.sqrt(1 - gamma)]])
E1 = np.array([[0, np.sqrt(gamma)], [0, 0]])
chan = Kraus([E0, E1])

rho = DensityMatrix.from_label('1')                   # excited state
print(chan(rho).data)                                 # decays toward |0⟩

# Convert representations:
S = SuperOp(chan)                                     # vectorized superoperator
```

**Choi–Jamiolkowski isomorphism:**
Channels ε ↔ bipartite states `J(ε) = (I ⊗ ε)(|Φ⁺⟩⟨Φ⁺|)` on d²-dim space. `J(ε) ≥ 0` ⇔ ε completely positive; `Tr_B J(ε) = I/d` ⇔ trace preserving. Kraus operators are recovered from the eigen-decomposition of `J(ε)`.

**When to use:**
- Modelling **any** noise — Kraus is the universal "black box" for quantum noise.
- Building **noise models** for simulation (`qiskit_aer.noise.QuantumError`).
- Stinespring dilation: `ε(ρ) = Tr_E[U (ρ ⊗ |0⟩⟨0|_E) U†]` with `E_k = ⟨k|_E U |0⟩_E` — lets you simulate any channel with a unitary + ancilla + trace.
- Deriving **process tomography** reconstructions.

**Pitfalls:**
- **Completeness check**: forgetting `Σ E_k† E_k = I` gives a non-trace-preserving (sub)channel — simulation will lose norm.
- **Kraus rank inflation**: concatenating channels naively multiplies ranks; compress via SVD on the Choi matrix.
- **Non-Markovian noise** cannot be written as a *single* Kraus map acting repeatedly — you need a bigger environment or a master equation.
- **Basis conventions**: some libraries vectorize row-major, others column-major — conversion between Kraus and superoperator/Choi can silently transpose.

**Rule of thumb:** If something behaves like physical noise, it is a CPTP map, and it has a Kraus decomposition with at most d² terms — start there before reaching for Lindbladians.
