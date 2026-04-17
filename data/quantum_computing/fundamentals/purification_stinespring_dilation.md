### Purification and Stinespring Dilation

**What it is:**
Two sides of the same coin: any **mixed state** ρ on system S can be written as the marginal of a **pure state** on a larger system S⊗E; any **quantum channel** ε on S can be written as a **unitary** on S⊗E followed by a partial trace. In both cases, "noise" or "mixedness" is repackaged as ignorance about an environment.

**Purification (states):**
```
For any ρ on S with eigen-decomp ρ = Σ_i λ_i |i⟩⟨i|:
    |ψ⟩_SE = Σ_i √λ_i |i⟩_S |i⟩_E ∈ S ⊗ E
    Tr_E(|ψ⟩⟨ψ|_SE) = ρ
```
Minimal env dimension = rank(ρ). Purifications are **unique up to an isometry on E**: any two purifications `|ψ⟩_SE`, `|ψ'⟩_SE'` satisfy `|ψ'⟩ = (I_S ⊗ V) |ψ⟩` for some isometry V.

**Stinespring dilation (channels):**
```
For any CPTP ε: S → S with Kraus {E_k}:
    U |φ⟩_S |0⟩_E = Σ_k (E_k |φ⟩_S) |k⟩_E           (isometry S → S⊗E)
    ε(ρ) = Tr_E[ U (ρ ⊗ |0⟩⟨0|_E) U† ]
```
Env dim ≤ d²_S. Every channel is "a unitary you can't see all of."

**Comparison:**
| | Purification | Stinespring |
|---|---|---|
| Object | state ρ | channel ε |
| Output | pure `|ψ⟩_SE` | isometry V (or unitary on S⊗E) |
| Env dim | rank(ρ) | Kraus rank of ε |
| Uniqueness | up to isometry on E | up to isometry on E |

**Qiskit pattern:**
```python
from qiskit.quantum_info import DensityMatrix, Statevector, partial_trace
import numpy as np

# Purify a mixed single-qubit state
rho = DensityMatrix([[0.7, 0.2], [0.2, 0.3]])
vals, vecs = np.linalg.eigh(rho.data)
psi = sum(np.sqrt(v) * np.kron(vecs[:, i], np.eye(2)[:, i])
          for i, v in enumerate(vals))
psi = Statevector(psi / np.linalg.norm(psi))
print(partial_trace(DensityMatrix(psi), [1]))        # recovers rho

# StabilizerState.from_density_matrix exists for stabilizer-rank states
# — same spirit, but restricted to the stabilizer formalism.
```

**When to use:**
- **Simulating noise unitarily**: Stinespring lets you replace any Kraus channel with ancilla + gates + discard — essential for circuit-based simulators that are natively unitary.
- **Reasoning about information leakage**: the environment *is* the eavesdropper in security proofs (QKD, one-time pad).
- **Entanglement distillation**: choose a purification that makes correlations explicit.
- **Complementary channel**: `ε^c(ρ) = Tr_S[U (ρ ⊗ |0⟩⟨0|) U†]` — what the environment learns. Degradable/anti-degradable channels are defined via this.

**Pitfalls:**
- **Non-uniqueness is physical**: different purifications give identical predictions on S but differ on E — never condition on a specific purification unless E is accessible.
- **Env dim blow-up**: repeated dilations compound — keep reducing via Schmidt after every step.
- **Discarding ≠ measuring**: tracing E is unconditional erasure. Measuring E and post-selecting gives a different, non-linear map (instruments, not channels).
- **Numerical**: pick eigenvectors with a consistent phase, otherwise the purification jumps discontinuously under small perturbations of ρ.
- **Confusing the two**: "purification" talks about states, "Stinespring" talks about channels — different objects, same underlying principle. Don't ask for "the Stinespring of ρ" or "the purification of ε".

**Choi duality link:**
Stinespring ↔ Choi matrix ↔ Kraus: three equivalent representations. Stinespring (1 unitary on S⊗E) is the most compact in the unitary-simulation basis; Kraus (≤ d² operators) is best for explicit formulas; Choi (a single d²×d² matrix) is best for numerical channel arithmetic and CP/TP checks.

**Rule of thumb:** Whenever you're stuck with a mixed state or a noisy channel, lift to the purified / dilated picture — problems involving "incomplete information" often become easy once everything is pure and unitary; the classical-like mixedness reappears only when you trace E back out.
