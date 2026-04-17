### Gate Decomposition: Arbitrary U to Native Gates

**What it is:** Any single-qubit unitary can be written as a product of three Euler angles. Two-qubit unitaries decompose into at most 3 CNOTs + single-qubit gates (KAK decomposition). Transpilers use these decompositions to map user-level circuits onto hardware-native gates.

**Generic single-qubit gate (Qiskit U gate):**
```
U(θ, φ, λ) = [[cos(θ/2),             -e^{iλ} sin(θ/2)       ],
              [e^{iφ} sin(θ/2),       e^{i(φ+λ)} cos(θ/2)   ]]
```

Three real parameters — sufficient to represent any 1Q unitary up to global phase.

**ZYZ Euler decomposition:**
```
U = e^{iα} Rz(β) Ry(γ) Rz(δ)
```
Every SU(2) element has this form; (β, γ, δ) are the Euler angles.

**ZXZ / ZYZ / XYX — different bases of the same thing.** Most hardware prefers **Rz virtual + √X physical** (IBM style):

```
U(θ, φ, λ) = Rz(φ) · √X · Rz(θ + π) · √X · Rz(λ + π) + global phase
```
This uses **2 physical √X pulses** plus virtual Rz frame updates — the basis decomposition IBM transpilers target.

**Native gate sets by vendor:**

| Platform         | Single-qubit native | Two-qubit native   |
|------------------|----------------------|--------------------|
| IBM Heron/Eagle  | rz (virtual), sx, x  | ecr (or cz/cx)     |
| IBM Falcon       | rz, sx, x            | cx                 |
| IonQ             | rx(θ), ry(θ), rz(θ)  | MS gate (XX)       |
| Quantinuum H1/H2 | u1q (arbitrary)      | zz(θ) (phase)      |
| Rigetti          | rx(±π/2), rx(π), rz  | cz, xy(θ)          |
| Google Sycamore  | rx, ry, rz           | √iSWAP, sqrt_iswap |

**KAK / Cartan decomposition (two-qubit):** Any U ∈ SU(4) = (A₁ ⊗ B₁) · exp(i(k_x XX + k_y YY + k_z ZZ)) · (A₂ ⊗ B₂) where Aᵢ, Bᵢ are single-qubit and (k_x, k_y, k_z) is the canonical two-qubit interaction. Implies **at most 3 CNOTs** suffice for any 2-qubit gate.

**Qiskit decomposition:**
```python
from qiskit import QuantumCircuit, transpile
from qiskit.circuit.library import UGate
import numpy as np

# Generic single-qubit
qc = QuantumCircuit(1)
qc.append(UGate(theta=0.7, phi=0.2, lam=1.1), [0])

# Decompose to IBM native
qc_ibm = transpile(qc, basis_gates=["rz", "sx", "x"], optimization_level=3)
print(qc_ibm.count_ops())  # e.g. {'rz': 3, 'sx': 2}

# Decompose to IonQ native
qc_ion = transpile(qc, basis_gates=["rx", "ry", "rz", "rxx"], optimization_level=3)

# Two-qubit KAK decomposition
from qiskit.synthesis import TwoQubitBasisDecomposer
from qiskit.circuit.library import CXGate
from qiskit.quantum_info import Operator, random_unitary

decomposer = TwoQubitBasisDecomposer(gate=CXGate())
target_U = random_unitary(4)
decomposed = decomposer(target_U)
print(decomposed.count_ops())  # at most 3 cx + single-qubit
```

**Practical constants:**
- Any 1Q unitary → **2 √X pulses** (IBM) or **≤3 arbitrary rotations** elsewhere
- Any 2Q unitary → **≤3 CNOTs** (plus 1Q gates)
- SWAP = exactly 3 CNOTs; Bell-state-prep-like gates = 1 CNOT

**Rule of thumb:** Arbitrary single-qubit gates are ~2 physical pulses; arbitrary two-qubit gates are ≤3 entangling gates — the transpiler's job is to hit those minimums while respecting topology.
