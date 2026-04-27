### Simulator-to-Hardware Progression — Testing Ladder for Quantum Code

**What it is:** A staged validation pipeline that takes a quantum circuit from pure-math sanity checks all the way to a real QPU. Each stage catches a different class of bug, and you only pay for the next stage's complexity (and cost) once the current one is clean. Skipping stages is the single biggest source of wasted shots on NISQ hardware.

**The ladder:**

| Stage | Backend | Catches | Typical cost |
|---|---|---|---|
| 1. Statevector | `AerSimulator(method='statevector')` | Logic bugs, wrong gates, bad indexing | Free, ≤ ~28 qubits |
| 2. MPS / DM | `AerSimulator(method='matrix_product_state' \| 'density_matrix')` | Scaling bugs; mild-entanglement or mixed-state effects | Free, depends on bond dim |
| 3. Noisy sim + calibration | `AerSimulator.from_backend(fake_backend)` | Depolarizing / readout / crosstalk effects under realistic model | Free, minutes |
| 4. Small hardware | real backend, few shots, low depth | Calibration drift, coupling map surprises, transpiler blowups | $, queue time |
| 5. Full hardware | real backend, production shots | Run-to-run variance, session-level throughput | $$$, minutes to hours |

**Decision tree — "is this stage enough?":**
- Pass stage 1 iff *every* expected measurement distribution matches the exact statevector to numerical tolerance.
- Pass stage 2 iff circuit still compiles and results match stage 1 within 1e-10 on an overlapping qubit subset.
- Pass stage 3 iff the fake-backend output differs from stage 1 only by noise you can explain (and your error mitigation recovers the ideal answer within estimated error bars).
- Pass stage 4 iff real-hardware counts agree with stage-3 noisy sim within ~2σ (shot noise + calibration drift).
- Stage 5 is the actual experiment; never run it before stage 4 is green.

**Example (same circuit, four backends):**
```python
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
from qiskit_ibm_runtime import QiskitRuntimeService
from qiskit_ibm_runtime.fake_provider import FakeSherbrooke

qc = QuantumCircuit(2, 2)
qc.h(0); qc.cx(0, 1); qc.measure([0, 1], [0, 1])

# Stage 1: ideal statevector
sv = AerSimulator(method="statevector")
# Stage 3: noisy sim built from a real backend snapshot
noisy = AerSimulator.from_backend(FakeSherbrooke())
# Stage 5: real hardware
service = QiskitRuntimeService()
real = service.least_busy(operational=True, simulator=False)

for backend in (sv, noisy, real):
    tqc = transpile(qc, backend=backend, optimization_level=1, seed_transpiler=42)
    job = backend.run(tqc, shots=4096)
    print(backend.name, job.result().get_counts())
```

**Which simulator method for which circuit:**

| Method | Scales to | Good for | Bad for |
|---|---|---|---|
| `statevector` | ~28 qubits | General unitary circuits | Anything noisy |
| `matrix_product_state` | 100+ qubits *if low entanglement* | 1D / shallow circuits, TEBD-like | Volume-law entangled states |
| `density_matrix` | ~14 qubits | Full mixed-state evolution with noise | Large circuits |
| `stabilizer` | 1000s of qubits | Clifford-only (QEC circuits, benchmarking) | Any non-Clifford gate |
| `extended_stabilizer` | ~50 qubits + few T gates | Near-Clifford circuits | Dense non-Clifford |

**Pitfalls:**
- **Skipping stage 3.** Noise-free circuits that "work on sim" often land on hardware with 30–50% state fidelity and look random. The noisy sim is the first place you'll see that.
- **Stale fake backends.** `FakeSherbrooke` is a pinned snapshot — calibration drifts daily. Re-pull `backend.properties()` weekly for the real chip you target.
- **Transpile-once-run-many.** Coupling maps change when IBM retires or swaps qubits; re-transpile per backend or your layout crashes.
- **Shot budget inflation.** At stage 5, doubling shots halves σ; doubling *qubits* in a test circuit roughly quadruples cost. Keep stage-4 circuits tiny.
- **MPS silent failure.** The MPS simulator happily caps bond dimension and silently loses fidelity. Check `max_bond_dim` in options against your entanglement budget.

**Rule of thumb:** Every bug you can catch before stage 4 costs zero dollars and seconds instead of queue hours — climb the ladder, don't jump it.
