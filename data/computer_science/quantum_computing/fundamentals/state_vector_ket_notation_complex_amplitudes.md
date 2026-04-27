### State Vectors, Dirac Notation, and Complex Amplitudes

**What it is:**
Dirac (bra-ket) notation writes quantum states as vectors in a complex Hilbert space. A **ket** |ψ⟩ is a column vector; a **bra** ⟨ψ| is its conjugate-transpose (row vector). The inner product ⟨φ|ψ⟩ is a complex number.

**Single-qubit kets:**
```
|0⟩ = [1, 0]ᵀ        |1⟩ = [0, 1]ᵀ
|ψ⟩ = α|0⟩ + β|1⟩ = [α, β]ᵀ,    α, β ∈ ℂ
```

**Bra from ket:**
```
⟨ψ| = (|ψ⟩)† = [α*, β*]      (row vector of conjugates)
```

**Normalization:**
Physical states have unit norm:
```
⟨ψ|ψ⟩ = |α|² + |β|² = 1
```
The squared magnitudes |α|², |β|² are probabilities of measurement outcomes in the computational basis (Born rule).

**Inner product ⟨φ|ψ⟩:**
```
|φ⟩ = γ|0⟩ + δ|1⟩
⟨φ|ψ⟩ = γ*α + δ*β                      (scalar in ℂ)
|⟨φ|ψ⟩|²  = probability of measuring φ given state ψ
```
Orthogonal states: ⟨φ|ψ⟩ = 0 (e.g., ⟨0|1⟩ = 0). Equal states: |⟨φ|ψ⟩| = 1.

**Outer product |ψ⟩⟨φ|:**
An operator (matrix). Example: |0⟩⟨0| = diag(1, 0) is the projector onto |0⟩.
```
|0⟩⟨1| = [[0, 1], [0, 0]]     (raising-style operator)
```

**Multi-qubit via tensor product:**
```
|00⟩ = |0⟩⊗|0⟩ = [1, 0, 0, 0]ᵀ
|01⟩ = [0, 1, 0, 0]ᵀ    |10⟩ = [0, 0, 1, 0]ᵀ    |11⟩ = [0, 0, 0, 1]ᵀ
```
Qiskit convention: qubit 0 is the LEAST significant bit, so the string "q1 q0" reads right-to-left. Basis vector |01⟩ in Qiskit means q1=0, q0=1.

**Qiskit example:**
```python
import numpy as np
from qiskit.quantum_info import Statevector

psi = Statevector([1/np.sqrt(2), 1j/np.sqrt(2)])   # (|0⟩ + i|1⟩)/√2
phi = Statevector([1, 0])                           # |0⟩
print(psi.inner(phi))            # ⟨phi|psi⟩ = 1/√2
print(abs(psi.inner(phi))**2)    # P(measure phi) = 0.5
print(psi.is_valid())            # normalized?
```

**Why complex amplitudes (not real)?**
Complex phases enable interference. Example: H|0⟩ = |+⟩, and H|+⟩ = |0⟩ (phases cancel). With real-only amplitudes you could not build unitary dynamics with time-reversal structure; complex numbers fall out of the dynamics naturally (Schrödinger equation has an i).

**Common mistakes:**
- Confusing |α|² (probability, real) with α (amplitude, complex).
- Forgetting to normalize after projection: after measurement, divide by √P.
- Swapping bra/ket order in inner products. ⟨φ|ψ⟩ = ⟨ψ|φ⟩*, not equal in general.
- Qiskit's little-endian bit ordering vs most textbook conventions (left-to-right big-endian).

**Rule of thumb:** Amplitudes are complex, probabilities are the squared magnitudes; always check that ⟨ψ|ψ⟩ = 1 before treating a vector as a valid quantum state.
