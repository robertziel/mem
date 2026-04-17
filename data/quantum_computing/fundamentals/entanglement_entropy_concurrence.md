### Entanglement Entropy and Concurrence

**What it is:**
Scalar measures that quantify how entangled a state is. **Von Neumann entropy** of a reduced state is the gold standard for **pure** bipartite states; **concurrence** (Wootters) gives a closed-form entanglement measure for **mixed** 2-qubit states, where entropy of entanglement no longer works.

**Von Neumann entropy:**
```
S(ρ) = -Tr(ρ log ρ) = -Σ_i λ_i log λ_i        (λ_i = eigenvalues of ρ)
```
For a pure `|ψ⟩_AB`, the **entanglement entropy** is `S(ρ_A) = S(ρ_B)`. Ranges 0 (product) to `log(d_A)` (maximally entangled).

**Rényi entropies:**
```
S_α(ρ) = (1/(1-α)) log Tr(ρ^α)
S_2(ρ) = -log Tr(ρ²)          (easiest to measure via swap test)
```

**Concurrence (2-qubit, any ρ):**
```
ρ̃ = (Y ⊗ Y) ρ* (Y ⊗ Y)            (spin-flipped state)
eigenvalues of ρ ρ̃ in decreasing order: λ₁ ≥ λ₂ ≥ λ₃ ≥ λ₄
C(ρ) = max(0, √λ₁ - √λ₂ - √λ₃ - √λ₄) ∈ [0, 1]
```
`C = 0` ⇔ separable; `C = 1` ⇔ Bell state. **Entanglement of formation** `E_f(ρ) = h((1+√(1-C²))/2)` with `h` the binary entropy — monotone in C.

**Comparison:**
| Measure | Works on | Range | Meaning |
|---|---|---|---|
| S(ρ_A) | pure ρ_AB | [0, log d] | entropy of entanglement |
| Concurrence | 2-qubit mixed | [0, 1] | closed-form; ≥ 0 iff entangled |
| Negativity | any bipartite | [0, (d-1)/2] | based on partial transpose |
| Entanglement of formation | any (hard) | [0, log d] | min S(ρ_A) over decompositions |

**Area law:**
Ground states of **gapped local 1D Hamiltonians** have `S(ρ_{region}) = O(1)` (constant, not volume-scaling). This is why **matrix product states** (bond dim χ ~ exp(S)) succeed for 1D and **MPS/DMRG** dominates — simulable entanglement, not arbitrary states.

**Qiskit:**
```python
from qiskit import QuantumCircuit
from qiskit.quantum_info import (
    DensityMatrix, partial_trace, entropy, concurrence, entanglement_of_formation
)

qc = QuantumCircuit(2); qc.h(0); qc.cx(0, 1)         # Bell
rho = DensityMatrix(qc)
rho_A = partial_trace(rho, [1])
print(entropy(rho_A, base=2))                        # 1.0 bit
print(concurrence(rho))                              # 1.0
print(entanglement_of_formation(rho))                # 1.0 ebit
```

**When to use which:**
- **Pure state entanglement** → von Neumann entropy of a marginal.
- **2-qubit noisy states** (after a gate, in a QEC cycle) → concurrence or negativity.
- **Scaling studies** (area vs volume law, critical points) → Rényi-2 via randomized measurements.
- **Benchmarking quantum memory** → entanglement of formation or fidelity with a Bell pair.

**Pitfalls:**
- **Concurrence is 2-qubit only**. Beyond that, no closed form for entanglement of formation — use negativity or variational bounds.
- **Entropy of a mixed state is NOT entanglement**: `S(ρ)` mixes classical and quantum. Condition on purification or use `S(ρ_A) - S(ρ_AB)` (coherent information) if ρ_AB is mixed.
- **Numerical log(0)**: drop near-zero eigenvalues or use `scipy.special.xlogy`.
- **Basis of log**: `log_2` → bits/ebits; `ln` → nats. Qiskit defaults to base 2.
- **Bound entanglement** has zero distillable entanglement but nonzero entanglement of formation — concurrence still catches some of it in the 2-qubit case but not in higher dims.

**Rule of thumb:** For a pure bipartite state, one number (entropy) tells the whole story; for mixed 2-qubit states, concurrence is your friend; beyond that, no single scalar captures entanglement — pick the measure matched to the task.
