### Partial Trace — Reduced Density Matrices

**What it is:**
The **partial trace** `Tr_B` maps a joint density matrix `ρ_AB` on A⊗B to a **reduced density matrix** `ρ_A` on A alone, describing everything measurable on A without touching B. It is the unique linear operation that reproduces all local expectation values: `Tr(ρ_A · O_A) = Tr(ρ_AB · (O_A ⊗ I_B))`.

**Math:**
```
ρ_A = Tr_B(ρ_AB) = Σ_k (I_A ⊗ ⟨k|_B) ρ_AB (I_A ⊗ |k⟩_B)
```
Independent of the B-basis {|k⟩}. Equivalently, for `ρ_AB = Σ c_{ij,kl} |i⟩⟨k|_A ⊗ |j⟩⟨l|_B`:
```
(ρ_A)_{ik} = Σ_j c_{ij,kj}      (contract over B indices)
```

**Why mixedness emerges:**
Even a **pure** `|ψ⟩_AB` yields mixed `ρ_A` whenever A and B are entangled. The Schmidt decomposition `|ψ⟩ = Σ_i √λ_i |a_i⟩|b_i⟩` gives `ρ_A = Σ_i λ_i |a_i⟩⟨a_i|`. Pure marginal ⇔ product state.

**Canonical examples:**
| `|ψ⟩_AB` | `ρ_A` | `Tr(ρ_A²)` |
|---|---|---|
| `|00⟩` (product) | `|0⟩⟨0|` | 1 (pure) |
| Bell `(|00⟩+|11⟩)/√2` | `I/2` | 0.5 (max mixed) |
| `cosθ|00⟩ + sinθ|11⟩` | `diag(cos²θ, sin²θ)` | varies |

**Qiskit:**
```python
from qiskit import QuantumCircuit
from qiskit.quantum_info import DensityMatrix, partial_trace, purity

qc = QuantumCircuit(3); qc.h(0); qc.cx(0, 1); qc.cx(1, 2)   # GHZ
rho = DensityMatrix(qc)
rho_01 = partial_trace(rho, [2])      # trace out qubit 2
rho_0  = partial_trace(rho, [1, 2])   # trace out qubits 1,2
print(purity(rho_0))                  # 0.5  (maximally mixed)
print(purity(rho_01))                 # 0.5  (GHZ marginal on 2 qubits)
```

**When to use:**
- Computing **local observables** when the rest of the system is inaccessible or noisy.
- **Entanglement diagnostics**: `S(ρ_A) > 0` from a pure global state certifies A–B entanglement.
- Modelling **open systems**: environment plays the role of B; tracing it gives the system's effective state.
- Defining **entanglement entropy**, **concurrence**, **mutual information**.

**Pitfalls:**
- **Global phase on B is erased**: tracing out B kills any `e^{iφ}` that lived entirely on B, but *relative* phases between entangled branches become classical correlations in `ρ_A`. Do not expect to recover coherences by tracing back in.
- **Not reversible**: `ρ_A ⊗ ρ_B ≠ ρ_AB` in general — the partial trace destroys correlations.
- **Qubit indexing**: Qiskit uses **little-endian** — `partial_trace(rho, [0])` traces the *rightmost* qubit of the labeling you think you have. Always sanity-check with a known Bell state.
- **Classical vs quantum correlations**: `ρ_A` mixed does not distinguish entanglement from classical uncertainty — pair with a witness or entropy test.
- **Numerical hermiticity drift**: after many partial traces, symmetrize as `(ρ + ρ†)/2` before feeding into entropy routines.

**Connection to purification:**
Every mixed ρ on A is `Tr_E(|ψ⟩⟨ψ|_{AE})` for some pure state on an enlarged space — partial trace is the left inverse of purification (up to env isometry). The Stinespring dilation of a channel ε is `ε(ρ) = Tr_E[U(ρ ⊗ |0⟩⟨0|_E)U†]` — every channel is secretly a partial trace of a unitary.

**Scaling cost:**
`partial_trace` on a bipartite `(d_A × d_B) × (d_A × d_B)` matrix reduces to `d_A × d_A` with a sum over `d_B` outer-product terms — cost `O(d_A² · d_B)`. For many-qubit systems, prefer reshape-based contraction (`ρ` as a rank-4 tensor) over iterating basis states; `partial_trace` does this internally.

**Composition law:**
```
Tr_B(Tr_C(ρ_ABC)) = Tr_{BC}(ρ_ABC)      (associativity)
Tr_B(ρ_A ⊗ σ_B) = ρ_A · Tr(σ_B) = ρ_A   (product states)
```
Use to simplify: break a 5-qubit trace into two 3-qubit traces when memory is tight.

**Rule of thumb:** If you need to talk about "just this subsystem," reach for `partial_trace`; whenever the result is mixed and the whole was pure, you have found entanglement — quantify it with `entropy(ρ_A)`.
