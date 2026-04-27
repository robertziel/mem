### Mitiq — Vendor-Agnostic Quantum Error Mitigation

**What it is:**
Mitiq (Unitary Foundation) is a Python library that implements the mainstream **error-mitigation** techniques — zero-noise extrapolation, probabilistic error cancellation, Clifford data regression, dynamical decoupling, readout mitigation, virtual distillation — and applies them on top of **any** circuit from Qiskit, Cirq, Braket, PyQuil, or PennyLane. You hand Mitiq a circuit and an `executor` callback that returns an expectation value; Mitiq orchestrates the extra circuit runs and combines the results into a lower-bias estimate. It is purely a classical post-processing and circuit-generation layer — it never talks to hardware directly.

**Methods supported:**

| Technique | Idea | Extra runs |
|---|---|---|
| `zne` (ZNE) | Scale noise, extrapolate to zero | N scale factors × shots |
| `pec` (PEC) | Quasi-probability decomposition of ideal gates | Large — O(var/ε²) |
| `cdr` (CDR) | Train a regression model on Clifford-circuit fit | Many training circuits |
| `ddd` (DDD) | Insert dynamical decoupling sequences | 1× (same shots) |
| `rem` (REM) | Classical readout error inversion | Calibration runs |
| `vd` | Virtual distillation via multi-copy | Extra copies of circuit |
| `shadows` | Classical shadows tomography | Random measurement bases |

**The `Executor` contract:**
```python
def executor(circuit) -> float | FloatLike:
    """Run circuit on backend, return ⟨obs⟩."""
    ...
```
Mitiq accepts circuits in any of its supported SDKs; its `Converter` machinery (`mitiq.interface.convert_to_mitiq`) normalizes internally.

**API shape — ZNE on a Qiskit circuit:**
```python
from mitiq import zne
from qiskit import QuantumCircuit
from qiskit_aer.noise import NoiseModel, depolarizing_error
from qiskit_aer import AerSimulator

qc = QuantumCircuit(2, 2)
qc.h(0); qc.cx(0, 1)
qc.measure([0, 1], [0, 1])

noise = NoiseModel()
noise.add_all_qubit_quantum_error(depolarizing_error(0.01, 1), ['h'])
noise.add_all_qubit_quantum_error(depolarizing_error(0.05, 2), ['cx'])
sim = AerSimulator(noise_model=noise)

def executor(circ):
    counts = sim.run(circ, shots=8192).result().get_counts()
    p00 = counts.get('00', 0) / 8192
    p11 = counts.get('11', 0) / 8192
    return p00 + p11                   # ⟨ZZ⟩-like proxy

mitigated = zne.execute_with_zne(qc, executor)
unmitigated = executor(qc)
print(unmitigated, mitigated)
```

**ZNE knobs that matter:**

| Parameter | Effect |
|---|---|
| `scale_noise` | How noise is amplified (`fold_gates_at_random`, `fold_global`, pulse stretch) |
| `scale_factors` | e.g. `[1.0, 2.0, 3.0]` — number and spacing of data points |
| `factory` | Extrapolation model: `LinearFactory`, `RichardsonFactory`, `ExpFactory`, `PolyFactory` |

**Combining techniques:**
```python
from mitiq import zne, ddd

zne_value = zne.execute_with_zne(
    qc,
    lambda c: executor(ddd.insert_ddd_sequences(c, rule=ddd.rules.xx)),
)
# DDD inside the executor, ZNE wrapped around it.
```

**SDK coverage:**

| SDK | Circuit type in | Notes |
|---|---|---|
| Qiskit | `QuantumCircuit` | First-class, most tested |
| Cirq | `cirq.Circuit` | Native inside Mitiq |
| Braket | `braket.circuits.Circuit` | Supported |
| PyQuil | `Program` | Supported |
| PennyLane | `qml.tape.QuantumTape` / via adapter | Supported |

**When to use:**
- Any real-hardware run where a few extra circuit executions are cheaper than the bias you'd otherwise accept.
- Cross-SDK benchmarking of mitigation: identical Mitiq code runs on Qiskit Aer, Braket SV1, and a real IonQ device.
- Teaching/research — Mitiq's docs double as the canonical reference implementations for ZNE, PEC, CDR.

**Pitfalls:**
- `execute_with_zne` needs a *scalar expectation value* from your executor, not counts — returning a `Counts` dict silently breaks the extrapolator.
- PEC requires a **representation** of ideal gates as noisy-gate quasi-probability sums (`mitiq.pec.OperationRepresentation`) — without a calibrated noise model, PEC is unusable.
- Folding noise-scaling assumes gate noise dominates; on readout-limited devices, ZNE can *increase* error — combine with `rem` first.
- Mixing mitigation methods naively (e.g. ZNE + CDR on the same run) is not additive — Mitiq provides composed wrappers; don't hand-roll.

**Rule of thumb:** Treat Mitiq as the default first-layer mitigation for any hardware run — start with readout mitigation + ZNE (linear or Richardson), escalate to PEC/CDR only when you have a trustworthy noise characterization — and keep the circuit in its native SDK since Mitiq adapts to all of them.
