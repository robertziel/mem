### Resource-Aware Decomposition — Estimate First, Optimize Second

**Pattern:** Before writing any algorithm, compute an upper bound on the resources it will consume on your target machine: **qubit count, circuit depth, two-qubit / T-gate count, shot budget, wallclock**. If the estimate exceeds today's or next-year's machine, redesign the *algorithm* (lower-order Trotter, shallower ansatz, fewer qubits via active-space reduction) before tuning compilation. "Can we even run this?" is the first architectural question.

**When to use:**
- Scoping a new quantum workload ("is this NISQ-feasible or FTQC-only?").
- Writing a grant / customer proposal — need defensible logical qubit, T-count, and runtime numbers.
- Choosing between algorithm variants (QPE vs VQE vs QSP vs QSVT).
- Deciding which module of a pipeline to delegate to the QPU vs. classical.

**The four resource axes:**
| Axis | NISQ budget (2026) | Early-FTQC | FTQC |
|---|---|---|---|
| Logical qubits | 0 | 10 – 100 | 1000+ |
| Physical qubits | ~1000 | ~10^4–10^5 | 10^6+ |
| Circuit depth / 2-q gates | `< 10^2–10^3` | `10^5–10^8` | unbounded |
| T-gate count | N/A (physical) | `10^6–10^9` | unbounded |
| Shot budget | `10^4–10^6` / expt | — | — |

**Estimation flow:**
```
          ┌──── algorithm spec ──────┐
          ▼                          ▼
   logical resources           classical cost
   (qubits, T-count,           (pre/post-proc)
    Toffolis, depth)                │
          │                          │
          ▼                          ▼
   compile to code       ─▶ wallclock @ code-cycle-time
   (surface / LDPC)             + classical overhead
          │
          ▼
   physical resources
   (qubits, magic-state
    factories)
```

**Tools:**
- Azure Quantum **Resource Estimator** — takes Q# / Qiskit, returns logical + physical resources under configurable qubit models.
- Qiskit `qiskit.synthesis.TCount`, `CircuitInstructionDurations`.
- PennyLane `qml.specs`, `qml.resource` — symbolic T-count for algorithms.
- Hand-rolled: count Pauli rotations × Trotter steps × per-rotation T-count (`~50-100` T per arbitrary `R_Z` via Solovay-Kitaev / Ross-Selinger).

**Example — Azure Resource Estimator sketch:**
```python
from qsharp.estimator import EstimatorParams, QubitParams, QECScheme
from qsharp import estimate
params = EstimatorParams()
params.qubit_params.name         = QubitParams.MAJ_NS_E6         # superconducting majorana
params.qec_scheme.name           = QECScheme.FLOQUET_CODE
params.error_budget              = 1e-3
est = estimate(qsharp_program, params=params)
print(est["physicalCounts"]["physicalQubits"],
      est["physicalCounts"]["runtime"])           # ns → years: first reality check
```

**Trade-offs:**
- Over-tight estimates kill promising algorithms prematurely; under-tight estimates burn quarters of engineering. Use a 5–10× safety factor on T-count and shots.
- Compile-first-then-estimate flips the order: compilation decisions (layout, synthesis tolerance) move T-counts by `2–10×`, so iterate.

**Pitfalls:**
- **Ignoring magic-state distillation:** non-Clifford gates dominate FTQC cost; a naïve T-count of `10^9` implies `~10^3` magic-state factories running in parallel.
- **Counting gates not depth:** a `10^8`-gate circuit at 1 μs per cycle is `100 s`; at 1 ms per cycle (code-cycle time) it's a day.
- **Forgetting the classical side:** QPE post-processing, shadow tomography, and Hamiltonian grouping can dominate wallclock.
- **Treating shots as free:** `10^6` shots × 1 s reset × 100 Hamiltonian groups = 28 hours — plan Session/Batch mode accordingly.
- **Depth ≠ parallelism:** 2-q gate *count* matters for fidelity; *depth* matters for coherence. Estimate both.

**Rule of thumb:** Spend one afternoon resource-estimating before one week implementing — if the algorithm needs `10^10` T gates on a `10^6` logical-qubit machine, it's an FTQC problem, and dressing it up in VQE clothes won't save it; change the algorithm, not the compiler flags.
