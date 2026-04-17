### Gate Error, Measurement Error, and Readout Noise

**What it is:** The three dominant error channels you budget against in any NISQ or early-FTQC experiment. They are reported as infidelities (1 − F) measured by randomized benchmarking (RB) for gates and by calibration matrices for readout.

**Current hardware error budget (2024–2026):**

| Error type | Superconducting (top) | Trapped ion | Neutral atom |
|---|---|---|---|
| Single-qubit gate | 1e-4 to 5e-4 | 1e-5 to 1e-4 | 1e-3 to 3e-3 |
| Two-qubit gate | 2e-3 to 7e-3 | 1e-3 to 3e-3 | 3e-3 to 1e-2 |
| Readout (per qubit) | 5e-3 to 2e-2 | 1e-3 to 5e-3 | 1e-2 to 3e-2 |
| SPAM (state-prep) | 1e-3 | 1e-4 | 1e-2 |

Landmark numbers: Google Willow (2024) two-qubit median ~3e-3, readout ~8e-3. Quantinuum H2 (2024) two-qubit ~1.5e-3, mid-circuit measurement ~3e-3.

**Average vs worst-case fidelity:**
- Average gate fidelity F̄ = ∫ ⟨ψ|U†·E(UψU†)·U|ψ⟩ dψ (RB measures this).
- Process fidelity F_pro = (d·F̄ − 1)/(d+1) (d = dim).
- Diamond norm distance ‖E − U‖_◇ bounds worst-case error; between F and √F in scaling. Threshold theorems require diamond-norm bounds; RB numbers are optimistic.

**Two-qubit gate characterization:**
- Interleaved RB: isolate one gate's error from the Clifford reference.
- Cycle benchmarking / XEB: Google's workhorse for two-qubit cycles.
- Gate-set tomography (GST): full process matrix; reveals coherent vs stochastic.

**Readout / measurement error model:**

2×2 confusion matrix per qubit:

A = [[P(0|0), P(0|1)], [P(1|0), P(1|1)]]

Asymmetric: P(0|1) > P(1|0) for transmons (T1 decay during ~300 ns readout). Joint readout of N qubits has 2^N × 2^N matrix; assumed tensor-product for tractability (IBM M3, Qiskit `CorrelatedReadoutMitigator`).

**Qiskit readout mitigation:**
```python
from qiskit_ibm_runtime import SamplerV2
from mthree import M3Mitigation
m3 = M3Mitigation(backend)
m3.cals_from_system(range(num_qubits))
quasi = m3.apply_correction(counts, qubits)
```
M3 scales linearly by restricting to observed bitstrings.

**Sources of readout error:**
- Short readout pulse ⇒ low SNR in I/Q plane.
- T1 decay during integration window (transmon).
- Resonator ring-down, thermal photons.
- Crosstalk between neighboring resonators.

**Measurement-induced errors (not just wrong answer):**
- Backaction on neighboring qubits (stray photons).
- Qubit leakage to |2⟩ during strong drive.
- Mid-circuit measurement must be QND (quantum-non-demolition) — still imperfect.

**Where the budget lands for QEC:**
- Surface-code threshold ~1% per operation ⇒ need p_2q < 0.5% comfortably.
- Quantinuum and Google have crossed this; most NISQ devices have not.
- Readout is often the worst offender; bold goal is ≤ 1e-3.

**Rule of thumb:** Two-qubit fidelity is usually 5–10× worse than single-qubit; readout is 5–50× worse than single-qubit. Budget QEC circuits assuming readout dominates unless your vendor proves otherwise with mid-circuit benchmarks.
