### Cryogenic Stack — Dilution Fridge Stages, Wiring, and Heat Budget

**What it is:** The multi-stage cryostat (dilution refrigerator, "DR") that cools a superconducting QPU from room temperature to ~10–20 mK, plus all the microwave, DC, and flux lines that connect warm electronics to the cold chip. For SC QPUs the wiring is the scaling bottleneck — not the qubits themselves.

**Thermal stages (typical DR):**

| Stage | Temperature | Purpose | Cooling power |
|---|---|---|---|
| 300 K | Room T | AWG, LO, ADC, bias DACs | — |
| 50 K | Pulse-tube 1st stage | Thermal break, radiation shield | ≈ 40 W @ 50 K |
| 4 K | Pulse-tube 2nd stage | HEMT readout amps, attenuators | ≈ 1.5 W @ 4 K |
| 800 mK | Still | Intermediate anchoring | ≈ 25 mW |
| 100 mK | Cold plate | Isolators, circulators, filters | ≈ 300 μW |
| 10–20 mK | Mixing chamber | QPU chip, TWPA | ≈ 20 μW @ 20 mK |

**Line count per qubit (SC transmon, contemporary design):**

| Line type | Purpose | Count per qubit |
|---|---|---|
| XY drive | Single-qubit gates (microwave) | 1 |
| Z / flux | Frequency tuning (DC + AC) | 0 – 1 |
| Readout in (shared feedline) | Dispersive readout drive | 1 / ~8 qubits |
| Readout out | Amplified return | 1 / ~8 qubits |
| Coupler flux (if tunable) | Turn couplers on/off | ≈ 1 per edge |

A 100-qubit heavy-hex chip with tunable couplers ≈ 100 XY + 100 Z + 150 coupler + ~25 readout → **~400 coax lines** into a ~30 cm bore. Each coax is ~2 mm OD and dissipates ≈ 1–10 μW at the MXC plate if poorly attenuated.

**Attenuation chain (XY drive line, typical):**
- 20 dB at 4 K, 10 dB at 100 mK, 20 dB at MXC.
- Purpose: block ~300 K Johnson noise that would drive the qubit. Without ≥ 50 dB cold attenuation, the drive line alone would raise qubit T to ~0.5 K.

**Heat budget sanity check (rule-of-thumb calc):**
```
passive_heat_per_coax_MXC ≈ 10–50 nW   (well-attenuated, stainless inner)
active_heat_per_drive_pulse ≈ P_in · (1 − reflection) absorbed in attenuators
MXC cooling @ 20 mK ≈ 20 μW
⇒ max coax count @ MXC ≈ 20 μW / 50 nW ≈ 400
```
This is a hard ceiling for line count without novel wiring (superconducting flex, cryo-CMOS muxing, or photonic links).

**Wiring-density bottleneck:**
- NbTi superconducting flex ribbons replace normal coax at MXC — lower heat, higher density.
- Microwave muxing: frequency-domain multiplex readout of ~8–16 qubits per feedline (Purcell-filtered).
- Flux muxing is harder (DC, slow); active research direction.
- Photonic / optical fibers: very low heat conduction, but need cryogenic photonic transducers.

**Fidelity vs temperature trade:**

| T_MXC | Thermal photon occupation n_th at 5 GHz | Effective qubit T1/T2 impact |
|---|---|---|
| 50 mK | n_th ≈ 0.009 | ~1% excess dephasing |
| 20 mK | n_th ≈ 3e-5 | Negligible thermal |
| 10 mK | n_th ≈ 5e-9 | Diminishing return |

Below ~15 mK the thermal improvement is negligible; extra cooling power at MXC is more useful than lower base T.

**Vibration, magnetic, and microphonic constraints:**
- Pulse-tube compressor vibration at ~1.4 Hz modulates SQUID flux → sidebands on flux-tuned qubits.
- Mu-metal shields around MXC to keep ambient `B < 0.1 μT`.
- Acoustic decoupling of compressor (remote install, bellows) vital for flux-tuned devices.

**Trade-offs:**
- Bigger DR (wet-dilution, 1 W @ 4 K) → more qubits per fridge but slower turnaround.
- Smaller "table-top" DRs are fast to cycle but cap at ~50 qubits.
- Every added stage of muxing / cryo-CMOS adds latency to feedback loops (QEC).

**Pitfalls:**
- Underestimating radiation heat leak through optical windows and unshielded coax.
- Forgetting ground loops → 50/60 Hz modulation of qubit frequencies.
- Omitting IR-blocking (Eccosorb) filters → hot quasi-particles poison qubits.

**Rule of thumb:** A DR can cool roughly 500 coax lines before MXC heat budget is spent — so SC QPUs fundamentally scale only if you cut wires per qubit (cryo-CMOS, muxing, photonics), not by just adding more coax.
