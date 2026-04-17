### Tensor Product and Multi-Qubit State Space

**What it is:**
The state space of n qubits is the **tensor product** of n single-qubit spaces: ℂ² ⊗ ℂ² ⊗ ... ⊗ ℂ² = ℂ^{2ⁿ}. Dimension grows exponentially: 1 qubit → 2, 10 qubits → 1024, 50 qubits → ~10¹⁵.

**Notation:**
```
|a⟩ ⊗ |b⟩ = |a⟩|b⟩ = |ab⟩      (three equivalent notations)
|0⟩ ⊗ |1⟩ = |01⟩ = [0, 1, 0, 0]ᵀ
```

**Tensor product of vectors:**
```
[a, b]ᵀ ⊗ [c, d]ᵀ = [ac, ad, bc, bd]ᵀ
```

**Computational basis for n qubits:**
The 2ⁿ basis states are |x⟩ for x ∈ {0, 1}ⁿ. Any n-qubit pure state is:
```
|ψ⟩ = Σ_{x ∈ {0,1}ⁿ} cₓ |x⟩,     Σ |cₓ|² = 1
```
Requires 2ⁿ − 1 complex numbers (after normalization and global phase), e.g., ~10¹⁸ complex numbers for 60 qubits — infeasible to store classically. This is the origin of quantum advantage.

**Tensor product of operators:**
```
(A ⊗ B)(|ψ⟩ ⊗ |φ⟩) = (A|ψ⟩) ⊗ (B|φ⟩)
```
Matrix form (Kronecker product):
```
A ⊗ B = [[A₀₀ B, A₀₁ B], [A₁₀ B, A₁₁ B]]
```
For 2×2 As and Bs, result is 4×4. An n-qubit operator is 2ⁿ×2ⁿ.

**Separable vs entangled:**
A pure state is **separable** (product state) if |ψ⟩ = |a⟩ ⊗ |b⟩ for some single-qubit states. Otherwise it is **entangled**.

| State | Form | Separable? |
|---|---|---|
| |00⟩ | |0⟩⊗|0⟩ | yes |
| (|0⟩+|1⟩)/√2 ⊗ |0⟩ | |+⟩|0⟩ = (|00⟩+|10⟩)/√2 | yes |
| (|00⟩+|11⟩)/√2 | Bell Φ⁺ | no — entangled |
| (|00⟩+|01⟩+|10⟩+|11⟩)/2 | |+⟩|+⟩ | yes |

Quick test for 2 qubits: with coefficients (c₀₀, c₀₁, c₁₀, c₁₁), the state is separable iff c₀₀ c₁₁ = c₀₁ c₁₀ (the Schmidt rank is 1).

**Qiskit conventions:**
Qiskit uses **little-endian** ordering: qubit 0 is the rightmost bit in the ket string and the last factor in the tensor product.
```
|q₁ q₀⟩ = |q₁⟩ ⊗ |q₀⟩     (Qiskit)  — counter to many textbooks
```
So `qc.h(0)` acts on the rightmost bit of the label, giving (I ⊗ H) on |q₁ q₀⟩.

**Qiskit example:**
```python
import numpy as np
from qiskit.quantum_info import Statevector, Operator
from qiskit.circuit.library import HGate, XGate

psi = Statevector.from_label('01')
print(psi.data)          # [0, 1, 0, 0]  (little-endian)

op = Operator(HGate()).tensor(Operator(XGate()))   # H ⊗ X  (H on q1, X on q0)
print(op.dim)            # (4, 4)
```

**Operator locality:**
A gate on a single qubit in an n-qubit register is I ⊗ ... ⊗ U ⊗ ... ⊗ I. This preserves separability. Two-qubit gates (CNOT, CZ) can create or destroy entanglement — they are the reason quantum circuits go beyond tensor products of local rotations.

**Rule of thumb:** Multi-qubit Hilbert space is 2ⁿ-dimensional; tensor products build product states for free, but entangled states — the useful ones — are everything else in that exponentially large space.
