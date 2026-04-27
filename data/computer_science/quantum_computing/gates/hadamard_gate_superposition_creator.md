### Hadamard Gate (H): The Superposition Creator

**What it is:** The single most important single-qubit gate. Maps computational basis to Hadamard (X) basis and vice versa. Creates equal superpositions from basis states and is the quantum analog of a beam splitter.

**Matrix:**
```
       1  [[1,  1],
H = ─────
      √2  [1, -1]]
```

Hermitian (H = H†) and unitary, so **H² = I** — the Hadamard is self-inverse.

**Action on basis states:**

| Input | Output                                |
|-------|---------------------------------------|
| \|0⟩  | \|+⟩ = (\|0⟩ + \|1⟩)/√2              |
| \|1⟩  | \|−⟩ = (\|0⟩ − \|1⟩)/√2              |
| \|+⟩  | \|0⟩                                  |
| \|−⟩  | \|1⟩                                  |

**Change of basis (X ↔ Z):** Hadamard conjugates the Paulis:
```
H X H = Z      H Z H = X      H Y H = -Y
```
So measuring a qubit in the X basis = applying H then measuring in Z.

**Creating n-qubit uniform superposition:**
```
H^⊗n |0⟩^⊗n = (1/√2^n) Σ_{x∈{0,1}^n} |x⟩
```
The first step of Deutsch–Jozsa, Grover, Simon, Shor's period-finding subroutine.

**Qiskit:**
```python
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

# Single-qubit superposition
qc = QuantumCircuit(1)
qc.h(0)
print(Statevector(qc))  # [0.707+0j, 0.707+0j]

# Uniform 3-qubit superposition
qc3 = QuantumCircuit(3)
qc3.h([0, 1, 2])  # broadcast H to all qubits

# Bell state prep: |00⟩ -> (|00⟩+|11⟩)/√2
bell = QuantumCircuit(2)
bell.h(0)
bell.cx(0, 1)
```

**Relation to rotations:** H = (X + Z)/√2 = e^{iπ/2} Ry(π/2) Z, or more symmetrically rotation by π about the (x̂+ẑ)/√2 axis on the Bloch sphere.

**Gate count cost:** Native on most platforms (IBM: decomposes to sx, rz; trapped-ion: to RX, RY).

**Rule of thumb:** Every quantum algorithm with a "quantum parallelism" step starts with H^⊗n — it's the gate that makes quantum different from probabilistic classical.
