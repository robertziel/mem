### ISA Targeting — Qiskit `Target` and Rigetti Quil-T

**What it is:** A quantum backend exposes an **instruction set architecture (ISA)**: which gates are native, on which qubits / edges, with what calibrated error, at what duration, at what pulse-level description. The transpiler consumes this ISA to lower an abstract circuit onto the device. Qiskit's modern abstraction is the `Target` object; Rigetti's low-level pulse-and-timing IR is **Quil-T**. Getting either wrong is the most common cause of surprising transpile failures.

**Qiskit `Target` — what it carries:**

| Field                               | Example                                           |
|-------------------------------------|---------------------------------------------------|
| `target.num_qubits`                 | `27`                                              |
| `target.operation_names`            | `{"id", "rz", "sx", "x", "cx", "measure"}`        |
| `target.qargs_for_operation_name("cx")` | `[(0,1), (1,0), (1,2), ...]`                   |
| `target.duration("cx", (0,1))`      | `540e-9` (seconds)                                |
| `target.qubit_properties[q].t1`     | e.g. `120e-6`                                     |
| `target.instruction_supported("cx", (5,6))` | `True/False`                              |
| `target.calibration("cx", (0,1))`   | a `ScheduleBlock` of pulses (if pulse-capable)    |

The `Target` replaced the older split `(basis_gates, coupling_map, properties, instruction_schedule_map)` with a single unified object.

**Building a Target from scratch:**
```python
from qiskit.transpiler import Target
from qiskit.circuit.library import CXGate, SXGate, RZGate, Measure
from qiskit.circuit import Parameter

target = Target(num_qubits=5)
target.add_instruction(SXGate(),  {(q,): None for q in range(5)})
target.add_instruction(RZGate(Parameter("theta")), {(q,): None for q in range(5)})
# Linear coupling 0-1-2-3-4, both directions
cx_props = {pair: None for pair in [(0,1),(1,0),(1,2),(2,1),(2,3),(3,2),(3,4),(4,3)]}
target.add_instruction(CXGate(), cx_props)
target.add_instruction(Measure(), {(q,): None for q in range(5)})

from qiskit import QuantumCircuit, transpile
qc = QuantumCircuit(5); qc.h(0)
for i in range(4): qc.cx(i, i+1)
tqc = transpile(qc, target=target, optimization_level=3)
print(tqc.count_ops())
```

Passing `None` as props omits calibrated error/duration — transpilation works but noise-aware passes fall back to defaults. Populate `InstructionProperties(duration=..., error=...)` to enable noise-aware layout.

**Quil-T (Rigetti's pulse/timed IR):**

An extension of Quil with explicit frames, timing, and pulses — one level below gate:

```
DECLARE theta REAL
DEFCAL RZ(%theta) q:
    SHIFT-PHASE q "rf" -%theta

DEFCAL RX(%theta) q:
    FENCE q
    NONBLOCKING PULSE q "rf" gaussian(duration: 32e-9, fwhm: 8e-9, ...)
    FENCE q

# Program
RZ(pi/4) 0
RX(pi/2) 0
MEASURE 0 ro[0]
```

Quil-T lets the user redefine the pulse-level realization of a gate, schedule explicit FENCEs, parameterize durations — exactly what you need for dynamical decoupling, composite pulses, or bespoke echoed-cross-resonance CNOTs.

**`Target` vs Quil-T side-by-side:**

| Aspect                     | Qiskit Target                           | Quil-T                               |
|----------------------------|-----------------------------------------|--------------------------------------|
| Level                      | Gate-level ISA with optional pulse `ScheduleBlock` | Pulse-timed program IR              |
| Authoring                  | Python object                           | Text program (like assembly)         |
| Per-gate calibration       | `InstructionProperties.calibration`     | `DEFCAL` with pulse waveforms        |
| Dynamic scheduling         | Scheduler passes operate on ISA         | Explicit `FENCE` / `DELAY` in program |
| Parameter binding          | `Parameter` + `assign_parameters`       | `DECLARE REAL` classical memory      |

**When to use:**
- `Target` — every Qiskit transpile: `transpile(qc, backend=backend)` uses `backend.target` internally.
- Explicit construction — fake/custom devices, cross-architecture studies, emulators.
- Quil-T — any time you need to redefine a gate's pulses or insert device-specific timing on Rigetti.

**Pitfalls:**
- **Stale Target.** `FakeBackend` snapshots freeze months-old calibrations; `generate_preset_pass_manager(backend=FakeKyiv())` compiles against stale noise. Always compile against a **live** `backend` (or refreshed properties) for production submissions — this is the single most common source of "my transpile worked yesterday and not today" bugs.
- **Missing directional edges.** `(0,1)` supported does not imply `(1,0)` — transpiler inserts inverses/Hs around the CX, not always cheaply.
- **Duration units.** Qiskit durations are in seconds or `dt` — mix at your peril.
- Quil-T `DEFCAL` definitions persist for the whole program; an omitted `FENCE` silently allows gates to overlap in time.

**Rule of thumb:** A stale `Target` (or any out-of-date ISA) is the #1 source of surprising transpile failures — always compile against fresh backend properties and inspect `target.operation_names` before blaming your circuit.
