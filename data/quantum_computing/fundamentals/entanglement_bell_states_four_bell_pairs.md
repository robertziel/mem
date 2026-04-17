### Bell States and Two-Qubit Entanglement

**What it is:**
The four Bell states are the maximally-entangled orthonormal basis of the 2-qubit Hilbert space ℂ⁴. Measuring either qubit in Z yields a perfectly correlated outcome; the state of one qubit, viewed alone, is maximally mixed. Bell pairs are the fundamental resource for teleportation, superdense coding, entanglement-based QKD, and measurement-based computation.

**The four Bell states:**
```
|Φ⁺⟩ = (|00⟩ + |11⟩)/√2        ← "bell" / even parity, + phase
|Φ⁻⟩ = (|00⟩ − |11⟩)/√2        ← even parity, − phase
|Ψ⁺⟩ = (|01⟩ + |10⟩)/√2        ← odd parity, + phase (triplet)
|Ψ⁻⟩ = (|01⟩ − |10⟩)/√2        ← odd parity, − phase (singlet; rotationally invariant)
```

**Properties:**
- Mutually orthogonal: ⟨Φ⁺|Ψ⁻⟩ = 0, etc. Form a complete basis for ℂ⁴.
- Maximally entangled: each reduced density matrix is I/2.
- Connected by local Pauli operations: (I⊗X)|Φ⁺⟩ = |Ψ⁺⟩, (I⊗Z)|Φ⁺⟩ = |Φ⁻⟩, (I⊗XZ)|Φ⁺⟩ = |Ψ⁻⟩.

**Measurement correlations (Z basis):**
| State | P(00) | P(01) | P(10) | P(11) |
|---|---|---|---|---|
| |Φ⁺⟩ | ½ | 0 | 0 | ½ |
| |Φ⁻⟩ | ½ | 0 | 0 | ½ |
| |Ψ⁺⟩ | 0 | ½ | ½ | 0 |
| |Ψ⁻⟩ | 0 | ½ | ½ | 0 |
Z outcomes don't distinguish Φ⁺/Φ⁻ or Ψ⁺/Ψ⁻ — the phase only shows up in X/Y bases (or via a Bell measurement).

**Creation circuit:**
```
|0⟩ ──H──•──   (qubit 0)
         │
|0⟩ ─────⊕──   (qubit 1)

|00⟩ →H⊗I→ (|00⟩+|10⟩)/√2 →CNOT→ (|00⟩+|11⟩)/√2 = |Φ⁺⟩
```
Precede with X/Z on the input qubits to get the other three:
- Input |00⟩ → |Φ⁺⟩
- Input |01⟩ → |Ψ⁺⟩
- Input |10⟩ → |Φ⁻⟩
- Input |11⟩ → |Ψ⁻⟩

**Qiskit example:**
```python
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

def bell(name):
    qc = QuantumCircuit(2)
    if name in ('Phi-', 'Psi-'): qc.x(0)
    if name in ('Psi+', 'Psi-'): qc.x(1)
    qc.h(0); qc.cx(0, 1)
    return Statevector(qc)

for name in ['Phi+', 'Phi-', 'Psi+', 'Psi-']:
    print(name, bell(name).data)
```

**Bell measurement (entanglement-in):**
Inverse of the creation circuit. Apply CNOT then H on the first qubit, then measure both in Z. The two-bit outcome (c₁, c₀) labels which Bell state the pair was in:
- 00 → |Φ⁺⟩
- 10 → |Φ⁻⟩
- 01 → |Ψ⁺⟩
- 11 → |Ψ⁻⟩
(Qiskit little-endian; verify for your framework.)

**Why it matters:**
- **Teleportation**: Bell measurement on one end + classical communication reconstructs an arbitrary |ψ⟩ at the other end.
- **Superdense coding**: two classical bits per shared Bell pair.
- **E91 / BBM92**: Bell inequality + correlation gives device-independent QKD.
- **Entanglement swapping**: Bell measurement on the middle pair connects two previously unconnected qubits.

**Experimental note:**
The Bell measurement using linear-optics photons succeeds at most 50% of the time (can't distinguish all four Bell states with only beam splitters). Matter-qubit systems (trapped ions, superconducting) can achieve full Bell measurement deterministically.

**Rule of thumb:** Bell states are to 2-qubit entanglement what the Pauli basis is to operators — four maximally-entangled basis states, interconvertible by local Paulis, produced by a single H+CNOT and consumed by its reverse.
