### IBM Qiskit — Target, ISA, and Calibration Data

**What it is:** A `Target` is the object describing **exactly what a backend can do**, per qubit and per qubit-pair: which gates are supported, their durations, their error rates, and the coupling map. The transpiler reads a `Target` to produce ISA (Instruction-Set-Architecture) circuits — circuits legal for that specific device at that specific calibration snapshot. In Qiskit 2.x, `Target` is the single source of truth; `backend.coupling_map`, `backend.basis_gates`, and `backend.properties` are all derived from it.

**API shape:**
```python
target = backend.target

target.operation_names            # {'sx', 'x', 'rz', 'ecr', 'measure', 'id', ...}
target.num_qubits                 # e.g. 127
target.physical_qubits            # range(127)
target.qubit_properties[0]        # QubitProperties(t1=..., t2=..., frequency=...)

# What gates are legal on qubit 0?
[name for name in target.operation_names
 if target.instruction_supported(name, (0,)) or
    target.instruction_supported(name, (0, 1))]

# ecr duration & error on the (5, 6) link
props = target['ecr'][(5, 6)]
props.duration                    # seconds (e.g. 6.6e-7)
props.error                       # e.g. 7.3e-3

# Coupling map (derived)
target.build_coupling_map()

# Pulse calibrations (when available)
target.instruction_schedule_map() # pulse-level schedules per (gate, qubits)
```

**Ideal basis vs. hardware-native:**

| Concept | Example | Where it lives |
|---|---|---|
| Textbook universal set | `{H, T, CNOT}` | Papers |
| Ideal basis (Qiskit abstract) | `{u3, cx}` | Older transpiler output |
| Hardware-native basis | Eagle: `{sx, x, rz, ecr, measure}`; Heron: `{sx, x, rz, cz, measure}` | `target.operation_names` |

Transpilation is driven by `Target` — passing `basis_gates=['h','cx']` without a matching Target is fighting the tool.

**Per-qubit/per-link granularity:**
Unlike older `BackendV1` (global basis), `Target` supports **different gate sets on different qubits**. If qubit 12 has a broken ecr to qubit 13 but works with qubit 14, `target.instruction_supported('ecr', (12, 14)) == True` and `(12, 13) == False`. Layout/routing honour this automatically.

**Gate durations and scheduling:**
`duration_sec = target['sx'][(q,)].duration`. Needed for:
- Dynamical decoupling (idle-time-aware DD insertion).
- ALAP/ASAP scheduling.
- Pulse-level circuit estimation.

Durations are in seconds (SI); in older APIs they were in dt units — check.

**instruction_schedule_map (pulse level):**
On backends that expose pulse, `target.instruction_schedule_map()` returns a map from `(gate_name, qubits)` to a `ScheduleBlock`. Use it to build calibrated custom gates:
```python
from qiskit import pulse
sched = target.instruction_schedule_map().get('sx', (0,))
with pulse.build() as my_pulse:
    pulse.call(sched)
# Attach via qc.add_calibration('my_gate', [0], my_pulse)
```
Many cloud backends now hide pulse access — check `target.has_calibration(...)` first.

**Stale-Target hazard:**
A `Target` is a **snapshot at fetch time**. IBM devices are recalibrated ~daily; a pickled Target from yesterday may:
- Mark a now-disabled qubit as active (transpile succeeds, job fails).
- Carry old error rates that mis-rank qubits for VF2 layout.
- Omit a gate that was re-added in the interim.

Always refetch `service.backend(name).target` at the start of a run, or treat a cached Target as a convenience for offline tooling only.

**Common diagnostics:**
```python
# Why did my circuit fail to transpile?
print(target.operation_names)
print(target.build_coupling_map())
# Which qubit has the lowest error for my 2Q op?
pairs = sorted(target['ecr'].items(), key=lambda kv: kv[1].error)
best_pair = pairs[0][0]
```

**Pitfalls:**
- Hardcoding `basis_gates=['sx','x','rz','cx']` for Heron — Heron uses `cz`, not `cx`. Use `target.operation_names`.
- Caching a Target across days → surprising transpile failures when the device map changes.
- Assuming connectivity is symmetric — it is (for ECR/CZ), but errors are not (q→q' may differ from q'→q on some pulse calibrations).
- Using `backend.basis_gates` on a heterogeneous Target — only returns the intersection across qubits.

**Rule of thumb:** The `Target` drives every transpiler decision — always fetch a fresh one, inspect `operation_names` before hardcoding anything, and remember yesterday's Target is today's bug.
