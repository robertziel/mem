### KAK (Cartan) Two-Qubit Decomposition

**What it is:**
A structural theorem for SU(4): **every** 2-qubit unitary U can be written as
```
U = (A₁ ⊗ A₂) · exp(i(aXX + bYY + cZZ)) · (B₁ ⊗ B₂)
```
with `A_i, B_i ∈ SU(2)` and real coefficients (a, b, c) (the **Cartan coordinates**). Equivalently: **at most 3 CNOTs + 8 single-qubit gates** realize any 2-qubit gate — a tight upper bound.

**CNOT count from Cartan coords / Makhlin invariants:**
| # CNOTs needed | Condition |
|---|---|
| 0 | U is a product `V ⊗ W` (a = b = c = 0) |
| 1 | c = 0 and (a, b) on a specific line (one SWAP-like axis) |
| 2 | generic 2-qubit, but real-orthogonal (e.g., CNOT itself is 1-CNOT trivially, but SWAP = 3) |
| 3 | generic SU(4) — the worst case |

**Makhlin invariants** `G₁(U), G₂(U)` (scalar functions of U) determine which class U falls into without computing the full decomposition — useful for quick "is this worth optimizing" checks.

**Qiskit:**
```python
from qiskit.circuit.library import CXGate
from qiskit.quantum_info import Operator
from qiskit.synthesis import TwoQubitBasisDecomposer
import numpy as np

# Decompose arbitrary U with CX as the entangler
decomposer = TwoQubitBasisDecomposer(CXGate(), euler_basis='ZYZ')
U = Operator(np.random.randn(4, 4) + 1j * np.random.randn(4, 4))
# ... (Haar-random unitary generation omitted; use qiskit.quantum_info.random_unitary)
from qiskit.quantum_info import random_unitary
U = random_unitary(4, seed=1)
qc = decomposer(U.data)
print(qc.count_ops())                              # {'cx': 3, 'u3': 4, ...}
```

**Non-CNOT bases:**
`TwoQubitBasisDecomposer(iSwapGate())` gives decompositions using iSWAP as the entangler — shorter on Google-style hardware. `fSim`, `ECR`, `RZZ` all work. The **basis fidelity** argument lets the synthesizer trade gate count against hardware-calibrated fidelity.

**Comparison with brute-force compilation:**
| Approach | CNOT count (generic U) | Single-qubit gates | Optimal? |
|---|---|---|---|
| Pauli rotations / naive Trotter | O(n) scaling in angle count | many | no |
| Generic KAK (Shende–Markov–Bullock) | 3 | 8 | yes |
| Vatan–Williams (CNOT basis) | 3 | 15 (balanced) | yes for CX |

**When to use:**
- **Peephole optimization**: collapse any 2-qubit subcircuit to its KAK normal form — the transpiler does this at `optimization_level=3`.
- **Cross-basis compilation**: translating between CNOT, iSWAP, CZ, fSim-based circuits — KAK gives a hardware-agnostic 3-entangler target.
- **Benchmarking**: maximum 3 CNOTs is a tight bound; anything more in your compiled circuit is a bug or a feature of the constraint (e.g., coupling-map SWAPs).
- **Resource-estimation sanity**: if an algorithm reports `4+ CNOTs` per 2-qubit block, KAK says it's suboptimal or the blocks are larger than 2 qubits.

**Pitfalls:**
- **KAK is local only**: applies to isolated 2-qubit blocks. Across a wider circuit, aggressive peephole can ignore structure (e.g., Clifford simplifications that save more than KAK finds).
- **Coupling map**: KAK gives a logical decomposition; routing/swap insertion is a separate pass. On sparse connectivity (heavy-hex), SWAPs can dominate the entangler count.
- **Numerical conditioning**: near class boundaries (a or b or c near 0), small numerical noise can push the algorithm into a "3 CNOT" solution when "2 CNOT" would suffice — use the KAK decomposer's tolerance argument.
- **Global phase**: `TwoQubitBasisDecomposer` returns a circuit matching U up to global phase. If controlled later, track the phase explicitly.
- **Euler basis choice**: `ZYZ`, `ZXZ`, `U3` all work mathematically but produce different single-qubit gate counts; pick the one matching your backend's native 1-qubit basis.
- **Non-CNOT entanglers non-optimal**: if you feed `iSwapGate()` but U is near the CNOT Weyl-chamber corner, you may still pay 3 iSWAPs — the decomposer is optimal *per basis*, not across bases.

**Weyl-chamber picture:**
The 3D region `{(a, b, c) : π/4 ≥ a ≥ b ≥ |c|}` parametrizes all SU(4) classes up to local equivalence. Each native 2-qubit gate (CX, iSWAP, √iSWAP, fSim) sits at a fixed point. U's Cartan coordinates determine how many copies of the native gate reach U.

**Rule of thumb:** For any 2-qubit unitary: **3 CNOTs is the ceiling, 0 is the floor** — run `TwoQubitBasisDecomposer` before hand-optimizing, and use Makhlin invariants to see the minimum entangler count without paying full decomposition cost.
