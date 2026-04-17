### Qubit Layout: Logical-to-Physical Mapping

**What it is:** The **layout** step maps the circuit's logical qubits (indices in the input `QuantumCircuit`) to physical qubits on the device. A good layout minimizes SWAPs (by matching the interaction graph to device topology) and routes through high-fidelity qubits (noise-aware).

**Why it matters:**
- Hardware has **limited connectivity** (heavy-hex, grid, linear chain, all-to-all for ion traps).
- Picking neighbors for qubits that interact in the circuit avoids routing overhead.
- Choosing qubits with lowest single-qubit error / best 2Q calibration dramatically lifts fidelity.

**Connectivity graph examples:**

| Device          | Topology                 | Typical coupling degree |
|-----------------|--------------------------|-------------------------|
| IBM Heron/Eagle | heavy-hex                | 2–3                     |
| Google Sycamore | 2D grid                  | 4                       |
| IonQ (trapped ion) | all-to-all            | n−1                     |
| Quantinuum      | all-to-all (via QCCD)    | n−1                     |
| Rigetti Aspen   | octagonal lattice        | 3                       |

**Qiskit layout algorithms:**

| Pass              | Strategy                                                             |
|-------------------|----------------------------------------------------------------------|
| `TrivialLayout`   | Logical i → physical i                                               |
| `DenseLayout`     | Pick most-connected subgraph                                         |
| `VF2Layout`       | Exact subgraph isomorphism (fast for small circuits)                 |
| `VF2PostLayout`   | Re-layout **after** routing, using calibration data                  |
| `SabreLayout`     | Heuristic forward-backward SWAP-minimizing layout (stochastic)       |
| `NoiseAdaptiveLayout` (deprecated → use VF2PostLayout) | Chose qubits minimizing weighted error       |

**SABRE algorithm (high level):**
1. Randomly initialize layout.
2. Run forward SWAP-based routing, count SWAPs.
3. Reverse the circuit, run routing again using final layout — yields improved initial layout.
4. Repeat forward/backward for `max_iterations`; keep best.
Stochastic; typically run N trials and keep the circuit with fewest inserted SWAPs.

**Noise-aware layout:** Uses the device's calibration data — per-qubit T₁/T₂, readout fidelity, 2-qubit gate fidelities (from `backend.target`) — and selects physical qubits and edges that **minimize the expected error of the whole circuit**. Dramatically helps on devices with non-uniform qubit quality.

**Qiskit:**
```python
from qiskit import QuantumCircuit, transpile
from qiskit_ibm_runtime.fake_provider import FakeKyiv

backend = FakeKyiv()
qc = QuantumCircuit(5)
for i in range(4): qc.cx(i, i+1)

# Inspect connectivity
print(backend.coupling_map)

# Noise-aware layout at opt level 3 is default
t = transpile(qc, backend=backend, optimization_level=3)
print("initial layout:", t.layout.initial_layout)
print("final layout:",   t.layout.final_layout)

# Manually pin the layout
t_pin = transpile(qc, backend=backend, initial_layout=[2, 3, 4, 5, 6])
```

**Tips:**
- Provide a known-good layout manually when running many shots of the same circuit.
- Inspect `backend.properties()` for T₁, T₂, gate errors before committing.
- Level 3 transpile on recent Qiskit uses VF2 first, then Sabre as fallback.

**Rule of thumb:** On heavy-hex / grid hardware, layout often matters more than any other optimization — a "smart" layout can halve your SWAP count and cut error by the square of your depth savings.
