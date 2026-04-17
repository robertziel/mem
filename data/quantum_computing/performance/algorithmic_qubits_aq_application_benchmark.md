### Algorithmic Qubits (AQ) — Application-Level Benchmark

**What it is:**
Algorithmic Qubits (AQ) is an application-level metric introduced by IonQ in 2020 (building on QED-C work) that reports the **largest number of qubits on which a device can run a suite of real algorithms above a fidelity threshold**. Unlike Quantum Volume (random square circuits) or RB (average gate error), AQ asks: "how many useful qubits does this machine provide on actual workloads?"

**Definition:**
```
AQ = max n such that min_A F_A(n) ≥ τ,    τ typically = 0.37 (≈ 1/e)
```
- `n` = number of qubits used by the algorithm.
- `A` ranges over a fixed application benchmark suite (Grover, QFT, phase estimation, VQE, amplitude estimation, Bernstein–Vazirani, Hamiltonian simulation, monte carlo, …).
- `F_A(n)` = application fidelity at width `n`.
- `τ = 1/e ≈ 0.37` is the common threshold (a common QED-C convention); some variants use higher cutoffs.

**How "application fidelity" is computed:**
For each algorithm, run on hardware and classically, compare distributions:
```
F_A = 1 - (1/2) · Σ_x |p_hw(x) - p_ideal(x)|     # 1 - total variation distance
```
or the "polarized" fidelity from QED-C: normalized such that uniform noise gives `F = 0`.

**AQ vs. other benchmarks:**
| Metric | What it measures | Weakness |
|---|---|---|
| **QV** | Random square-circuit fidelity | No app signal; classically uncheckable > ~50 qubits |
| **CLOPS** | Throughput | Ignores fidelity |
| **EPLG** | Per-layer error | Not app-level |
| **AQ** | Min fidelity across an app suite | Specific to the chosen suite; suite can be gamed |

**Example — computing one-algorithm fidelity (Bernstein–Vazirani):**
```python
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

s = "1011"
n = len(s)
qc = QuantumCircuit(n + 1, n)
qc.x(n); qc.h(range(n + 1))
for i, b in enumerate(reversed(s)):
    if b == "1": qc.cx(i, n)
qc.h(range(n)); qc.measure(range(n), range(n))

counts = AerSimulator().run(transpile(qc), shots=8192).result().get_counts()
p_hw = {k: v / 8192 for k, v in counts.items()}
F = 1 - 0.5 * (1 - p_hw.get(s, 0.0)) - 0.5 * sum(v for k, v in p_hw.items() if k != s)
print(f"BV fidelity ≈ {F:.3f}")   # run across suite; AQ = largest n with min F ≥ τ
```

**Why AQ (rather than QV) on trapped-ion systems:**
- Ion traps have all-to-all connectivity: arbitrary-length two-qubit gates are native, so SWAP overhead does not destroy app-level circuits. AQ captures this advantage; QV does not fully.
- Lower native clock rate is masked at app level — CLOPS captures speed.
- A device with `AQ = 29` (IonQ Forte, announced) can run 29-qubit application circuits above threshold, even if raw `QV` is unstated.

**Progression (approx.):**
| Year | Device class | Reported AQ |
|---|---|---|
| 2021 | Early trapped-ion | ~11 |
| 2022 | Second-gen trapped-ion | ~20 |
| 2023 | Forte / Forte Enterprise | 29–35 |
| 2024+ | Multi-node / higher-fidelity ions | 35+ |

**Pitfalls:**
- **Suite-dependence:** AQ depends on which algorithms are included and at what problem sizes. Different suites → different numbers.
- Classical verification required: like QV, AQ caps at where you can still simulate the ideal output.
- Single-number collapse hides *which* algorithm is the bottleneck; always publish per-algorithm curves.
- Pass/fail thresholds vary (`1/e`, `0.5`, etc.) — always check the threshold in the quoted AQ.
- Device-to-device comparison is fair only when suite, threshold, and problem sizes match.

**Rule of thumb:** AQ answers "how many useful qubits for real algorithms?" — a more workload-relevant question than QV, but only if the benchmark suite matches your problem; always look at per-algorithm fidelity curves, not just the headline AQ number.
