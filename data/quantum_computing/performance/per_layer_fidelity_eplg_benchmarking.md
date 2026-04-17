### Per-Layer Fidelity and Error-Per-Layered-Gate (EPLG)

**What it is:**
EPLG — Error Per Layered Gate — measures the **error contributed by one full layer of parallel two-qubit gates** executed across a chain or subset of the device. It is a *system-level* layer benchmark: unlike RB on a single edge, EPLG captures how qubits degrade when all their neighbors are also being driven at once. Low single-gate RB error + high EPLG is a classic crosstalk fingerprint.

**Definition — chain-length `n` on a path:**
1. Choose a path of `n` qubits (e.g., a chain on the coupling graph).
2. Measure the layer fidelity `F_L` of a full even/odd two-qubit-gate layer via a Clifford or cycle-benchmarking routine.
3. Relate to EPLG by:
```
F_L = (1 − EPLG)^(n − 1)
EPLG = 1 − F_L^(1 / (n − 1))
LF = F_L^(1/(n-1))     (per-gate "layer fidelity")
```
Smaller `n − 1` (number of two-qubit gates per layer along the chain) → EPLG more sensitive to individual gates; larger `n` → more averaging, smoother drift tracking.

**Why layered, not isolated:**
A two-qubit gate measured alone on edge `(i, j)` may show 99.5% fidelity, but when `(i−1, i)`, `(i, j)`, `(j, k)` all fire concurrently, crosstalk drops each to 98%. RB on one edge at a time cannot see this; EPLG is designed to.

**Example — schematic layer benchmarking:**
```python
# Measure layer fidelity on a chain using simultaneous Cliffords.
from qiskit_experiments.library import StandardRB
from qiskit_aer import AerSimulator

backend = AerSimulator()
chain = [(0, 1), (2, 3), (4, 5)]     # disjoint pairs exercised in one layer
fidelities = []
for pair in chain:                   # for EPLG, run all pairs simultaneously via circuit composition
    rb = StandardRB(physical_qubits=pair, lengths=[1, 5, 20, 50, 100],
                    num_samples=20, seed=0)
    res = rb.run(backend, shots=1024).block_for_results()
    fidelities.append(res.analysis_results("EPC").value.nominal_value)
F_layer = 1 - max(fidelities)        # worst edge dominates layer
EPLG = 1 - F_layer                   # per-layered-gate error
print(f"F_layer = {F_layer:.4f}, EPLG = {EPLG:.4%}")
```

**Interpretation of numbers:**
| EPLG | Regime |
|---|---|
| 10⁻² | Typical 2023 superconducting 2Q layer |
| 3 × 10⁻³ | Best reported superconducting chains (2024) |
| 10⁻³ | Leading ion-trap layer (all-to-all) |
| 10⁻⁴ | Required scale for deep pre-FTQC circuits |
| 10⁻⁶ | Physical threshold for efficient surface-code FTQC |

**Typical workflow — locate worst edges:**
1. Run per-edge RB + simultaneous-edge RB across the whole device.
2. Rank edges by EPLG contribution.
3. Schedule recalibration (drive amplitude, cross-resonance angle, DRAG parameter) on the worst 10–20%.
4. Re-run EPLG; verify downward trend and that no new edge has regressed.
5. Report chain EPLG for a canonical length (e.g., 100-qubit chain) as a headline number.

**Comparison with related metrics:**
| Metric | Scope | Sensitive to crosstalk? |
|---|---|---|
| 1Q/2Q RB | Single qubit / edge | No (isolated) |
| Interleaved RB | Single gate | No |
| Simultaneous RB | Parallel qubits | Yes, between chosen qubits |
| Cycle benchmarking | Full cycle on subgraph | Yes |
| **EPLG** | Full parallel layer on chain | Yes, end-to-end |
| QV | Whole square random circuit | Yes but opaque |

**Pitfalls:**
- EPLG averages over a chain; a single very-bad edge can be masked by many good ones. Pair with per-edge maps.
- Choice of chain matters — different routings expose different crosstalk patterns.
- Doesn't distinguish coherent vs. incoherent error; augment with GST or Hamiltonian tomography if you need the split.
- Like all RB-family metrics, insensitive to coherent errors that cancel under twirling.
- Drift: EPLG changes between calibrations; one number is a snapshot.

**Rule of thumb:** When RB-per-edge looks great but real circuits underperform, EPLG is the diagnostic — it measures the fidelity of the layer your algorithm actually runs, not an idealized isolated gate; track EPLG trends over time and drive recalibration toward its reduction.
