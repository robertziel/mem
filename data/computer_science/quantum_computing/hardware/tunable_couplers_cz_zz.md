### Tunable Couplers — CZ Gates and ZZ Cancellation

**What it is:** An intermediate, tunable element (usually a flux-biased transmon or SQUID) placed between two data transmons instead of a fixed capacitive bus. Its frequency can be dynamically shifted to turn the effective qubit-qubit coupling `g_eff` on (for a 2Q gate) and back off (idle). Used by Google Sycamore/Willow, Rigetti Ankaa, and most modern superconducting chips.

**Why fixed couplers hurt:** A direct capacitive coupling `g` between two transmons produces a static ZZ interaction `ξ_ZZ ≈ 2 g² α / (Δ² − α²)` where `Δ` is the detuning and `α` the anharmonicity. Typical `ξ_ZZ` is 10–200 kHz — always on. During "idle" neighbor gates, this phase-couples spectators and limits two-qubit gate fidelity. Frequency-crowded fixed-coupling chips (e.g. IBM cross-resonance style) must rely on frequency allocation + ECR echoes instead.

**Design:** Three-body system (qubit Q1 — coupler C — qubit Q2). When the coupler is detuned far from both qubits, the direct and coupler-mediated exchange terms destructively interfere:

```
g_eff ≈ g_12  −  (g_1c · g_2c) / Δ_c
```

Pick `g_12`, `g_1c`, `g_2c`, `Δ_c` so `g_eff → 0` at an idle bias (ZZ-free point) and `g_eff ≈ 5–20 MHz` at the interaction bias (fast CZ). The coupler is flux-pumped or DC-biased between these points.

**Coupler variants:**

| Variant | Mechanism | Example |
|---|---|---|
| Flux-tunable transmon | DC + AC flux shifts coupler frequency | Google Sycamore |
| Capacitively-shunted SQUID | Smaller footprint, two-junction SQUID | Rigetti Ankaa |
| Differential "gmon" | Inductive SQUID in parallel with direct cap | UCSB / Google early |
| Bus-based with tunable filter | Shared bus plus parametric filter | Research designs |

**Gate modalities enabled:**

| Gate | How the coupler drives it |
|---|---|
| Adiabatic CZ | Slowly bias coupler to bring `|11⟩ ↔ |02⟩` into resonance; acquires 2π phase |
| iSWAP / √iSWAP | Parametric drive at `|Δ_q1 − Δ_q2|` modulates coupling |
| CZ via parametric | Modulate coupler flux at `|Δ_q1 − Δ_q2| + α` to resonate `|11⟩ ↔ |02⟩` |
| Fermionic simulation | Arbitrary fSim(θ, φ) by combining iSWAP + CZ angles |

**Trade-offs:**
- **Extra hardware per edge:** coupler adds a flux line (≈ +1 DC + AC line per 2Q edge). Wiring density worsens.
- **Coupler is itself a qubit:** it can leak to |2⟩_c during the gate. DRAG-like shaping and fast adiabaticity mitigate.
- **Calibration:** two-parameter bias landscape (static and AC); much larger calibration space than a fixed-coupling CR gate.
- **Residual ZZ:** perfect cancellation is narrowband. Flux noise on coupler → time-varying `ξ_ZZ`. Aim for < 10 kHz residual at the park bias.
- **Benefit:** demonstrated 2Q fidelities > 99.7% (Google Willow 2024, Rigetti Ankaa-2) — hard to reach on fixed-coupling transmon chips.

**ZZ at the park point (rule-of-thumb figure of merit):**
```
ξ_ZZ(park) / (2π) < 10 kHz  → simultaneous idle error per μs ≈ (2π · 1e4 · 1e-6)² ≈ 4e-9
```
For 1 μs idle during a neighbor's CZ, residual ZZ contributes negligibly vs T1/T2 errors.

**When relevant:**
- Any SC architecture where you want > 99.5% 2Q fidelity.
- Surface-code / LDPC QEC experiments that require all-idle qubits (the data qubits during ancilla cycles).
- Chips with dense connectivity where you can't afford frequency-collision avoidance alone.

**Pitfalls:**
- Flux crosstalk: the coupler's flux line couples to neighboring qubits. Requires full `M_ij` bias matrix inversion during calibration.
- Overshoot of `g_eff` → chirped pulses; control leakage into coupler.
- Temperature drift of fridge → coupler `Δ_c` shifts → ZZ null moves. Re-calibrate on cooldown.
- Spectator `ξ_ZZ`: even when the gate pair's ZZ is nulled, third-party neighbors may not be. Multi-coupler lattices need per-edge nulling.
- Parametric sidebands: driving the coupler creates sidebands at `ω ± n·ω_drive` that can resonate with readout resonators or TLS — design filter rejection before trusting the gate.
- 1/f flux noise on the coupler broadens its frequency → slow drift of `g_eff` over minutes. Interleaved calibration every ~ 10 min for high-fidelity benchmarks.

**Calibration flow (typical):**
1. DC sweep: find coupler flux where `ξ_ZZ(Q1, Q2)` is minimized (Ramsey-on-control vs target state).
2. AC tune: apply parametric flux pulse; scan amplitude and duration to map the `|11⟩ ↔ |02⟩` exchange.
3. Randomized benchmarking on isolated pair → 2Q fidelity.
4. Simultaneous RB across neighbors → check for spectator degradation.
5. Repeat at shifted base points to track 1/f drift.

**Rule of thumb:** If your chip needs simultaneous high-fidelity 2Q gates across a dense lattice, you want tunable couplers — they turn ZZ from an always-on tax into a calibratable zero and make CZ/iSWAP a first-class, fast, high-fidelity gate.
