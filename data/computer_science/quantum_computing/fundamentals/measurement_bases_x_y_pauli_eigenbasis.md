### Measurement Bases — X, Y, Z, Pauli Eigenbases

**What it is:**
Hardware measurement is typically **only** in the computational (Z) basis. To measure in another basis you rotate the state so that the target basis maps onto {|0⟩, |1⟩}, then measure in Z. Three standard single-qubit bases correspond to the Pauli eigenbases: Z, X, Y.

**Pauli eigenbases:**
| Observable | Eigenstates | Eigenvalues |
|---|---|---|
| Z | |0⟩, |1⟩ | +1, −1 |
| X | |+⟩ = (|0⟩+|1⟩)/√2, |−⟩ = (|0⟩−|1⟩)/√2 | +1, −1 |
| Y | |+i⟩ = (|0⟩+i|1⟩)/√2, |−i⟩ = (|0⟩−i|1⟩)/√2 | +1, −1 |

**Pre-measurement rotations (to reduce to Z):**

| Target | Gate to apply before Z-measure | Mapping |
|---|---|---|
| Z (identity) | — | none |
| X | H | \|+⟩→\|0⟩, \|−⟩→\|1⟩ |
| Y | S†·H (or equivalently H·S) | \|+i⟩→\|0⟩, \|−i⟩→\|1⟩ |

So "measure in X" ≡ `H; measure Z`. "Measure in Y" ≡ `S†; H; measure Z` (or `H·S`; order depends on convention — verify with a trusted source for your framework).

**Probabilities:**
For |ψ⟩ = α|0⟩ + β|1⟩:
```
Z:  P(+1) = |α|²,                   P(−1) = |β|²
X:  P(+1) = |α+β|²/2,                P(−1) = |α−β|²/2
Y:  P(+1) = |α − iβ|²/2,            P(−1) = |α + iβ|²/2
```

**Expectation values:**
```
⟨Z⟩ = |α|² − |β|²
⟨X⟩ = 2 Re(α*β)
⟨Y⟩ = 2 Im(α*β)
```
These are the Bloch vector components. From N shots in each basis, you reconstruct (⟨X⟩, ⟨Y⟩, ⟨Z⟩) with standard error ∼1/√N.

**Multi-qubit Pauli measurement:**
Measuring a Pauli string like X⊗Z⊗Y on 3 qubits: apply the corresponding single-qubit change-of-basis on each qubit (H on X qubits, HS† on Y qubits, nothing on Z qubits), then measure all in Z. The measurement result's parity (product of ±1 eigenvalues) gives the eigenvalue of the full Pauli string.

**Why you care:**
- **Variational algorithms (VQE, QAOA)**: the cost function is ⟨H⟩ for a Hamiltonian expressed as a sum of Pauli strings. Each term needs its own basis rotation and measurement shots.
- **Tomography**: full state reconstruction requires measurements in ≥ d²−1 bases; for a single qubit that means measuring X, Y, Z.
- **Stabilizer codes**: syndrome extraction measures products of Pauli operators.

**Qiskit example:**
```python
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

# Prepare |+i⟩ = S H |0⟩
qc = QuantumCircuit(1, 1)
qc.h(0); qc.s(0)

# Measure in Y basis → should give deterministic 0 for |+i⟩
qc.sdg(0); qc.h(0)    # S†·H change of basis
qc.measure(0, 0)

sim = AerSimulator()
print(sim.run(transpile(qc, sim), shots=2048).result().get_counts())  # ~{'0': 2048}
```

**Grouping for efficiency:**
Commuting Pauli strings can share measurement shots. `QWC` (qubit-wise commuting) grouping or more general graph-coloring schemes reduce shot budget for VQE by 3–10×.

**Pitfall:**
`HS†` vs `S†H` — not the same. For Y measurement the correct pre-rotation is the one that maps |+i⟩ → |0⟩; in most textbooks this is `S†` then `H` (circuit order), i.e., apply S† first. Always verify with a quick simulation.

**Rule of thumb:** Hardware speaks only Z; any other measurement basis is a pre-rotation followed by a Z-measurement, and the rotations are H (for X), S†-then-H (for Y).
