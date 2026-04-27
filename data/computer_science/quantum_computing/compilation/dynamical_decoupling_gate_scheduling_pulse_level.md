### Dynamical Decoupling and Gate Scheduling

**What it is:** Idle qubits (waiting for other qubits to finish gates) accumulate phase errors from slow environmental noise. **Dynamical decoupling (DD)** inserts carefully timed pulse sequences during idle windows that average out low-frequency noise — coherent noise suppression at no extra logical cost.

**Physical intuition:** A slow noise bath rotates the qubit by θ during time τ. If you apply X in the middle, the second-half rotation is reversed → net error ≈ 0 to first order. Higher-order sequences cancel longer correlation times.

**Common DD sequences:**

| Sequence | Pattern                           | Suppresses                       | Order |
|----------|-----------------------------------|----------------------------------|-------|
| Hahn echo | τ/2 — X — τ/2                    | dephasing (Z noise)             | 1st   |
| CPMG     | (τ/2 — X — τ)ⁿ — X — τ/2         | dephasing over long idle         | 1st   |
| XY4      | τ/4 — X — τ/4 — Y — τ/4 — X — τ/4 — Y | X, Y, Z noise (universal)  | 1st   |
| XY8      | XY4 + YX4                         | + pulse errors                   | 2nd   |
| KDD      | knill-dynamic-decoupling (5-pulse)| pulse imperfection to higher order | 2nd   |
| UDD      | non-uniform spacings              | Gaussian noise, optimal          | Nth   |

**Constraint:** Pulses must commute with the gate sequence structure — inserted only during idle time, preserving the logical unitary. In Qiskit, DD passes analyze the scheduled circuit DAG and insert X/Y/etc. into slack windows.

**Scheduling foundation:** DD requires **timed circuits** — each instruction has a duration (in dt units from backend target). Two scheduling policies:
- **ALAP (as late as possible):** delay operations as late as possible; idle on the left.
- **ASAP (as soon as possible):** pull operations earliest; idle on the right.

The choice affects where delays sit and thus where DD slots can be inserted.

**Qiskit:**
```python
from qiskit import QuantumCircuit, transpile
from qiskit.transpiler import PassManager
from qiskit.transpiler.passes import (
    ALAPScheduleAnalysis, PadDynamicalDecoupling
)
from qiskit.circuit.library import XGate
from qiskit_ibm_runtime.fake_provider import FakeKyiv

backend = FakeKyiv()
qc = QuantumCircuit(3)
qc.h(0); qc.cx(0, 1); qc.cx(1, 2); qc.measure_all()

# Transpile with durations
t = transpile(qc, backend=backend, optimization_level=1, scheduling_method="alap")

# Insert XY4 dynamical decoupling during idles
dd_sequence = [XGate(), XGate()]    # CPMG-style (two Xs)
pm = PassManager([
    ALAPScheduleAnalysis(target=backend.target),
    PadDynamicalDecoupling(target=backend.target, dd_sequence=dd_sequence),
])
dd_circuit = pm.run(t)
print(dd_circuit.count_ops())  # more x gates in idle windows
```

**Benefits and caveats:**
- Typically 2–10× T₂ extension for idle qubits, translating into higher fidelity for deep circuits with uneven 2Q gate timing.
- Pulse calibration errors limit gain; KDD/XY8 tolerate them better than CPMG.
- Not free of error: each inserted pulse has its own ~1e-4 gate error.
- For very short idles (< single gate duration) DD can worsen fidelity — filter with a minimum-idle threshold.

**When to use:**
- Long circuits with unbalanced parallelism (some qubits wait many gate cycles).
- Dynamic circuits with measurement-based branching (qubits idle during classical control).
- Witnessing experiments (Bell tests) requiring long memory times.

**Rule of thumb:** If your circuit has noticeable idle time on some qubits while others work, XY4 dynamical decoupling is a near-free fidelity win — Qiskit's `PadDynamicalDecoupling` pass applies it in one line.
