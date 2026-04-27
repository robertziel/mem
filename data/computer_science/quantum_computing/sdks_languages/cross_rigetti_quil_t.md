### Rigetti Quil-T — Timed Pulse IR for Frame-Level Control

**What it is:**
Quil-T is Rigetti's pulse-level extension of the Quil quantum instruction language. Where plain Quil is a gate-model IR (`RX(pi/2) 0`, `CZ 0 1`, `MEASURE 0 ro[0]`), Quil-T adds the primitives needed to describe **what actually happens in the analog electronics**: frames, waveforms, pulses played on those frames, explicit delays, and calibration bindings via `DEFCAL`. It sits at the same abstraction tier as OpenPulse / OpenQASM 3's `defcal` — below `cal_grammar "openpulse"` — but is the native language on Rigetti's Aspen / Ankaa-class superconducting QPUs.

**Core concepts:**

| Concept | Quil-T construct | Meaning |
|---|---|---|
| Frame | `DEFFRAME 0 "rf": ... ` | A rotating-frame oscillator tied to a qubit/channel |
| Waveform | `DEFWAVEFORM my_wf: 0.0, 0.05, ...` or `gaussian(...)` | Envelope samples or templated shape |
| Pulse | `PULSE 0 "rf" gaussian(...)` | Play waveform on frame |
| Capture | `CAPTURE 0 "ro_rx" flat(...) ro[0]` | Demodulate and record |
| Timing | `DELAY 0 "rf" 200ns`, `FENCE 0 1` | Idle and synchronization |
| Calibration | `DEFCAL RX(pi/2) 0: PULSE ...` | Bind a gate to its pulse schedule |

**Example — calibrated `RX(π/2)` and a readout:**
```
DEFFRAME 0 "rf":
    SAMPLE-RATE: 1.0e9
    INITIAL-FREQUENCY: 5.0e9

DEFWAVEFORM drag_half_pi:
    gaussian(duration: 60ns, fwhm: 20ns, t0: 30ns, scale: 0.35, phase: 0.0, detuning: 0.0)

DEFCAL RX(pi/2) 0:
    PULSE 0 "rf" drag_half_pi
    DELAY 0 "rf" 8ns

DECLARE ro BIT[1]
RX(pi/2) 0
FENCE 0
CAPTURE 0 "ro_rx" flat(duration: 1.2us, iq: 1.0+0.0i) ro[0]
```

**Authoring from pyQuil:**
```python
from pyquil import Program
from pyquil.gates import RX, MEASURE
from pyquil.quiltcalibrations import CalibrationMatch

p = Program()
p += RX(3.14159 / 2, 0)
p += MEASURE(0, 0)

# Pull the device's native Quil-T calibrations:
qc = get_qc("Ankaa-2")
p_calibrated = qc.compiler.calibrate(p)     # expands gates into DEFCAL bodies
print(p_calibrated.out())
```

**When to use:**
- Characterization work: Rabi, T1/T2, randomized benchmarking at the pulse level — anything where you need to vary pulse amplitude, duration, or DRAG coefficient.
- Custom gate design: you have a two-qubit gate the stock `DEFCAL` library doesn't expose optimally, and you want to shape the pulse yourself.
- Dynamic decoupling sequences that demand pulse-accurate timing between fences.
- Hardware feedback experiments using `CAPTURE` + `JUMP-WHEN` for real-time branching.

**Quil-T vs OpenPulse vs OpenQASM 3 `defcal`:**

| Aspect | Quil-T | IBM OpenPulse | OQ3 `defcal` |
|---|---|---|---|
| Scope | Rigetti hardware | IBM hardware | Spec-level portability |
| Frame model | Explicit `DEFFRAME` | `DriveChannel`, `MeasureChannel` | `frame` type (OQ3 pulse grammar) |
| Calibration binding | `DEFCAL` | Instruction schedules | `defcal gate(...) q { ... }` |
| Host language | Quil / pyQuil | Qiskit Pulse | Embedded in OQ3 |
| Sample rate exposed | Yes (`SAMPLE-RATE`) | Implicit per backend | Via `frame` parameters |

**Pitfalls:**
- Frames and qubits are not the same: a single qubit usually has multiple frames (`"rf"` drive, `"ro_tx"`, `"ro_rx"`). Targeting the wrong frame silently plays the pulse nowhere useful.
- `DELAY q "frame"` is frame-local — `DELAY q` (no frame) applies to *all* frames on that qubit. Mixing the two leads to unintended desync.
- `FENCE` without listing qubits is a barrier across the whole program; scoped fences (`FENCE 0 1`) are almost always what you want.
- `CAPTURE` outputs are complex IQ values, not bits — the subsequent `MEASURE`-like projection has to be programmed explicitly.

**Rule of thumb:** Stay in gate-level Quil (or even pyQuil's `Program`) for algorithm work, and reach for Quil-T only when the experiment genuinely requires pulse-level authority — characterization, custom gate design, or fast feedback. Compile down, not up.
