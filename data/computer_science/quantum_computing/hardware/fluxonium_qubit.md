### Fluxonium Qubit — High-Impedance Superconducting Qubit

**What it is:**
A superconducting qubit consisting of a small Josephson junction shunted by a large superinductor (a long chain of larger junctions or a high-kinetic-inductance film) and a capacitor. The superinductor produces a very high impedance (Z ≫ R_Q = h/(2e)² ≈ 6.45 kΩ), which gives GHz-scale anharmonicity and long coherence times at the cost of slower operation and more complex control.

**Physics:**
The Hamiltonian includes an inductive term in addition to the transmon's capacitive and Josephson terms:
```
H = 4 E_C n̂² − E_J cos(φ̂ − φ_ext) + (1/2) E_L φ̂²
```
- E_L = (ℏ/2e)² / L: inductive energy (from the superinductor)
- At external flux φ_ext = π (half flux quantum "sweet spot"), the potential is a double well with a fluxon-like tunneling gap.
- The qubit transition 0→1 sits at low frequency (100 MHz – 1 GHz) with much higher 1→2 separation.

**Level structure (at φ_ext = π):**
```
|2⟩  ────────   ω_12 ≈ 3–5 GHz (charge-like)
                  ↑
|1⟩  ────────   ω_01 ≈ 0.2–1 GHz (plasmon/fluxon)
                  ↑
|0⟩  ────────
```

**Fluxonium vs Transmon:**
| | Transmon | Fluxonium |
|---|---|---|
| Shunt | Capacitor only | Capacitor + superinductor |
| E_J/E_C | 50–100 | ~1–10 |
| ω_01/2π | 4–8 GHz | 0.2–1 GHz |
| Anharmonicity | −200 to −300 MHz | +2 to +5 GHz (effective) |
| T1 | 50–400 μs | 300 μs – 1+ ms |
| T2 (echo) | 50–300 μs | 200–700 μs |
| 1Q gate time | 20–40 ns | 20–100 ns |
| 2Q gate time | 40–500 ns | 50–200 ns |
| Flux sweet spot | Tunable only | Always (φ = π) |
| Fabrication | Simple | Harder (superinductor) |

**Why longer T1:**
- Low ω_01 reduces dielectric-loss rates (loss tangent × ω).
- Matrix element ⟨0|n̂|1⟩ is suppressed at the half-flux sweet spot → weaker coupling to charge-like loss channels.
- Purcell decay into readout resonator can be engineered small.

**Why it's harder:**
- Superinductor requires long Josephson-junction arrays (20–200 junctions) or granular-Al / NbTiN kinetic-inductance films.
- Low qubit frequency sits near thermal photons at 10 mK (k_B T/h ≈ 200 MHz) → thermal population must be fought with active reset.
- Drive lines need more filtering; non-computational states (plasmon ladder) proliferate.
- 2Q gates usually need an additional coupler element.

**Strengths:**
- ~10× longer coherence than typical transmons.
- Large anharmonicity → faster pulses without leakage in principle.
- First-order flux-insensitive at sweet spot.

**Weaknesses:**
- Thermal-population floor at low ω_01.
- More complex fabrication and control stack.
- Ecosystem (tooling, EDA, simulation) less mature than transmon.

**When to use:**
Algorithms whose depth is coherence-limited (many gates before T1/T2 exhaust) and you can afford the extra fab + calibration overhead. Good match for early-FTQC research where logical-gate count matters more than raw clock speed.

**Rule of thumb:** Fluxonium trades ns-speed and fab simplicity for roughly an order of magnitude more coherence and GHz anharmonicity; pick it when your bottleneck is T2, not gate count per second.
