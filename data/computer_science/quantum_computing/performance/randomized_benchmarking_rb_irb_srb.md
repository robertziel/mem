### Randomized Benchmarking — RB, Interleaved RB, and Simultaneous RB

**What it is:**
Randomized benchmarking (RB) estimates the **average error per gate** over a set of randomly sampled Clifford sequences. Because Clifford circuits are self-inverting in closed form, any sequence can be inverted with a single appended Clifford, so the survival probability decays only due to noise — not miscompilation. RB is the de-facto scalable fidelity benchmark on NISQ hardware.

**Math — standard RB fit:**
Run length-`m` Clifford sequences (each followed by the inverse Clifford). Measure the survival probability of |0⟩ averaged over `K` random sequences. Fit:
```
F(m) = A · p^m + B
```
- `p` = depolarizing parameter per Clifford.
- Average gate infidelity: `r_C = (d − 1)(1 − p) / d`, with `d = 2^n`.
- For a single-qubit Clifford (~1.875 primitive gates on avg.), primitive error `r_prim ≈ r_C / 1.875`.
- For a two-qubit Clifford (~1.5 CNOTs on avg.), `r_CNOT ≈ r_C / 1.5`.

**Variants:**
| Variant | What it isolates | Cost |
|---|---|---|
| **Standard RB** | Average Clifford error | Baseline |
| **Interleaved RB (IRB)** | Error of **one specific gate** `G` (e.g., CNOT, CZ) | 2× runs (reference + interleaved) |
| **Simultaneous RB** | **Crosstalk** between qubits / edges run in parallel | Parallel per-qubit RB |
| **Direct RB** | Random layers of native gates, not Cliffords | Shorter, targets hardware layers |
| **Cycle benchmarking** | Error per cycle (multi-qubit layer) on a subgraph | Scales with system |

**IRB fit:**
```
F_ref(m)      = A · p_ref^m + B
F_interleaved = A · (p_ref · p_G)^m + B
r_G ≈ (d − 1)(1 − p_G) / d
```

**Example — single-qubit IRB in Qiskit:**
```python
from qiskit_experiments.library import InterleavedRB
from qiskit.circuit.library import XGate
from qiskit_aer import AerSimulator

lengths = [1, 10, 50, 100, 200, 400]
exp = InterleavedRB(
    interleaved_element=XGate(),
    physical_qubits=(0,),
    lengths=lengths,
    num_samples=10,
    seed=42,
)
result = exp.run(AerSimulator(), shots=2048).block_for_results()
print(result.analysis_results("EPC"))     # error per Clifford
print(result.analysis_results("EPG"))     # error per gate (X)
```

**When to use:**
- Calibration and acceptance testing of new qubits / couplers.
- Tracking drift over time (nightly RB runs).
- Comparing two gate implementations (CR vs. iSWAP, parametric vs. cross-resonance).
- Localizing crosstalk via simultaneous RB vs. isolated-qubit RB.

**Pitfalls:**
- RB is **insensitive to coherent errors** that cancel under twirling; a gate can pass RB yet fail in a structured circuit. Cross-check with **cycle benchmarking** or **gate-set tomography (GST)** for details.
- RB assumes Markovian, gate-independent noise. Leakage, non-Markovian drift, and heating over long sequences break the single-exponential model.
- Fit degeneracy when `p ≈ 1`: need a wide range of `m` so `p^m` spans the decay.
- State-preparation / measurement (SPAM) error is absorbed into `A` and `B` — good for isolating gate error, but RB cannot report SPAM.
- **Scaling:** full `n`-qubit Clifford RB is exponential in circuit compilation; practical beyond ~3 qubits only via simultaneous/direct RB.

**Rule of thumb:** Use standard RB to track average quality, IRB to quote a single-gate number, and simultaneous RB to expose crosstalk; if RB error disagrees with application fidelity by >2×, suspect coherent errors or non-Markovian noise and reach for cycle benchmarking.
