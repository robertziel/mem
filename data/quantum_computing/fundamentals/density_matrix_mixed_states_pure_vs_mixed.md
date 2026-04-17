### Density Matrices and Mixed States

**What it is:**
A density matrix ρ describes a quantum state when you have classical uncertainty about which pure state the system is in (a **mixed** state) or when tracing out part of an entangled system. All quantum states — pure or mixed — can be written as density matrices.

**Definition:**
```
ρ = Σᵢ pᵢ |ψᵢ⟩⟨ψᵢ|,   pᵢ ≥ 0,   Σpᵢ = 1
```
The pᵢ are classical probabilities of being in state |ψᵢ⟩.

**Properties any ρ must satisfy:**
- **Hermitian**: ρ = ρ†.
- **Positive semidefinite**: ⟨φ|ρ|φ⟩ ≥ 0 for all |φ⟩.
- **Trace 1**: Tr(ρ) = 1.

**Pure vs mixed:**
| | Pure | Mixed |
|---|---|---|
| Form | |ψ⟩⟨ψ| | Σpᵢ|ψᵢ⟩⟨ψᵢ| with ≥ 2 nonzero pᵢ |
| Tr(ρ²) (purity) | 1 | < 1 (≥ 1/d) |
| Bloch vector \|r\| | 1 | < 1 (interior of ball) |
| Knowledge | complete | incomplete (classical mixture) |

**Purity:**
```
Tr(ρ²) ∈ [1/d, 1]      d = 2ⁿ for n qubits
  = 1  ⇔  pure
  = 1/d  ⇔  maximally mixed (ρ = I/d)
```

**Single-qubit parameterization:**
```
ρ = ½ (I + rₓ X + r_y Y + r_z Z) = ½ (I + r · σ)
|r| ≤ 1,  equality iff pure
```

**Expectation values:**
```
⟨A⟩ = Tr(ρ A)        (replaces ⟨ψ|A|ψ⟩ for pure states)
```

**Measurement on ρ:**
Probability of outcome associated with projector Pₖ:
```
P(k) = Tr(Pₖ ρ),   post-measurement ρ' = Pₖ ρ Pₖ / P(k)
```

**Reduced density matrix (partial trace):**
Given a bipartite state ρ_AB, the marginal on A is:
```
ρ_A = Tr_B(ρ_AB) = Σₖ (I ⊗ ⟨k|) ρ_AB (I ⊗ |k⟩)
```
Partial trace is how entanglement manifests as **local mixedness**. Starting from a pure entangled state, each subsystem is mixed.

**Canonical example — Bell state:**
```
|Φ⁺⟩ = (|00⟩ + |11⟩)/√2,   ρ_AB = |Φ⁺⟩⟨Φ⁺|     (pure)
ρ_A = Tr_B(ρ_AB) = I/2                          (maximally mixed!)
```
Alice sees a uniformly random bit until she learns Bob's outcome.

**Not unique:**
The same ρ can be written as different ensembles {(pᵢ, |ψᵢ⟩)}. E.g., ρ = I/2 = ½|0⟩⟨0| + ½|1⟩⟨1| = ½|+⟩⟨+| + ½|−⟩⟨−|. Only ρ is physical; the ensemble is not.

**Qiskit example:**
```python
from qiskit.quantum_info import DensityMatrix, partial_trace, purity

bell = DensityMatrix.from_label('00').evolve_from_hdagger_cx()  # schematic
# Concrete:
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector
qc = QuantumCircuit(2); qc.h(0); qc.cx(0, 1)
rho = DensityMatrix(Statevector(qc))
print(purity(rho))                # 1.0  (pure)
rho_A = partial_trace(rho, [1])   # trace out qubit 1
print(purity(rho_A))              # 0.5  (maximally mixed)
```

**When to use density matrices instead of state vectors:**
- Noise and decoherence (open systems, Kraus channels).
- Subsystems of entangled states.
- Averaging over classical randomness (e.g., random Pauli twirling).
- Thermal / equilibrium states ρ ∝ e^{−βH}.

**Rule of thumb:** Reach for a state vector only when the state is certainly pure and you don't need marginals; for everything involving noise, subsystems, or classical mixing, use ρ.
