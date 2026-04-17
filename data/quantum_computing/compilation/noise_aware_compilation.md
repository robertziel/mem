### Noise-Aware Compilation

**What it is:** Real qubits are not interchangeable — on a given chip, CNOT fidelities vary by 2-10x across pairs, and coherence times (T1, T2) vary across qubits. **Noise-aware** compilation uses measured calibration data to pick layouts and routes that prefer high-fidelity qubits and edges for the circuit's hot spots. Expected win: 10-30% error reduction with no change to algorithm or gate count.

**What noise-aware passes do:**
- **Layout:** weight each candidate physical qubit by `T1`, `T2`, readout error. Solve an assignment problem minimizing total expected error for the ideal-logical-to-physical map.
- **Routing:** prefer SWAP paths through high-fidelity edges, not just short paths.
- **Post-layout refinement:** after routing, attempt to remap to an isomorphic subgraph with better edges (VF2PostLayout).
- **Transient-aware scheduling:** avoid scheduling gates on qubits immediately after a measurement (hot qubit).

**Key Qiskit passes:**

| Pass                         | Stage         | What it optimizes                                       |
|------------------------------|---------------|---------------------------------------------------------|
| `VF2Layout`                  | layout        | Subgraph isomorphism: find exact match, break ties by noise |
| `SabreLayout` (`trials=N`)   | layout        | Heuristic; scores with calibrated 2q error              |
| `NoiseAdaptiveLayout` (legacy) | layout      | BIP over error rates; superseded by VF2Layout + VF2PostLayout |
| `VF2PostLayout`              | post-routing  | Remaps onto a lower-noise isomorphic subgraph           |
| `ALAPScheduleAnalysis` + DD  | scheduling    | Coherence-aware gate placement                          |

**Qiskit — one-line invocation:**
```python
from qiskit import QuantumCircuit
from qiskit.transpiler import generate_preset_pass_manager
from qiskit_ibm_runtime.fake_provider import FakeKyiv

backend = FakeKyiv()         # carries realistic calibration data
qc = QuantumCircuit(5)
for i in range(4): qc.cx(i, i+1)
qc.measure_all()

# Level 3 already enables VF2Layout + VF2PostLayout + noise-aware Sabre
pm = generate_preset_pass_manager(optimization_level=3, backend=backend)
tqc = pm.run(qc)
print("initial layout:", tqc.layout.initial_layout)
print("2q error (est):", sum(backend.target.operation_from_name("cx").error for _ in tqc.get_instructions("cx")))
```

**Noise models consulted at level 2+:**
- `backend.target[instr].error` — per-gate calibrated error (gate infidelity from randomized benchmarking).
- `backend.target.qubit_properties[q].t1 / .t2` — coherence times.
- `readout_error` per qubit.

**Improvement magnitudes** (typical, on a 27-127q heavy-hex chip):

| Circuit type                  | Level 1 -> Level 3 error reduction |
|-------------------------------|------------------------------------|
| 5-10q GHZ / W state           | 15-30%                             |
| 10-30q QAOA on random graph   | 10-20% (dominated by SWAPs)        |
| Chemistry VQE (16q UCCSD)     | 20-40% (picky about qubit pairs)   |
| Clifford-heavy RB             | <5% (gate count dominates)         |

**When to use:** always, for any NISQ run on a real backend. The compile time overhead at level 3 (seconds to minutes) is trivial next to shot time.

**Pitfalls:**
- **Calibration drift.** Backends recalibrate daily (or more); a compile from yesterday's calibrations can be worse than today's. Re-run `generate_preset_pass_manager` with the current `backend` before submission.
- `VF2Layout` silently falls back to Sabre when no exact subgraph match exists; check `pm.property_set["VF2Layout_stop_reason"]`.
- Noise-aware passes can produce **less reproducible** results across calibration windows — keep the `initial_layout` in result metadata for debugging.
- Error "totals" are ballpark — gate errors are not independent on connected qubits; they do not strictly add.
- Dynamical decoupling and readout twirling layer on top — noise-aware layout is not a substitute for them.

**Rule of thumb:** Re-run noise-aware transpilation against fresh calibrations before each submission — a layout from last week costs you more than a few minutes of recompilation.
