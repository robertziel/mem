### QED-C Application Benchmarks — Cross-Vendor Comparable Suite

**What it is:**
The **Quantum Economic Development Consortium (QED-C)** Application-Oriented Benchmarks are an **open, vendor-neutral** benchmark suite that runs the **same canonical algorithms** across different quantum backends and reports **application fidelity vs. width**. Goal: replace marketing-driven metrics with a reproducible, cross-vendor baseline.

**The suite (representative algorithms):**
| Category | Algorithms |
|---|---|
| Textbook | Bernstein–Vazirani, Deutsch–Jozsa, QFT, Grover |
| Phase / amplitude | Phase Estimation, Amplitude Estimation, Monte Carlo |
| Variational | VQE (H₂, LiH, H₂O), QAOA (MaxCut) |
| Linear algebra | HHL (small instances), Harrow linear-systems |
| Simulation | Hamiltonian dynamics (TFIM, Heisenberg) |
| Chemistry | Hartree-Fock / UCCSD small molecules |
| Error-correction | Shor 4-qubit code, repetition code |

**Output format:**
For each algorithm, a **quality vs. width** curve:
```
x-axis: number of qubits used (width)
y-axis: fidelity metric — typically the "polarized fidelity":
        F_pol = max(0, (F_classical - F_uniform) / (1 - F_uniform))
```
Measured across vendors on identical problems for direct comparison. Summary tile: fidelity × width integrated, giving the rough **Algorithmic Qubits**-style number.

**Polarized fidelity:**
```
F_classical = 1 − TVD(p_hw, p_ideal)                    # 1 - total variation distance
F_uniform   = 1 − TVD(p_uniform, p_ideal)               # uniform-noise floor
F_pol       = max(0, (F_classical − F_uniform) / (1 − F_uniform))
```
Rescaled so pure noise → 0, perfect → 1.

**Example — run one QED-C benchmark:**
```python
# The QED-C suite (github.com/SRI-International/QC-App-Oriented-Benchmarks)
# provides runnable scripts per algorithm. Skeleton:
from _common import metrics            # from QED-C suite
from bernstein_vazirani.qiskit import bv_benchmark

for n in range(3, 11):
    bv_benchmark.run(min_qubits=n, max_qubits=n, backend_id="ibmq_qasm_simulator",
                     num_shots=1000, method=2)

metrics.plot_metrics()                 # fidelity-vs-width plot across widths
metrics.extract_data_per_application()  # numerical table for comparison
```

**Why it matters (problem it solves):**
- **QV** is one random circuit type → vendor-specific circuit structure can look better or worse than real workloads.
- **Per-gate error** (RB, EPLG) is too low-level; users want "will my chemistry run succeed at 20 qubits?"
- **Vendor benchmarks** are internally optimized; QED-C runs the **same code** everywhere.
- Provides apples-to-apples tables for planners, research groups, procurement.

**Typical findings (orders-of-magnitude):**
| Device class | Polarized fidelity cliff |
|---|---|
| Early superconducting NISQ | Drops at 10–15 qubits |
| Matured superconducting | Drops at 20–25 qubits |
| Trapped-ion (all-to-all) | Drops at 20–30 qubits |
| Neutral-atom analog | Application-specific, cliff depends on connectivity pattern |

**Workflow for using QED-C:**
1. Clone the repo; install backend plugins (Qiskit, Cirq, Braket, Q#, pytket).
2. Select algorithms aligned with *your* workload (no need to run all 20+).
3. Run suite on candidate devices + classical simulator baseline.
4. Plot fidelity-vs-width; note the cliff for each algorithm.
5. Publish comparisons; iterate with compiler / error-mitigation knobs.

**Pitfalls:**
- **Not a single number:** the curves are informative; a collapsed "AQ-style" summary loses detail.
- **Compiler matters:** different passes on the same hardware yield different numbers — compare like-for-like pass pipelines.
- Problem sizes are small by design (classically verifiable); saying nothing about advantage-scale behavior.
- Fidelity metric is distribution-level; specific observables may be better or worse than the curve suggests.
- Suite evolves — v1 vs. v2 numbers may not compare; pin the version.
- Classical verification limits widths to ~30 qubits.

**Related benchmarks:**
| Suite | Focus |
|---|---|
| QED-C App-Oriented | Cross-vendor apps |
| SupermarQ | App benchmarks + scalability |
| BQSKit-bench | Compiler-driven |
| MITRE Quark | Mission-style workloads |
| MLPerf-style (emerging) | ML-oriented QML |

**Rule of thumb:** When procuring or comparing quantum backends, run the subset of QED-C that matches your workload and report the **per-algorithm fidelity-vs-width curves** alongside QV and EPLG — no single benchmark answers "is this device good for my problem?", but QED-C is the closest cross-vendor baseline available.
