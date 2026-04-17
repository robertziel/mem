### Fractional / Parameterised Gates at the ISA Level

**What it is:**
A **fractional gate** is a parametrized entangler like `RZZ(θ)` or `XX(θ)` exposed **as a native instruction** on the backend's ISA — not synthesized from CNOT + RZ. Skipping synthesis avoids the 2× CNOT inflation of the textbook `exp(-iθ ZZ/2)` decomposition, cuts depth, and preserves fidelity. IBM began rolling fractional-gate ISAs across Heron-family processors in 2024–2025.

**The synthesis tax you avoid:**
```
Textbook: RZZ(θ) ≡  CX(0,1) · RZ(θ)(1) · CX(0,1)           # 2 entanglers
Native:   RZZ(θ)                                           # 1 entangler
```
Any algorithm dense in `exp(-iθ Pauli)` terms (QAOA, Trotter, VQE with UCCSD/hardware-efficient ansatz) pays this tax once per such term.

**Backends exposing fractional gates (2026):**
| Backend | Fractional entanglers |
|---|---|
| IBM Heron r2 / Condor | `rzz(θ)`, `rzx(θ)` (θ within calibrated range) |
| IonQ Forte | `zz(θ)`, `ms(θ)` — native by construction |
| Quantinuum H2 | `rzz(θ)`, `zz(θ)` |
| Google Willow | `fsim(θ, φ)` — effectively parametric |

**Qiskit — discover the ISA:**
```python
from qiskit_ibm_runtime import QiskitRuntimeService
from qiskit import QuantumCircuit, transpile

svc = QiskitRuntimeService()
backend = svc.backend('ibm_fez')                      # Heron r2
print(backend.target.operation_names)
# e.g., ['rz', 'sx', 'x', 'cz', 'rzz', 'measure', 'reset', 'if_else']

# The rzz instruction has a calibrated θ range:
inst = backend.target['rzz'][(0, 1)]
print(inst.duration, inst.error, inst.calibration)    # per-edge calibration

# Compile a QAOA layer directly to RZZ:
qc = QuantumCircuit(3)
qc.rzz(0.4, 0, 1); qc.rzz(0.4, 1, 2)
native = transpile(qc, backend=backend, optimization_level=3)
print(native.count_ops())                             # {'rzz': 2, ...} — no CX inflation
```

**Impact on common algorithms:**
| Algorithm | Entanglers per layer (synthesized) | With fractional gates | Savings |
|---|---|---|---|
| QAOA (p=1, ring, n=12) | 24 CX | 12 RZZ | ~50% depth |
| UCCSD Trotter step (H2) | ~40 CX | ~20 RZZ | ~50% |
| Hardware-efficient ansatz with RZZ blocks | 3L CX per layer | 1 RZZ per edge | ~66% |

**When to use:**
- **QAOA, VQE, Trotter simulation** — any repeated `exp(-iθ_k Pauli_k)` sum.
- **Hardware-efficient ansätze** redesigned around `RZZ(θ)` as the basic entangler.
- **Resource estimation for near-term algorithms** where gate *angle* (not count) drives fidelity.
- **Benchmarking**: comparing "same algorithm" across backends requires consistent handling of fractional vs CNOT ISAs.

**Pitfalls:**
- **θ is bounded by calibration**: typically `|θ| ≤ π` but fidelity degrades toward the extremes. Outside the calibrated range the compiler falls back to synthesis (possibly with a warning).
- **Granularity**: θ has a finite step size (often ~1 mrad). Optimizer gradients smaller than granularity get quantized — your parameter-shift derivatives may disagree with actual execution.
- **Not all edges calibrated**: fractional gates may only be available on a subset of coupling-map edges — check `backend.target['rzz']` for `None` entries, and route accordingly.
- **Pulse-level dependency**: fractional gates are implemented via pulse-length scaling; recalibration is more frequent than for fixed-angle CZ.
- **Transpiler must know**: default `basis_gates` may not list `rzz` — pass `backend=backend` (full target) rather than `basis_gates=[...]` strings to avoid silent synthesis.
- **Logical/FTQC incompatibility**: at the fault-tolerant layer, parametric gates must decompose to Clifford+T via Ross–Selinger — the ISA savings are NISQ-only.

**Rule of thumb:** Whenever your algorithm is dominated by `exp(-iθ P)` terms, request the backend's native fractional entangler — halving the entangler count beats any post-hoc peephole pass, and skipping synthesis preserves calibration-limited fidelity.
