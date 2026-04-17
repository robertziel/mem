### Quantum Volume — The Heavy-Output Problem

**What it is:**
Quantum Volume (QV) is a single-number, holistic benchmark introduced by IBM (Cross et al. 2019) that captures the **largest square random circuit** a device can run with above-threshold fidelity. It folds qubit count, connectivity, gate error, compiler quality, and measurement error into one figure of merit — `QV = 2^n` where `n` is the largest achievable width-depth square.

**Protocol — the heavy-output test:**
1. Sample a random `n × n` "model circuit": `n` layers, each a random permutation of qubits + random `SU(4)` pair gates.
2. Classically compute the ideal output distribution `p(x)`; identify **heavy outputs** = bitstrings with `p(x) > median(p)`.
3. Run the circuit on hardware, sample, compute the fraction of heavy outputs in the measured bitstrings: `h_n`.
4. Repeat over many random circuits; confidence-bound `h_n`.
5. QV test **passes** at width `n` if `h_n > 2/3` with ≥ 97.5% confidence (one-sided lower bound).

**Math:**
```
h_n = (1/K) Σ_k (fraction of shots in the heavy set for circuit k)
Ideal (noiseless Haar-random):  E[h] ≈ (1 + ln 2)/2 ≈ 0.847
Fully-depolarized random:       E[h] = 0.5
Pass threshold:                 h > 2/3
QV = 2^{largest n with passing h_n}
```

**Example — running QV in Qiskit:**
```python
from qiskit_experiments.library import QuantumVolume
from qiskit_aer import AerSimulator
import numpy as np

backend = AerSimulator()
qv_exp = QuantumVolume(physical_qubits=list(range(4)),
                       trials=100, seed=42)
qv_data = qv_exp.run(backend, shots=1024).block_for_results()
hop = qv_data.analysis_results("mean_HOP").value
print(f"Mean heavy-output prob = {hop:.3f}   pass={hop > 2/3}")
# Largest n where hop > 2/3 → QV = 2^n
```

**Why "square" circuits matter:**
A circuit that is deep but narrow, or wide but shallow, does not exercise the full error budget. Forcing `depth = width` means adding a qubit *also* adds a layer — QV doubles (adds one to `log2 QV`) only when both axes improve together.

**Reported progression (approx.):**
| Year | Announced QV | log₂ QV |
|---|---|---|
| 2019 | 16 | 4 |
| 2020 | 64 | 6 |
| 2021 | 128 | 7 |
| 2022 | 512 | 9 |
| 2023 | 2¹⁰–2¹¹ | 10–11 |
| 2024+ | plateauing on multi-chip devices | — |

**Saturation at ~100 qubits:**
QV requires **classical verification** of the heavy set. Computing `p(x)` for an `n × n` random circuit takes memory/time exponential in `n`. In practice, QV certification saturates around `n ≈ 30–50` today and is projected to max out well under 100 qubits — exactly where one most wants a benchmark.

**Limitations:**
- No application signal — a device can have high QV and still be poor for chemistry or QAOA on its native connectivity.
- Compiler-dependent: heavy SWAP overhead on limited connectivity crushes QV; QV tracks both hardware and compiler.
- All-to-all randomized assumption favors high-connectivity architectures.
- Binary pass/fail hides distance to threshold — `h = 0.67` and `h = 0.85` both "pass".
- Replaced in practice by **CLOPS**, **Algorithmic Qubits**, **EPLG**, and application benchmarks for multi-faceted reporting.

**Rule of thumb:** Treat QV as a useful coarse sanity metric through ~30 qubits; past that it becomes classically uncheckable and must be paired with application- or layer-level benchmarks (AQ, EPLG, mirror volumetric) to tell you anything about real workloads.
