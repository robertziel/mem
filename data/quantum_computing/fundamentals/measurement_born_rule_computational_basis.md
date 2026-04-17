### Measurement and the Born Rule

**What it is:**
Measurement extracts classical information from a quantum state. The **Born rule** says the probability of outcome k equals the squared magnitude of the amplitude of the corresponding basis state. Measurement is **irreversible** — the state collapses and superposition information is lost.

**Projective measurement in the computational basis:**
For |ψ⟩ = α|0⟩ + β|1⟩:
```
P(0) = |α|²,   post-measurement state = |0⟩
P(1) = |β|²,   post-measurement state = |1⟩
```
Normalization |α|² + |β|² = 1 guarantees probabilities sum to 1.

**Measurement operators (projectors):**
```
P₀ = |0⟩⟨0| = [[1, 0], [0, 0]]
P₁ = |1⟩⟨1| = [[0, 0], [0, 1]]
P₀ + P₁ = I,   Pₖ² = Pₖ,   Pₖ Pⱼ = 0 for k ≠ j     (orthogonal, complete)
```
Probability and post-measurement state:
```
P(k) = ⟨ψ|Pₖ|ψ⟩ = ||Pₖ|ψ⟩||²
|ψ_after⟩ = Pₖ|ψ⟩ / √P(k)         (renormalize)
```

**Density matrix form:**
```
P(k) = Tr(Pₖ ρ)
ρ_after = Pₖ ρ Pₖ / P(k)
```

**Multi-qubit computational basis:**
For n qubits, 2ⁿ outcomes, projectors Pₓ = |x⟩⟨x| for x ∈ {0,1}ⁿ. Outcome probabilities:
```
P(x) = |⟨x|ψ⟩|² = |cₓ|²
```

**Partial measurement:**
Measuring only some qubits of an entangled state collapses the measured subsystem and updates the unmeasured one. Example:
```
|ψ⟩ = (|00⟩ + |11⟩)/√2
Measure qubit 0 → get 0 with P=½, |ψ_after⟩ = |00⟩
                  get 1 with P=½, |ψ_after⟩ = |11⟩
```
Qubit 1 is now classically correlated with the measured outcome.

**Information destroyed:**
After measurement, the unmeasured-basis information is gone. Example: measuring |+⟩ in Z gives 0 or 1 each with P=½; the original "+" phase is not recoverable.

**Deferred and mid-circuit measurement:**
- **Deferred**: measurements at the end of the circuit (classical output).
- **Mid-circuit**: measurement followed by classical control of later gates, used in quantum error correction, teleportation, magic-state injection. Requires hardware that can do fast classical feedback.

**Qiskit example:**
```python
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

qc = QuantumCircuit(2, 2)
qc.h(0)
qc.cx(0, 1)
qc.measure([0, 1], [0, 1])         # measure both qubits

sim = AerSimulator()
result = sim.run(transpile(qc, sim), shots=4096).result()
print(result.get_counts())         # ~{'00': 2048, '11': 2048}
```

**Observable measurement:**
Measuring Hermitian observable A = Σₖ aₖ |aₖ⟩⟨aₖ|:
- Outcome is one of the eigenvalues aₖ with probability |⟨aₖ|ψ⟩|².
- Expectation value: ⟨A⟩ = Σₖ aₖ P(k) = ⟨ψ|A|ψ⟩.
On NISQ hardware you estimate ⟨A⟩ by many shots of Pauli-basis measurements.

**Non-cloneable info destroyed:**
Because measurement collapses the state, you cannot "peek" at a qubit without disturbing it. This is the basis of BB84 QKD: an eavesdropper measuring in the wrong basis introduces detectable errors.

**Rule of thumb:** Born rule says probabilities are squared amplitudes; measurement collapses the state, is irreversible, and is the only way information leaves a quantum circuit.
