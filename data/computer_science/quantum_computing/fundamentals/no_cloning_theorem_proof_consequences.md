### No-Cloning Theorem

**What it is:**
There is no unitary (or any quantum channel) that takes an arbitrary unknown state |ψ⟩ and produces |ψ⟩ ⊗ |ψ⟩. Quantum information cannot be copied. This one-line theorem distinguishes quantum information from classical information and underpins the security of QKD.

**Statement:**
There is no unitary U and no "blank" state |b⟩ such that for every |ψ⟩ in a Hilbert space of dimension ≥ 2:
```
U (|ψ⟩ ⊗ |b⟩) = |ψ⟩ ⊗ |ψ⟩
```

**Proof (linearity):**
Suppose U could clone both |ψ⟩ and |φ⟩:
```
U(|ψ⟩|b⟩) = |ψ⟩|ψ⟩
U(|φ⟩|b⟩) = |φ⟩|φ⟩
```
Take inner product of the two equations:
```
⟨ψ|φ⟩ · ⟨b|b⟩ = (⟨ψ|φ⟩)²
⟨ψ|φ⟩ = (⟨ψ|φ⟩)²        (since ⟨b|b⟩ = 1)
⟨ψ|φ⟩ ∈ {0, 1}
```
So cloning only works for orthogonal pairs — impossible for arbitrary (non-orthogonal) inputs. □

**Alternative proof (linearity of U):**
U linear + U|ψ|b⟩ = |ψ⟩|ψ⟩ and U|φ|b⟩ = |φ⟩|φ⟩ force
```
U((α|ψ⟩ + β|φ⟩)|b⟩) = α|ψ⟩|ψ⟩ + β|φ⟩|φ⟩    (by linearity)
```
But cloning (α|ψ⟩ + β|φ⟩) should produce (α|ψ⟩+β|φ⟩)(α|ψ⟩+β|φ⟩), which has cross terms αβ|ψ⟩|φ⟩ + αβ|φ⟩|ψ⟩. These two outputs disagree.

**What IS allowed:**
- **Cloning orthogonal states** — e.g., CNOT clones computational-basis states: CNOT|0⟩|0⟩ = |00⟩, CNOT|1⟩|0⟩ = |11⟩. But CNOT|+⟩|0⟩ = (|00⟩+|11⟩)/√2 (entanglement, not a copy).
- **Approximate (imperfect) cloning** — universal cloners (Buzek-Hillery) achieve fidelity 5/6 for two copies of a qubit; no better is possible.
- **Cloning classical information encoded in quantum states** — if you know which of an orthogonal set a state is in, you can copy; unknown state cannot.

**Related no-go theorems:**
| Theorem | Statement |
|---|---|
| **No-broadcasting** | Can't even create ρ_{AB} with ρ_A = ρ_B = ρ for arbitrary mixed ρ. |
| **No-deleting** | Given two copies, cannot delete one deterministically. |
| **No-signaling** | Entanglement alone can't transmit classical info faster than light. |
| **No-teleportation without channel** | Can't transmit |ψ⟩ classically (needs entanglement + qubits). |

**Consequences — things you cannot do:**
- **Amplify a weak quantum signal** the way a classical repeater amplifies a classical bit. Long-distance quantum communication needs **quantum repeaters** (entanglement swapping + distillation), not amplifiers.
- **Measure an unknown state repeatedly** to learn it — each measurement collapses.
- **Backup or snapshot a running quantum computation** for rollback / debugging.
- **Intercept-resend eavesdropping in BB84** — Eve can't clone the qubit to measure later; her intercept collapses it, introducing detectable errors (this is exactly what makes BB84 secure).

**Consequences — things it enables:**
- **Quantum key distribution**: detect eavesdropping via disturbance.
- **Quantum money** (Wiesner): bank notes carrying non-orthogonal quantum states can't be forged.
- **Blind / delegated quantum computing** protocols.

**Qiskit demonstration of cloning failure:**
```python
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

qc = QuantumCircuit(2)
qc.h(0)                       # qubit 0 = |+⟩
qc.cx(0, 1)                   # "try to copy" to qubit 1

state = Statevector(qc)
print(state.data)             # (|00⟩ + |11⟩)/√2, NOT |+⟩|+⟩ = (|00⟩+|01⟩+|10⟩+|11⟩)/2
```
CNOT copies computational-basis states but entangles superpositions — the cleanest illustration of why the naive cloning circuit fails.

**Optimal cloning bound (quantum cloning machine):**
Universal symmetric 1→2 qubit cloner achieves each copy at fidelity
```
F = 5/6 ≈ 0.833
```
Impossible to exceed for arbitrary inputs.

**Rule of thumb:** Any protocol that assumes "copy this qubit and try again" is broken at the foundation; quantum communication, security, and algorithm design all start from no-cloning.
