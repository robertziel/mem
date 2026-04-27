### Pauli Gates (X, Y, Z): Bit Flip, Phase Flip, and Both

**What they are:** The three non-identity Pauli matrices — single-qubit unitaries that are Hermitian, unitary, and involutory (σ² = I). They generate the single-qubit Pauli group and form the error basis for quantum error correction.

**Matrices (computational basis ordering |0⟩, |1⟩):**
```
X = [[0, 1],     Y = [[0, -i],    Z = [[1,  0],
     [1, 0]]         [i,  0]]         [0, -1]]
```

**Action on computational basis:**

| Gate | on \|0⟩ | on \|1⟩ | on \|+⟩ | on \|−⟩ |
|------|--------|--------|--------|--------|
| X    | \|1⟩   | \|0⟩   | \|+⟩   | −\|−⟩  |
| Y    | i\|1⟩  | −i\|0⟩ | i\|−⟩  | −i\|+⟩ |
| Z    | \|0⟩   | −\|1⟩  | \|−⟩   | \|+⟩   |

- **X (bit flip / NOT):** classical NOT; swaps |0⟩ ↔ |1⟩.
- **Z (phase flip):** leaves |0⟩ alone, adds π phase to |1⟩; diagonal in Z basis.
- **Y = iXZ:** combined bit + phase flip, off-diagonal like X but imaginary.

**Algebraic identities:**
```
X² = Y² = Z² = I
XY = iZ,  YZ = iX,  ZX = iY    (cyclic)
{X, Y} = {Y, Z} = {Z, X} = 0   (anticommute)
```

**Pauli group P₁:** {±1, ±i} × {I, X, Y, Z}, order 16. Multi-qubit Pauli group Pₙ is the n-fold tensor product; central to stabilizer codes.

**Eigenstates:**
- X: |±⟩ = (|0⟩ ± |1⟩)/√2
- Y: |±i⟩ = (|0⟩ ± i|1⟩)/√2
- Z: |0⟩, |1⟩

**Qiskit:**
```python
from qiskit import QuantumCircuit
qc = QuantumCircuit(1)
qc.x(0)   # Pauli-X
qc.y(0)   # Pauli-Y
qc.z(0)   # Pauli-Z

# Expectation values via SparsePauliOp
from qiskit.quantum_info import SparsePauliOp, Statevector
op = SparsePauliOp.from_list([("Z", 1.0)])
state = Statevector.from_label("0")
print(state.expectation_value(op))  # +1
```

**Relation to rotations:** X = iRx(π), Y = iRy(π), Z = iRz(π) (up to global phase).

**Rule of thumb:** X flips bits, Z flips phases, Y does both — and any single-qubit error can be decomposed into a Pauli combination, which is why the Pauli group is the workhorse of error correction.
