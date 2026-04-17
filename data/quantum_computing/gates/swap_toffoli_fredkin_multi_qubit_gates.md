### SWAP, Toffoli, Fredkin: Multi-Qubit Gates

**SWAP (2 qubits):** Exchanges the states of two qubits. Symmetric and its own inverse.
```
SWAP = [[1, 0, 0, 0],       SWAP |a, b⟩ = |b, a⟩
        [0, 0, 1, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 1]]
```
Decomposition: **SWAP = CNOT(a,b) · CNOT(b,a) · CNOT(a,b)** — three CNOTs. That cost is why routing is expensive on limited-connectivity hardware.

**Toffoli (CCX, 3 qubits):** Controlled-controlled-X. Flips target iff both controls are 1. Classically universal (can simulate AND, NAND → all Boolean logic).
```
Action: |c1, c2, t⟩ → |c1, c2, t ⊕ (c1 · c2)⟩

Matrix is 8×8, identity on |00t⟩, |01t⟩, |10t⟩; swaps |110⟩ ↔ |111⟩.
```
Universality: **{Toffoli, H}** is universal for quantum computation. Toffoli alone is classically reversible but not quantumly universal (it's a permutation matrix; needs H to create superposition).

**Fredkin (CSWAP, 3 qubits):** Controlled-SWAP. Swaps targets iff control is 1.
```
Action: |c, a, b⟩ → |c, a, b⟩ if c = 0
                    |c, b, a⟩ if c = 1
```
Used in: **SWAP test** (fidelity/overlap estimation between states), ancilla-based comparisons, reversible classical computing.

**SWAP test circuit** (estimates |⟨ψ|φ⟩|²):
```
|0⟩   ──H──●──H──M       Pr(0) = ½ + ½|⟨ψ|φ⟩|²
           │
|ψ⟩   ────×────
           │
|φ⟩   ────×────
```

**Decomposition costs (into CNOT + 1Q gates):**

| Gate    | Minimum CNOT count | T gates (fault-tolerant) |
|---------|--------------------|--------------------------|
| SWAP    | 3                  | 0 (Clifford)             |
| Toffoli | 6 (standard)       | 7 T gates                |
| Fredkin | 7                  | 7 T gates                |

**Qiskit:**
```python
from qiskit import QuantumCircuit

qc = QuantumCircuit(3)
qc.swap(0, 1)           # SWAP
qc.ccx(0, 1, 2)         # Toffoli (control1, control2, target)
qc.cswap(0, 1, 2)       # Fredkin (control, target1, target2)

# Multi-controlled X with arbitrary controls
qc.mcx(control_qubits=[0, 1, 2], target_qubit=3)

# Decompose Toffoli into CX + T gates
from qiskit.transpiler import generate_preset_pass_manager
pm = generate_preset_pass_manager(optimization_level=1, basis_gates=["cx", "h", "t", "tdg"])
decomposed = pm.run(qc)
```

**NISQ reality:** Toffoli and Fredkin are almost never "native" — they get decomposed into 6–8 two-qubit gates, so a circuit with 10 Toffolis easily has 60+ CNOTs. Prefer CNOT-level design for near-term hardware.

**Rule of thumb:** SWAPs are routing overhead — each one is 3 CNOTs of noise you didn't ask for; Toffolis are logic overhead — minimize both by choosing ansätze and layouts that avoid them.
