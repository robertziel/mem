### Transmon Qubit — Charge-Insensitive Superconducting Qubit

**What it is:**
A superconducting qubit built from a Josephson junction shunted by a large capacitor. The "transmon" regime is defined by the ratio E_J/E_C ≫ 1 (typically 50–100), which exponentially suppresses sensitivity to charge noise at the cost of reduced anharmonicity. It is the workhorse qubit of most large-scale superconducting processors today.

**Physics:**
The junction + capacitor forms a nonlinear LC oscillator. The Hamiltonian (in the Cooper-pair number basis) is:
```
H = 4 E_C (n̂ − n_g)² − E_J cos(φ̂)
```
- E_J: Josephson energy (inductive, nonlinear)
- E_C = e²/(2C): charging energy (capacitive)
- The cosine term makes the ladder of levels unevenly spaced → the |0⟩→|1⟩ transition is addressable without driving |1⟩→|2⟩.

**Anharmonicity α ≈ −E_C/ℏ:**
Typical α/2π ≈ −200 to −300 MHz. Sets the minimum gate time — pulses too short excite |2⟩ (leakage). DRAG pulses suppress this.

**Typical numbers:**
| Parameter | Range |
|---|---|
| Qubit frequency ω_01/2π | 4–8 GHz |
| E_J/E_C | 50–100 |
| Anharmonicity | −200 to −300 MHz |
| T1 | 50–400 μs |
| T2 (echo) | 50–300 μs |
| 1Q gate time | 20–40 ns |
| 2Q gate time | 40–500 ns |
| 1Q fidelity | 99.9–99.99% |
| 2Q fidelity | 99.0–99.7% |

**Fixed-frequency vs tunable:**
| | Fixed-frequency | Tunable (SQUID) |
|---|---|---|
| Junction(s) | Single | Two in parallel (SQUID loop) |
| Frequency knob | None (set at fab) | External flux Φ |
| Flux-noise T2 | Immune | Degraded except at sweet spot |
| 2Q gate | Cross-resonance, parametric | iSWAP, CZ via tuning to resonance |
| Frequency collisions | Risk (fab spread) | Avoidable in-situ |

**Why charge-insensitive:**
In the transmon regime the charge-dispersion (sensitivity of ω_01 to gate charge n_g) falls exponentially: ε_01 ∝ exp(−√(8 E_J/E_C)). This is the core reason transmons beat the earlier Cooper-pair box.

**Readout:**
Dispersive coupling to a microwave resonator shifts the resonator frequency by χ depending on qubit state; a homodyne measurement of the reflected signal distinguishes |0⟩ and |1⟩ in 50–500 ns.

**Strengths:**
- Fabricated with standard Al/AlOx/Al lithography; scales like CMOS.
- Fast ns-scale gates.
- Mature control stack (microwave IQ drives, dispersive readout).
- Clear path to 2D surface-code tiling.

**Weaknesses:**
- Small anharmonicity → leakage to |2⟩ limits gate speed.
- Requires mK dilution refrigerator (~10 mK).
- TLS defects in oxides cap T1.
- Frequency crowding as qubit count grows.
- Crosstalk between densely packed qubits.

**When to use:**
Default choice if you need many qubits fast, tolerate a dilution fridge, and your algorithm survives 2Q fidelity ~99.5%. Best-understood platform for surface-code QEC.

**Rule of thumb:** Transmon = slightly-anharmonic microwave oscillator at 5 GHz with ~100 μs coherence and ~100 ns two-qubit gates; if your design needs GHz-scale anharmonicity or ms coherence, look at fluxonium instead.
