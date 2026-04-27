### Google Cirq — Circuits, Moments, and the Simulator Stack

**What it is:**
Cirq is Google Quantum AI's Python SDK for gate-model circuits. Its defining data model is the **Moment** — a vertical slice of gates that act simultaneously on disjoint qubits. A `cirq.Circuit` is an ordered list of Moments, not a flat gate list. Qubits are first-class *objects* (`cirq.LineQubit`, `cirq.GridQubit`, `cirq.NamedQubit`) rather than indices, so a gate carries a reference to the hardware site it will run on.

**Core types:**

| Object | Role |
|---|---|
| `cirq.GridQubit(r, c)` | 2D grid site — matches Sycamore/Willow topology |
| `cirq.LineQubit(i)` | 1D integer-indexed qubit, handy for small demos |
| `cirq.Moment([gate_a, gate_b, ...])` | One time-step of parallel operations |
| `cirq.Circuit([moment, ...])` | Ordered sequence of Moments |
| `cirq.Simulator()` | Dense statevector simulator (~28 qubits practical) |
| `qsimcirq.QSimSimulator()` | Tensor-network/Schrödinger hybrid (50+ qubits depending on depth) |

**API shape:**
```python
import cirq

q = cirq.GridQubit.rect(1, 2)                 # [GridQubit(0,0), GridQubit(0,1)]
circuit = cirq.Circuit(
    cirq.H(q[0]),
    cirq.CNOT(q[0], q[1]),
    cirq.measure(*q, key='m'),
)
print(circuit)
result = cirq.Simulator().run(circuit, repetitions=1000)
print(result.histogram(key='m'))

import qsimcirq
qsim_result = qsimcirq.QSimSimulator().simulate(circuit)   # statevector
```

**Moment model vs. Qiskit's layered model:**

| Aspect | Cirq Moments | Qiskit `QuantumCircuit` |
|---|---|---|
| Unit of time | Explicit `Moment` slice | Flat gate list; layering inferred by scheduler |
| Qubit identity | Object with coordinates | Integer index into register |
| Parallelism | Obvious from the data structure | Derived from DAG analysis |
| Default insertion | `InsertStrategy.EARLIEST` packs into earlier Moments | Append-only |
| Hardware topology | Qubits carry their grid coords | Coupling map is a separate `Target` |

Moments make scheduling and pulse timing unambiguous: two gates in the same Moment are promised by construction to be simultaneous. Qiskit has to rediscover this via DAG scheduling passes.

**Simulator backends:**

| Backend | Method | Scale | Notes |
|---|---|---|---|
| `cirq.Simulator` | Dense statevector | ~28 qubits | Pure Python; good for teaching |
| `cirq.DensityMatrixSimulator` | Mixed state | ~14 qubits | Needed for channel noise |
| `cirq.CliffordSimulator` | Stabilizer | 1000s of qubits | Clifford-only |
| `qsimcirq.QSimSimulator` | Schrödinger / SV C++ | 30–40 qubits heavy, 50+ shallow | Google's production sim |
| `qsimcirq.QSimhSimulator` | Schrödinger–Feynman hybrid | Even larger, depth-limited | Distributed across nodes |

**When to use:**
- Reach for Cirq when you're targeting Google hardware (`cirq_google.Sycamore`, Willow) or want explicit Moment-level control of timing/parallelism.
- Reach for `qsim` whenever dense statevector is your bottleneck — it's roughly 10–100× faster than the pure-Python `cirq.Simulator`.
- Use Cirq's `cirq.Circuit` as the authoring model, then convert via `cirq.contrib.qasm_import` / `qiskit.qasm3` when you need cross-SDK portability.

**Pitfalls:**
- Passing a `LineQubit` circuit to a `GridQubit`-only device routing pass — it silently fails validation. Use `cirq.optimize_for_target_gateset` early.
- Moments are strict: inserting a gate that overlaps an existing Moment pushes it into a new Moment, which can change apparent depth.
- `cirq.Simulator().simulate()` returns a `TrialResult` with the *final* state; `.run()` returns measurement samples. Mixing them up silently returns the wrong shape.
- `qsim` honors noise only through `cirq.Channel`s, not `cirq.NoiseModel` alone — you must convert.

**Rule of thumb:** Author in Cirq when the Moment model clarifies parallelism (e.g., surface-code layouts, Sycamore benchmarks), and flip the backend to `qsim` the moment your simulation feels slow — the circuit code doesn't change.
