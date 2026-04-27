### Cryo-CMOS Control Electronics — Moving the Stack into the Fridge

**What it is:** Custom CMOS controllers (DACs, AWGs, demodulators, sequencers) fabricated for and operated at cryogenic temperatures — typically 4 K, sometimes colder. They sit inside the dilution fridge, adjacent to the QPU, replacing long coax runs from 300 K electronics. Key industry demonstrations: Intel's Horse Ridge family (4 K controller for transmons), IMEC's cryo-CMOS for spin qubits, Google's Horse Ridge-class work, and academic Google/TU Delft collaborations.

**Why it's needed:** A room-temperature rack drives one QPU via ~400+ coax lines (see cryogenic stack). That doesn't scale past a few thousand qubits. Moving control close to the chip:
- Shortens interconnects to cm instead of m (less attenuation, less latency).
- Replaces many coax with a few digital buses (SerDes) between 300 K and 4 K.
- Enables fast feedback (QEC decoding) inside the fridge — no µs round trip through cables.

**Temperature tiers for control electronics:**

| Tier | T | Fits at stage | Qubit-facing role |
|---|---|---|---|
| Room-T classical | 300 K | Rack | Host CPU, compiler, error correction decoder (outer) |
| Hot cryo-CMOS | 77 K / 4 K | 4 K plate | DAC, AWG, LO generation, digital sequencer |
| Cold cryo-CMOS | 100 mK | Still/cold plate | Preamp, digitizer, low-latency decoder |
| Quantum-plane | 10–20 mK | MXC | Qubits + minimal passive components |

**Design constraints (at 4 K):**
- **Power budget:** 4 K stage has ≈ 1 W cooling — each controller channel must be ~ a few mW. CMOS at 4 K has lower leakage but higher mobility; circuit redesign needed, not just "cool it down."
- **Carrier freeze-out:** standard CMOS dopants freeze out at cryogenic T (below ~40 K for Si). Requires characterization and sometimes custom fabs.
- **Threshold voltage drift:** V_t rises by ~ 200 mV going 300 K → 4 K; redesign of bias networks.
- **Heat dissipation density:** ~ 1 W in a few cm² at 4 K must be conducted to pulse-tube; serious thermal plane engineering.
- **Noise:** 1/f noise is higher at cryogenic T in some geometries — sensitive for flux bias.

**Function blocks a cryo-CMOS controller needs:**

| Block | Spec target | Note |
|---|---|---|
| RF DAC | ~12 bits, 5–6 GS/s, ≤ 10 mW | Drives XY pulses at qubit frequency directly (no up-mixer) |
| LO / PLL | Sub-100 fs jitter, sharable across 8–32 qubits | Shared LO cuts power |
| Demod + ADC | 10 bits, 1 GS/s, fit in mW | Reads dispersive signal |
| Sequencer | Nanosecond pulse scheduling, per-channel memory | Handles conditional (mid-circuit) branches |
| SerDes link | 10–25 Gb/s optical/copper to 300 K | Carries commands + telemetry |

**Wire-count reduction (rule-of-thumb calc):**
```
per_qubit_coax_analog ≈ 2 (XY) + 1 (flux) + 0.1 (readout share) ≈ 3 coax
per_qubit_cryo_cmos ≈ 1/16 SerDes channel (16 qubits / digital lane) ≈ 0.06 lane
⇒ ~50× reduction in lines crossing 4 K → 300 K
```
A 10,000-qubit system without cryo-CMOS needs ~30,000 coax (impossible). With 4 K controllers: ~600 SerDes lanes (feasible).

**Spin vs SC targets:**
- **Spin qubits (Si/SiGe):** best native match — qubits operate at 100 mK–1 K with tight space, and pulse bandwidth is ≤ 100 MHz. Cryo-CMOS on the same package is plausible.
- **Transmons:** need RF at 4–8 GHz. Harder to clock at 4 K with sub-100 fs jitter, but Intel Horse Ridge demonstrated it.
- **Neutral atoms / ions:** light-based control — cryo-CMOS is less relevant; challenge is optical stack.

**Trade-offs:**
- **Gain:** dramatic wire reduction and fast feedback.
- **Loss:** thermal load at 4 K; every mW of control dissipation steals margin from HEMT amplifiers and passive components.
- **Loss:** calibration across thousands of channels now happens in a black box — need in-fridge introspection.
- **Loss:** debugging a PCB at 4 K is a multi-day thermal cycle; CI loops are slow.

**When relevant:**
- Any QPU targeting ≥ 1000 qubits.
- Any system where QEC round latency must be ≤ 1 μs (surface code with 1 μs cycle).
- Spin-qubit architectures where control density per mm² is the main constraint.

**Pitfalls:**
- Assuming stock CMOS works at 4 K — it doesn't always; design-specific characterization is mandatory.
- Ignoring back-action: digital switching on the 4 K plate couples into nearby flux lines.
- Overbuilding: putting too much digital logic cold wastes cooling power; only keep latency-critical blocks cold.

**Rule of thumb:** The wire-count wall at 4 K → MXC is real; cryo-CMOS is the main engineering lever to go beyond a few thousand SC qubits, but it only helps if controller dissipation stays under the stage's cooling budget and your QPU latency budget actually benefits from in-fridge feedback.
