### Pulse-Level Control (OpenPulse)

**What it is:** The abstraction one level below gates. Gates on superconducting hardware are implemented as **shaped microwave pulses** on control lines — amplitude, phase, frequency envelopes at nanosecond resolution. OpenPulse (Qiskit Pulse) exposes this to users for custom gate calibration, error-robust pulses, and experimental control.

**Hierarchy:**
```
Algorithm
   ↓ compile
Gates (H, CNOT, Rz, ...)
   ↓ calibration
Pulses (DRAG, Gaussian, cross-resonance)
   ↓ DAC
Microwave waveforms on control lines
```

**Channels:**

| Channel          | Role                                       |
|------------------|--------------------------------------------|
| DriveChannel `d` | Qubit drive (Rabi pulses)                  |
| ControlChannel `u` | Cross-resonance / 2Q drives              |
| MeasureChannel `m` | Readout pulse                            |
| AcquireChannel `a` | ADC capture                              |

**Common pulse shapes:**

| Shape      | Formula                                           | Use                        |
|------------|---------------------------------------------------|----------------------------|
| Gaussian   | A exp(−(t−μ)²/(2σ²))                              | X, Y single-qubit          |
| DRAG       | Gaussian + i·β·d/dt(Gaussian)                     | Leakage suppression to \|2⟩|
| GaussianSquare | Gaussian rise/fall, flat plateau              | Cross-resonance (CX)       |
| Constant   | flat                                              | Stark/detune               |
| cosine-tapered / flat-top | square with cosine edges             | iSWAP, parametric gates    |

**DRAG (Derivative Removal by Adiabatic Gate):** The leading correction to short Gaussian π/2 pulses on a weakly anharmonic transmon. Adds a proportional quadrature (derivative) to cancel leakage into the |2⟩ state. Essential at sub-20ns gate times.

**Cross-resonance (IBM 2Q gate):** Drive qubit A at qubit B's frequency. Produces Z_A X_B interaction (after echo) → ECR / CNOT. Pulse shape is a GaussianSquare on the control channel, typically ~200–400 ns, flanked by rotary echoes.

**Qiskit Pulse — build a calibrated X:**
```python
from qiskit import pulse
from qiskit.circuit import QuantumCircuit, Gate
from qiskit_ibm_runtime.fake_provider import FakeKyiv

backend = FakeKyiv()
q = 0

with pulse.build(backend, name="x_cal") as x_pulse:
    drive = pulse.drive_channel(q)
    pulse.play(pulse.Drag(duration=160, amp=0.2, sigma=40, beta=-1.5), drive)

# Attach as a custom gate calibration
qc = QuantumCircuit(1)
custom_x = Gate("x_custom", 1, [])
qc.append(custom_x, [0])
qc.add_calibration("x_custom", [q], x_pulse)

# Pulse-level schedule for a gate
with pulse.build(backend) as sched:
    pulse.play(pulse.Gaussian(duration=100, amp=0.1, sigma=25),
               pulse.drive_channel(q))
```

**When you might go pulse-level:**
- **Gate calibration:** re-tune amplitude/DRAG beta for drifted qubits.
- **Novel gates:** Mølmer–Sørensen, iSWAP, bSWAP, parametric resonance gates not in the default basis.
- **Error-robust pulses:** composite pulses (BB1), SCROFULOUS, GRAPE-optimized waveforms.
- **Pulse-efficient transpilation:** replace gate decompositions with shorter pulse sequences (e.g., partial CR gates for arbitrary ZZ angles).
- **Quantum optimal control:** in-loop pulse optimization via Qiskit Experiments / Qiskit Dynamics.

**Caveats:**
- Qiskit Pulse is deprecated on the newer IBM Quantum stack (Pulse access is being restricted in favor of dynamic circuits + Qiskit Dynamics / device-specific APIs). Check your backend's `target` for `has_calibration_for`.
- Other platforms expose pulse control via their own APIs (IonQ's debias-free XY circuits, Quantinuum's H-system primitives).

**Rule of thumb:** Live at the gate level by default; go pulse-level only when you need a gate the backend doesn't ship with, or when you're squeezing the last 0.1% of fidelity out of a calibration.
