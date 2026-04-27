### Quantum Phase Estimation (QPE) — Eigenvalue Extraction

**Problem:** Given a unitary `U` and an eigenstate `|u⟩` with `U|u⟩ = e^{2πiθ}|u⟩` (`θ ∈ [0,1)`), estimate `θ` to `t` bits of precision.

**Complexity:**
- Ancilla qubits: `t` (for `t`-bit precision + optional extras for success probability).
- Queries to `U`: the circuit applies `U^{2^0}, U^{2^1}, ..., U^{2^{t-1}}`, so total controlled-`U` applications are `2^t − 1`.
- Total gates: `O(t² + T_U · 2^t)` where `T_U` is the cost of implementing `U`.
- Classical cost of direct diagonalization: `O(N^3)` for an `N`-dim matrix; QPE can win exponentially *only if* `U` admits an efficient (polylog-qubit, polylog-depth) implementation.

**QPE is the subroutine of:** Shor's algorithm (order finding), HHL (eigen-inversion of `A`), quantum chemistry (Hamiltonian eigenvalues), and many linear-algebra primitives.

**Quantum approach:**
1. Ancilla register: `t` qubits in `|0⟩^{⊗t}`, apply `H^{⊗t}`.
2. Target register: eigenstate `|u⟩`.
3. For `k = 0..t−1`, apply controlled-`U^{2^k}` using ancilla qubit `k` as control.
   After this step, ancilla is in `(1/√{2^t}) Σ_y e^{2πi θ y}|y⟩`.
4. Apply inverse QFT to the ancilla register.
5. Measure the ancilla → closest `t`-bit approximation of `θ`.

**Precision vs. ancilla trade-off:**
To estimate `θ` to within `2^{-n}` with success probability at least `1 − ε`, use
`t = n + ⌈log(2 + 1/(2ε))⌉` ancilla qubits.

**Circuit skeleton:**
```
ancilla_0  ─H─●──────...──────┐
ancilla_1  ─H─│─●────...──────│─ QFT† ─M
   ...          │ │            │
ancilla_{t-1} ─H──────────●───┘
|u⟩         ──U^1─U^2─...─U^{2^{t-1}}─
```

**Qiskit code:**
```python
from qiskit import QuantumCircuit
from qiskit.circuit.library import QFT, UnitaryGate
from qiskit.primitives import StatevectorSampler
import numpy as np

# Example: U = phase gate with θ = 1/3, eigenstate |1⟩
theta = 1 / 3
U = np.array([[1, 0], [0, np.exp(2j * np.pi * theta)]])
t = 6                                           # 6-bit precision

qc = QuantumCircuit(t + 1, t)
qc.x(t)                                         # target register: |1⟩
qc.h(range(t))
for k in range(t):
    cU = UnitaryGate(np.linalg.matrix_power(U, 2 ** k)).control(1)
    qc.append(cU, [k, t])
qc.compose(QFT(t, inverse=True, do_swaps=True), qubits=range(t), inplace=True)
qc.measure(range(t), range(t))

counts = StatevectorSampler().run([qc], shots=2048).result()[0].data.c.get_counts()
best = max(counts, key=counts.get)
# convention: reading the bitstring right-to-left gives the integer whose ratio to 2^t ≈ θ
estimate = int(best[::-1], 2) / 2 ** t
print(estimate, "≈", theta)
```

**Key insight:** The controlled-`U^{2^k}` pattern writes the binary expansion of `θ` into the *phases* of the ancilla register; the inverse QFT converts that phase pattern into a computational-basis integer you can measure. QPE is essentially "binary search in Fourier space."

**Caveats:**
- The target register must actually contain an eigenstate (or a superposition of eigenstates, giving a mixture of phase readouts). Preparing eigenstates is often the hard part.
- Controlled-`U^{2^k}` for large `k` typically requires a known decomposition (e.g., modular exponentiation for Shor) — a black-box `U` doesn't automatically give cheap high powers.
- Accuracy depends on `θ` having a `t`-bit binary expansion; otherwise the output distribution peaks near the closest approximant.

**Rule of thumb:** If you see "eigenvalue" or "period" in a quantum algorithm, QPE is almost certainly under the hood. Budget `t = (bits of precision) + O(1)` ancillas and `2^t` calls to controlled-`U`.
