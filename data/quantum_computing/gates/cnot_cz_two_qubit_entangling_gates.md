### CNOT and CZ: Two-Qubit Entangling Gates

**What they are:** The workhorse two-qubit gates. CNOT flips the target iff control is |1⟩; CZ applies a Z to the target iff control is |1⟩. Either one, combined with single-qubit gates, is universal.

**CNOT (CX) matrix** — basis ordering |00⟩, |01⟩, |10⟩, |11⟩ with Qiskit little-endian (control = q0, target = q1 → rows/cols reorder, see note):
```
CNOT = [[1, 0, 0, 0],      Action: |c, t⟩ → |c, t ⊕ c⟩
        [0, 1, 0, 0],
        [0, 0, 0, 1],
        [0, 0, 1, 0]]
```

**CZ matrix (symmetric in control/target):**
```
CZ = [[1, 0, 0,  0],       Action: |c, t⟩ → (-1)^(c·t) |c, t⟩
      [0, 1, 0,  0],
      [0, 0, 1,  0],
      [0, 0, 0, -1]]
```

**Identity:** CNOT = (I ⊗ H) · CZ · (I ⊗ H). So CZ and CNOT differ only by a basis change on the target.

**Circuit symbols:**
```
CNOT:  control ──●──          CZ:  q0 ──●──
                 │                       │
       target ──⊕──                q1 ──●──
```

**Entanglement generation — Bell state preparation:**
```
|00⟩ ──[H⊗I]──→ (|00⟩+|10⟩)/√2 ──[CNOT]──→ (|00⟩+|11⟩)/√2 = |Φ⁺⟩
```

All four Bell states reachable by H + CNOT + single-qubit Paulis.

**Clifford properties:** Both CNOT and CZ are Clifford. Pauli propagation through CNOT (control c, target t):
```
X_c → X_c X_t      Z_c → Z_c
X_t → X_t          Z_t → Z_c Z_t
```

**Cost on NISQ hardware:** Two-qubit gates dominate error rates (typical transmon CNOT fidelity 99–99.5%, single-qubit 99.9%+). Two-qubit gate count ≈ the primary depth metric for current devices.

**Qiskit:**
```python
from qiskit import QuantumCircuit

# Bell state
qc = QuantumCircuit(2)
qc.h(0)
qc.cx(0, 1)   # CNOT: control=0, target=1

# Equivalent with CZ
qc2 = QuantumCircuit(2)
qc2.h(0)
qc2.h(1)
qc2.cz(0, 1)
qc2.h(1)

# GHZ state over n qubits
def ghz(n):
    qc = QuantumCircuit(n)
    qc.h(0)
    for i in range(n - 1):
        qc.cx(i, i + 1)
    return qc
```

**Hardware native two-qubit gates:**

| Platform         | Native 2Q gate                        |
|------------------|---------------------------------------|
| IBM transmon     | ECR or CX (direct CR-based)           |
| Google transmon  | √iSWAP, Sycamore fSim               |
| IonQ trapped-ion | Mølmer–Sørensen (XX) gate             |
| Rigetti          | CZ, XY(θ)                             |

**Rule of thumb:** Count your CNOTs (or CZs) — on NISQ hardware, two-qubit gates set your fidelity budget and your compilation target; one-qubit gates are effectively free in comparison.
