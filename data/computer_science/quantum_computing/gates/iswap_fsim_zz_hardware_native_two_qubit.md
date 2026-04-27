### iSWAP, fSim, ZZ, MS — Hardware-Native Two-Qubit Gates

**What it is:**
CNOT is the textbook entangler, but **no current hardware implements CNOT directly**. Every platform has its own native 2-qubit interaction, and compiling to CNOT throws away gate time and fidelity. Knowing the native set for your backend often halves 2-qubit depth.

**The native zoo:**
| Gate | Form | Hardware | Notes |
|---|---|---|---|
| CZ / CX | diag(1,1,1,-1) | IBM SC (older), Rigetti | 2 CNOTs ≠ 1 CZ in general |
| iSWAP | swap \|01⟩↔i\|10⟩ | Google (xmon), early IBM | same entangling power as CNOT |
| √iSWAP | half-angle | Google Sycamore | 2 × √iSWAP ≈ full entangler |
| fSim(θ, φ) | XY(θ) + CZ(φ) | Google | tunable swap + controlled-phase |
| RZZ(θ) | exp(-iθ ZZ/2) | IonQ, Quantinuum | parametrized directly |
| MS(θ) | XX/YY with global phase | trapped ions (all pairs) | all-to-all connectivity |
| Rydberg-CZ | controlled-phase via blockade | neutral atoms | high fidelity but long |

**Entangling power (Makhlin invariants):**
CNOT, CZ, iSWAP, DCNOT all have *maximal* 2-qubit entangling power but live at **different points** in the Weyl chamber. Converting between them costs:
- CNOT → iSWAP: 2 iSWAPs + single-qubit gates (or 3 √iSWAPs).
- iSWAP → CNOT: 2 CNOTs + single-qubit gates.
- fSim(π/2, 0) = iSWAP up to phases; fSim(0, φ) = CZ(φ).

**When NOT to decompose to CNOT:**
- Variational ansatz: use `RZZ(θ)` as a free parameter — compiling to `CNOT-RZ-CNOT` triples depth.
- QAOA: `exp(-iγ ZᵢZⱼ)` is literally RZZ — keep it native on IonQ / Quantinuum.
- Trotter steps of XX/YY/ZZ Hamiltonians: run on MS or fSim directly.
- Circuit fits naturally onto √iSWAP (e.g., free-fermion evolution, some Givens rotations).

**Cost comparison (single entangler, approximate):**
| Platform | Native gate | Time | Typical 2q fidelity |
|---|---|---|---|
| IBM SC (Heron) | CZ / ECR | ~60 ns | 99.7% |
| Google Willow | fSim / √iSWAP | ~25 ns | 99.7% |
| IonQ Forte | ZZ(θ) / MS | ~250 µs | 99.8% |
| Quantinuum H2 | RZZ(θ) | ~200 µs | 99.87% |
| Atom Computing | Rydberg-CZ | ~1 µs | 99.5% |

**Qiskit:**
```python
from qiskit import QuantumCircuit, transpile
from qiskit.circuit.library import iSwapGate, RZZGate

qc = QuantumCircuit(2)
qc.append(iSwapGate(), [0, 1])                       # Google-native
qc.append(RZZGate(0.7), [0, 1])                      # IonQ-native

# Let the transpiler target the backend's real basis:
native = transpile(qc, basis_gates=['rz', 'sx', 'cz'], optimization_level=3)
print(native.count_ops())
```

**Pitfalls:**
- **Over-decomposing**: users write CNOTs, transpiler blindly lowers to the native entangler but does not recognize that adjacent CNOTs could fuse into a single iSWAP. Use `optimization_level=3` and allow `basis_gates` to include the true native.
- **Calibration drift**: fSim(θ, φ) is only *nominally* (θ, φ); real angles vary per pair. Use characterization tools (XEB, cross-resonance amplitude) before trusting angles.
- **Directionality**: CX on IBM has a fixed control/target — swapping requires Hadamards; budget for this.
- **Non-Clifford parametric gates** (`RZZ(θ)`, fSim with generic angles) cost T-like magic in fault-tolerant settings. They're free on NISQ, expensive post-FTQC.
- **Transpiler basis lies**: if you pass `basis_gates=['cx', ...]` but the real backend is iSWAP-based, the pulse compiler will expand each CX into ~2 iSWAPs post-hoc — you see a "clean" CX circuit but run an inflated one. Always use `backend=backend` (full target), not a hand-rolled basis list.

**QAOA / Trotter advantage:**
Direct parametric access to the Ising interaction (RZZ, fSim, MS) means that a QAOA layer `exp(-iγ Σ Z_iZ_j)` is **one native gate per edge**, not three (CX-RZ-CX). On ion traps and modern SC ISAs, this is worth ~50% depth reduction — the single biggest near-term speed-up available to algorithm designers.

**Rule of thumb:** Know your backend's Weyl-chamber point; write your algorithm in terms of its native 2-qubit primitive and let the transpiler handle single-qubit frame changes — never round-trip through CNOT unless forced to.
