### Expressibility and Entangling Power — Ansatz Quality Before Training

**What it is:**
Before you run a variational algorithm, two quantities characterize the **parameterized circuit** itself:
- **Expressibility:** how well the output states `|ψ(θ)⟩` cover the Hilbert space (relative to Haar-random sampling).
- **Entangling power:** how much entanglement the ansatz generates on average (Meyer–Wallach).

Together they quantify **ansatz quality**: a good VQA needs enough expressibility to reach the target state but also a rich entangling structure — while staying trainable (avoiding barren plateaus).

**Expressibility — KL / Frame-potential form:**
Sample `θ`, build `|ψ(θ)⟩ = U(θ)|0⟩`, compute fidelity with a second sample `|ψ(φ)⟩`. Histogram the fidelities and compare against the Haar distribution:
```
P_Haar(F) = (D − 1)(1 − F)^(D − 2),   D = 2^n
Expr = D_KL( P_ansatz(F) ‖ P_Haar(F) )
```
Lower `Expr` → closer to Haar, more expressive. Perfect expressibility (2-design) gives `Expr = 0`.

**Entangling power — Meyer–Wallach (MW):**
For a state `|ψ⟩`:
```
Q(|ψ⟩) = (2 / n) Σ_j (1 − Tr[ρ_j²])
```
where `ρ_j` is the reduced density matrix of qubit `j`. Average over random `θ`:
```
Ent(U(θ)) = ⟨Q(|ψ(θ)⟩)⟩_θ ∈ [0, 1]
```
- `0`: product states (no entanglement).
- `1`: maximal average entanglement (Haar-random has `≈ 1 − 1/(2^n + 1)`).

**Quick reference — common ansätze:**
| Ansatz | Expressibility | Entangling power | Notes |
|---|---|---|---|
| RY-linear entangler, 1 layer | Low | ~0.2 | Fast, shallow |
| RY+CNOT full, 3 layers | Medium | ~0.7 | Common VQE ansatz |
| EfficientSU2, 3 layers | High | ~0.85 | Good default |
| Hardware-efficient, ~n layers | Near Haar | ~0.95 | Risks barren plateaus |
| HVA (Hamiltonian-variational) | Problem-tuned | Moderate | Good for physics |

**Example — estimating expressibility and entangling power:**
```python
import numpy as np
from qiskit.circuit.library import EfficientSU2
from qiskit.quantum_info import Statevector, partial_trace

def meyer_wallach(state, n):
    return (2 / n) * sum(1 - np.real(np.trace(partial_trace(state, [q]).data @
                                              partial_trace(state, [q]).data))
                          for q in range(n))

n, reps, samples = 4, 3, 500
ansatz = EfficientSU2(num_qubits=n, reps=reps)
rng = np.random.default_rng(0)
mw, fids = [], []
prev = None
for _ in range(samples):
    theta = rng.uniform(0, 2*np.pi, ansatz.num_parameters)
    sv = Statevector.from_instruction(ansatz.assign_parameters(theta))
    mw.append(meyer_wallach(sv, n))
    if prev is not None: fids.append(np.abs(prev.inner(sv))**2)
    prev = sv
print(f"Entangling power (MW avg) ≈ {np.mean(mw):.3f}")
print(f"Mean fidelity vs. Haar 2/(D+1) = {2/(2**n + 1):.3f}: observed {np.mean(fids):.3f}")
```

**The expressibility ↔ trainability tension:**
An ansatz that approaches a 2-design (`Expr → 0`) has **exponentially vanishing gradients** by the barren-plateau theorem. Useful ansätze sit in a middle zone: expressive enough to contain the target state, structured enough to stay trainable. A rough guideline:
- `Ent ≈ 0.5–0.8` is often a sweet spot for chemistry VQE.
- `Expr / Expr_Haar ∈ [0.1, 1.0]` — well below Haar but non-trivial.

**When to use:**
- **Pre-training diagnostic:** before spending hours on VQE/QAOA, check expressibility + entangling power of your ansatz.
- **Ansatz selection:** rank candidates on the expressibility–entangling-power plane.
- **Depth tuning:** track both metrics as you add layers; pick the smallest depth that covers your target.

**Pitfalls:**
- Both metrics are **problem-agnostic**: a maximally expressive ansatz is useless if symmetries of the Hamiltonian are not respected.
- Expressibility by KL-divergence requires fidelity sampling — `O(D²)` in naive statevector; use kernel approximations for larger `n`.
- MW is one of many entanglement measures; Q (MW) insensitive to multipartite fine structure.
- Does not detect classical simulability: Clifford-augmented ansätze can look expressive but be stabilizer-simulable.

**Rule of thumb:** Track expressibility and entangling power together — pick the shallowest ansatz whose entangling power is ≥ 0.5 and whose expressibility is well inside Haar; if both numbers say "Haar-like" you are probably on a barren plateau.
