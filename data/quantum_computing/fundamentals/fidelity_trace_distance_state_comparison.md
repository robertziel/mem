### Fidelity and Trace Distance

**What it is:**
Two metrics for comparing quantum states (or channels). **Fidelity** measures similarity (1 = identical, 0 = orthogonal). **Trace distance** measures distinguishability (0 = identical, 1 = perfectly distinguishable). Both reduce to simple expressions in special cases and are dual in many bounds.

**Trace distance:**
```
D(ρ, σ) = ½ ||ρ − σ||₁ = ½ Tr|ρ − σ|
        = ½ Σᵢ |λᵢ|     where λᵢ are eigenvalues of (ρ − σ)
```
- Range [0, 1]. D = 0 iff ρ = σ.
- Operational meaning: maximum probability of correctly distinguishing ρ and σ with one measurement is ½ (1 + D).
- A proper metric: symmetric, triangle inequality, monotone under quantum channels.

**Fidelity:**
```
F(ρ, σ) = [Tr √(√ρ σ √ρ)]²      (Uhlmann / Jozsa convention — squared)
```
Some authors omit the square (so range is [0, 1] linearly in overlap). Qiskit uses the **squared** form by default.

**Special cases:**
| Case | Trace distance | Fidelity |
|---|---|---|
| Both pure | √(1 − \|⟨ψ\|φ⟩\|²) | \|⟨ψ\|φ⟩\|² |
| One pure \|ψ⟩, one ρ | — | ⟨ψ\|ρ\|ψ⟩ |
| Commuting ρ, σ | ½ Σᵢ\|pᵢ − qᵢ\| | (Σᵢ √(pᵢqᵢ))² |
| Identical | 0 | 1 |

**Fuchs-van de Graaf inequalities:**
```
1 − √F(ρ, σ)  ≤  D(ρ, σ)  ≤  √(1 − F(ρ, σ))
```
So F → 1 iff D → 0; they agree on "close" vs "far" but differ quantitatively.

**When to use which:**
- **Trace distance**: when you care about operational distinguishability, error bounds on outcomes, worst-case over measurements.
- **Fidelity**: when comparing against a pure target state (common in experiments), easier to estimate with randomized benchmarking or direct overlap.

**Process fidelity (for gates / channels):**
Given target unitary U and implemented channel ℰ:
```
F_process(ℰ, U) = (1/d²) |Tr(U† K)|²    — for single Kraus op K ≈ ℰ
F_avg = (d F_process + 1) / (d + 1)        — average gate fidelity
```
Randomized benchmarking (RB) extracts the average gate fidelity without state prep / measurement errors.

**Diamond norm:**
For channels, the worst-case analog of trace distance:
```
||ℰ − ℱ||_◇ = sup_ρ D((ℰ ⊗ I)(ρ), (ℱ ⊗ I)(ρ))
```
The identity ancilla tensor is essential — some channels look identical locally but differ when applied to half of an entangled state.

**Qiskit example:**
```python
from qiskit.quantum_info import state_fidelity, DensityMatrix, Statevector
import numpy as np

psi = Statevector([1/np.sqrt(2), 1/np.sqrt(2)])     # |+⟩
phi = Statevector([1/np.sqrt(2), -1/np.sqrt(2)])    # |−⟩
print(state_fidelity(psi, phi))                      # 0.0  (orthogonal)

rho = DensityMatrix(psi)
noisy = 0.9 * rho.data + 0.1 * np.eye(2) / 2        # 10% depolarizing
print(state_fidelity(rho, DensityMatrix(noisy)))    # ≈ 0.925
```

**Pitfall — convention confusion:**
Some references define F = Tr√(√ρ σ √ρ) (not squared). Check before quoting numbers; a "95% fidelity" in one paper can mean ~90% in another.

**Rule of thumb:** Use fidelity when the target is a pure state and you want a single-number benchmark; use trace distance or diamond norm when you need rigorous bounds on how distinguishable two states or channels are.
