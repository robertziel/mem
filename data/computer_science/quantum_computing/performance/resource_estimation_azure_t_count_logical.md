### Resource Estimation — Logical Qubits, T-Count, and Physical Footprint

**What it is:**
Resource estimation (RE) is the planning workflow that, given an algorithm and an error-correction scheme, outputs the **logical-qubit count**, **T-count**, **physical-qubit count**, and **runtime** required to run the algorithm fault-tolerantly. Microsoft's Azure Quantum Resource Estimator is a well-known open tool, but the methodology is generic: logical error budget → code distance → physical overhead → wall time.

**Inputs:**
| Input | Example |
|---|---|
| Algorithm (e.g., Shor, QPE, chemistry) | 2048-bit RSA via Shor |
| Logical error budget `ε` | `10⁻³` total failure probability |
| Physical error rate `p` | `10⁻³` per 2Q gate |
| Cycle time `t_cyc` | 100 ns (SC) / 10 µs (ion) |
| QEC code | Surface code |
| Magic-state factory layout | 2T ccz factories |

**Core formulas — surface code:**
```
Logical error per cycle:      p_L ≈ A · (p / p_th)^( (d + 1) / 2 )
Physical qubits per logical:  Q_phys = 2 · d²                (rotated surface code)
Total logical operations:     N_L ≈ T-count + M + #rotations
Total error budget:           ε ≈ N_L · p_L · (extraction cycles) 
→ solve for d (code distance)
Runtime:                      T ≈ N_L · t_cyc · (cycles per logical op)
```
Typical `p_th ≈ 0.01` for surface code; `A ≈ 0.1`.

**T-count dominates:**
Clifford gates are cheap (transversal); the bottleneck is **T** (or equivalent non-Clifford) gates, each needing a **distilled magic state**. Magic-state distillation factories cost ~hundreds of thousands of physical qubits each and set the throughput bound.

**Example — Azure RE (Python client):**
```python
from qsharp.estimator import EstimatorParams, QubitParams, QECScheme
import qsharp

qsharp.init(project_root=".")
params = EstimatorParams()
params.qubit_params.name = QubitParams.QUBIT_GATE_NS_E3   # p = 10^-3 SC-style
params.qec_scheme.name   = QECScheme.SURFACE_CODE
params.error_budget      = 1e-3
# Assume a Q# callable "Shor.FactorRSA" has been imported.
result = qsharp.estimate("Shor.FactorRSA(2048)", params=params)
print({
    "logical_qubits":  result["logicalCounts"]["numQubits"],
    "t_count":         result["logicalCounts"]["tCount"],
    "physical_qubits": result["physicalCounts"]["physicalQubits"],
    "runtime_s":       result["physicalCounts"]["runtime"] / 1e9,
})
```

**Typical Shor-2048 ballpark (surface code, `p = 10⁻³`, ns gates):**
| Quantity | Order of magnitude |
|---|---|
| Logical qubits | ~10⁴ |
| T-count | ~10¹⁰–10¹¹ |
| Physical qubits | ~10⁶–10⁷ |
| Runtime | hours to days |

For chemistry (FeMoco ground state, qubitization-based QPE): similar logical footprint, fewer T-gates, shorter runtime. For QAOA at utility scale: logical footprint smaller, sensitive to depth.

**Workflow:**
1. **Specify algorithm** in Q# / Qiskit / OpenQASM with explicit oracle.
2. **Count logical resources:** logical qubits, T, rotations (which amortize to T via synthesis).
3. **Synthesize rotations to T-count** at accuracy `ε_rot`: `T ≈ 1.15 · log₂(1/ε_rot) + c`.
4. **Solve for code distance `d`** from total error budget.
5. **Compose factories + logical tiles** into a physical footprint.
6. **Iterate:** reduce T-count (better compilations), shrink logicals, pick favorable code.

**Knobs that change the answer 10–1000×:**
| Knob | Effect |
|---|---|
| Physical error rate `p` | `d ~ log(1/p_L) / log(p_th/p)` — `p` drop 10× shrinks `d` by ~2× |
| Gate time `t_cyc` | Linear in runtime |
| Code choice (surface → qLDPC) | Overhead `2d²` → `O(d)` with good qLDPC — 10–100× reduction |
| T synthesis accuracy | `ε_rot = 10⁻¹⁰` vs. `10⁻⁵` roughly doubles T-count |
| Distillation layout (single vs. ccz) | 2–4× qubit count savings |
| Parallelism of factories | Trade qubits ↔ time |

**Pitfalls:**
- RE outputs are **bound estimates**, not guarantees; constants of 2–5× routinely hide in "assumed" layouts.
- Assumed QEC cycle time ≠ physical gate time; readout and decoding matter.
- **Decoder classical runtime** is often ignored; real-time surface-code decoding is its own engineering problem.
- Error model choice (Pauli noise vs. full CPTP) affects `p_L` by factors of 2–10.
- Asymptotic magic-state factory costs can dominate; small-factor savings in distillation propagate strongly.

**Rule of thumb:** Before committing to a quantum algorithm, run RE with at least two qubit models and two code choices — if the physical-qubit count exceeds ~10⁶ or runtime exceeds a week, the algorithm needs lower-level reformulation (less T, tighter synthesis, better QEC) before it is a viable roadmap target.
