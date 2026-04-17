### Global Phase vs Relative Phase

**What it is:**
Multiplying an entire quantum state by a unit complex number e^{iθ} (a **global phase**) produces a physically indistinguishable state. Phase differences **between** amplitudes within a state (**relative phase**) are physically meaningful and produce observable interference.

**Global phase — unobservable:**
```
|ψ⟩ and e^{iθ}|ψ⟩ give identical probabilities for any measurement.
```
Proof: for any projector P, ⟨ψ|e^{−iθ} P e^{iθ}|ψ⟩ = ⟨ψ|P|ψ⟩. The phase cancels.

**Relative phase — observable:**
```
|ψ₁⟩ = (|0⟩ + |1⟩)/√2   = |+⟩
|ψ₂⟩ = (|0⟩ − |1⟩)/√2   = |−⟩
```
Both have 50/50 probabilities in the Z basis, but they are orthogonal (⟨ψ₁|ψ₂⟩ = 0). In the X basis H maps |+⟩ → |0⟩ and |−⟩ → |1⟩, so H + Z-measure distinguishes them with certainty.

| State | Amplitudes | P(0) Z-basis | P(0) X-basis |
|---|---|---|---|
| |+⟩ | (1, 1)/√2 | 1/2 | 1 |
| |−⟩ | (1, −1)/√2 | 1/2 | 0 |
| |+i⟩ | (1, i)/√2 | 1/2 | 1/2 |

Relative phase moves the state around the **equator** of the Bloch sphere (changes φ), not between poles.

**Why it matters — interference:**
Quantum speedup comes from amplitudes adding constructively for correct answers and destructively for wrong ones. That cancellation is entirely a relative-phase phenomenon.

Example: two paths through an interferometer with amplitudes 1/√2 and e^{iθ}/√2. The probability at the output detector is |1 + e^{iθ}|² / 4 = (1 + cos θ) / 2. θ = 0 → 1, θ = π → 0.

**Gates that flip relative phase:**
- **Z**: |0⟩ → |0⟩, |1⟩ → −|1⟩ (π relative phase on |1⟩ component).
- **S**: |1⟩ → i|1⟩ (π/2).
- **T**: |1⟩ → e^{iπ/4}|1⟩ (π/4).
- **P(λ)**: |1⟩ → e^{iλ}|1⟩ (arbitrary).

These do nothing observable when applied to |0⟩ or |1⟩ alone (they are eigenstates), but change outcomes for superpositions.

**Qiskit demo:**
```python
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

qc1 = QuantumCircuit(1); qc1.h(0)                      # |+⟩
qc2 = QuantumCircuit(1); qc2.h(0); qc2.z(0)            # |−⟩
print(Statevector(qc1).equiv(Statevector(qc2)))        # False — observable
# But a global phase is not observable:
qc3 = QuantumCircuit(1); qc3.h(0); qc3.global_phase = 1.2345
print(Statevector(qc1).equiv(Statevector(qc3)))        # True
```

**Subtlety — controlled gates:**
A global phase on an unconditional gate is unobservable, but the same "global" phase becomes a **relative** phase when that gate is put under control. This is why controlled-U for U ∝ e^{iα} V does NOT equal controlled-V. Example: CRZ(2α) ≠ CP(2α); they differ by a phase that only shows up when the control qubit is in superposition.

**Rule of thumb:** Drop global phases freely in calculations, but treat every phase inside a superposition as physical; controlled operations promote global phases into observable ones.
