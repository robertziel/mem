### Depolarizing, Amplitude-Damping, and Phase-Damping Channels

**What they are:** Three canonical CPTP (completely positive trace-preserving) noise channels used to model realistic qubit errors. Each is specified by its Kraus operators {E_k} satisfying Σ_k E_k† E_k = I, with ρ → Σ_k E_k ρ E_k†.

**Depolarizing channel (symmetric Pauli noise):**

ρ → (1 − p)·ρ + (p/3)·(XρX + YρY + ZρZ)

Kraus: {√(1−p) I, √(p/3) X, √(p/3) Y, √(p/3) Z}.
- Equivalent to "with prob p, apply a uniformly random non-identity Pauli."
- Isotropic on the Bloch sphere: Bloch vector shrinks by (1 − 4p/3).
- Used as a crude first-order model; rarely physical but mathematically convenient.

**Amplitude damping (T1 process):**

Kraus:
- E_0 = [[1, 0], [0, √(1−γ)]]
- E_1 = [[0, √γ], [0, 0]]

with γ = 1 − exp(−t/T1). Maps |1⟩ → √(1−γ)|1⟩ + √γ|0⟩ (energy loss). Not unital: fixed point is |0⟩, not I/2.

**Phase damping (pure dephasing):**

Kraus:
- E_0 = [[1, 0], [0, √(1−λ)]]
- E_1 = [[0, 0], [0, √λ]]

with λ = 1 − exp(−t/T_φ). Leaves populations alone, shrinks off-diagonal ρ_01 → √(1−λ)·ρ_01. Equivalent (up to a unitary basis change) to a probabilistic Z channel with p_Z = (1 − √(1−λ))/2.

**Comparison table:**

| Channel | Unital? | Fixed point | Bloch effect | Physical origin |
|---|---|---|---|---|
| Depolarizing | Yes | I/2 | uniform shrink | generic / worst-case |
| Amplitude damping | No | |0⟩⟨0| | +z drift + shrink | spontaneous emission, T1 |
| Phase damping | Yes | diagonal ρ | xy shrink, z preserved | elastic scattering, T_φ |
| Thermal relaxation | No | Gibbs state | both | T1 + T_φ combined |

**Relation to Pauli error rates (for simulation):**

Depolarizing with rate p ⇒ p_X = p_Y = p_Z = p/3.
Phase damping (λ) ⇒ equivalent Pauli-Z error with p_Z = λ/2 (to leading order).
Amplitude damping (γ) ⇒ Pauli twirl gives p_X = p_Y = γ/4, p_Z = γ/4 (approx, small γ).

**Simulating in Qiskit Aer:**
```python
from qiskit_aer.noise import (
    depolarizing_error, amplitude_damping_error,
    phase_damping_error, NoiseModel
)
nm = NoiseModel()
nm.add_all_qubit_quantum_error(depolarizing_error(1e-3, 1), ['sx','x'])
nm.add_all_qubit_quantum_error(depolarizing_error(1e-2, 2), ['cx','ecr'])
nm.add_all_qubit_quantum_error(amplitude_damping_error(0.01), ['id'])
nm.add_all_qubit_quantum_error(phase_damping_error(0.02), ['id'])
```

**Stim (Clifford-only, very fast):**
```
X_ERROR(0.001) 0
Z_ERROR(0.002) 0
DEPOLARIZE1(0.001) 0
DEPOLARIZE2(0.01) 0 1
```

**Pauli twirling:** Randomizing a general (coherent) channel over the Pauli group converts it into a stochastic Pauli channel. Makes analysis tractable and preserves average fidelity — essential trick for QEC simulators.

**Rule of thumb:** Use depolarizing for back-of-envelope threshold estimates, amplitude + phase damping to reproduce measured T1/T2, and Pauli-twirled models in stim-scale QEC simulations where speed dominates fidelity realism.
