### AWS Braket Pulse API — Frame, Waveform, PulseSequence

**What it is:**
A lower-level control path on Braket that bypasses the gate model and lets you author microwave / laser pulse envelopes directly on supported hardware (Rigetti superconducting, Oxford Quantum Circuits Lucy). Instead of saying "CNOT 0 → 1" you specify a `PulseSequence` of `Waveform`s played on named `Frame`s. You can also override individual gate implementations via `GateCalibrations`, keeping most of a circuit gate-model while surgically re-tuning one gate.

**API shape:**
```python
from braket.pulse import Frame, PulseSequence, GaussianWaveform, DragGaussianWaveform
from braket.aws import AwsDevice
from braket.circuits import Circuit, GateCalibrations
from braket.circuits.gates import Rx
```
Core objects:
| Object | Role |
|---|---|
| `Frame(frame_id, port, frequency, phase)` | Time-tracked rotating frame on a device port |
| `Waveform` | Envelope shape — Gaussian, DRAG, arbitrary (constant, array, ERF, etc.) |
| `PulseSequence` | Ordered operations: `play`, `shift_phase`, `set_frequency`, `capture_v0`, `barrier`, `delay` |
| `GateCalibrations({(Gate, qubit): PulseSequence, ...})` | Override gate definitions for a specific circuit |

**Device discovery:**
Not every device supports pulse. Inspect `device.properties` — pulse-capable devices expose `pulse.frames`, `pulse.ports`, and `nativeGateCalibrations`. Devices that *don't* will reject pulse circuits at validation time.
| Provider | Pulse access |
|---|---|
| Rigetti Ankaa / Aspen-M | Yes (historically) |
| OQC Lucy | Yes |
| IonQ | No — logical-gate only |
| QuEra Aquila | Analog Hamiltonian, not gate-pulse |

**Example — re-tune an Rx(π/2) on qubit 0:**
```python
device = AwsDevice("arn:aws:braket:us-west-1::device/qpu/rigetti/Ankaa-2")
q0_rf = device.frames["q0_rf_frame"]

# 40 ns DRAG pulse on q0
custom = PulseSequence() \
    .play(q0_rf, DragGaussianWaveform(length=40e-9, sigma=10e-9,
                                      beta=-0.3, amplitude=0.18))

calibrations = GateCalibrations({
    (Rx(angle=1.5707963), 0): custom,
})

circ = Circuit().rx(0, 1.5707963).measure(0)
task = device.run(circ, shots=500, gate_definitions=calibrations.pulse_sequences)
```
The rest of the compiler still does layout/routing — only this one gate is swapped.

**Pure pulse program (no gates):**
```python
ps = (PulseSequence()
      .set_frequency(q0_rf, 5.12e9)
      .play(q0_rf, GaussianWaveform(length=20e-9, sigma=5e-9, amplitude=0.2))
      .barrier([q0_rf])
      .capture_v0(device.frames["q0_ro_frame"]))
task = device.run(ps, shots=1000)
```

**Why reach for pulse:**
- **Calibration research** — benchmark custom shapes (DRAG variants, cosine-tapered, optimal-control output from Krotov / GRAPE).
- **Speed** — bypass vendor-native decompositions that insert extra virtual Z's.
- **Non-Clifford primitives** — implement gates the device basis doesn't expose natively, e.g. iSWAP⁰·⁵.

**Pitfalls:**
- **Zero portability.** A `PulseSequence` on Ankaa is meaningless on Lucy — frames, ports, frequencies, and calibrations all differ. Sharing a pulse library across vendors requires an abstraction you build.
- **No simulator.** `LocalSimulator` / SV1 / DM1 ignore pulse instructions. You can only validate pulse programs on the real device.
- **Frequencies drift.** Calibrations that worked yesterday may not today; always capture the current device calibration set (`device.properties.pulse.nativeGateCalibrations`) at job start.
- **Pulse circuits count against the same per-shot price** as gate circuits — cheaper execution is not the reason to use pulse.

**Rule of thumb:** Pulse is a scalpel, not a default — use it only when gate-model Braket has measurably failed your gate fidelity or timing target, because the moment you drop down a level you forfeit portability and the local simulator stack.
