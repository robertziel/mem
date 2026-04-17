### Silicon Spin Qubits — Electron/Hole Spins in Si/SiGe Quantum Dots

**What it is:**
A solid-state qubit consisting of a single electron (or hole) confined in an electrostatically defined quantum dot in a silicon or Si/SiGe heterostructure. The qubit lives in the spin degree of freedom (|↑⟩, |↓⟩) of the trapped carrier. Fabrication reuses CMOS process modules (gate-all-around nanowire, FinFET, planar MOS) — the same toolchain that builds commercial transistors.

**Physics:**
- A stack of gates on a Si/SiGe (or SiMOS) heterostructure depletes the 2DEG to form a dot holding exactly one carrier.
- Spin states are split by an external magnetic field (Zeeman): ΔE = g μ_B B. Typical ω_spin/2π ≈ 10–30 GHz at B ≈ 0.3–1 T.
- Gates driven by electric-dipole spin resonance (EDSR) via a micromagnet or intrinsic spin-orbit (hole qubits).
- Two-qubit gates: exchange interaction J(V) between adjacent dots — tune gate voltage to pulse J on/off for SWAP, CZ, CROT.
- Readout: Pauli spin blockade + RF reflectometry on a nearby charge sensor (SET) or gate dispersive readout.

**Device cross-section (schematic):**
```
     gate1    gate2    gate3     ← electrostatic plunger gates
    ┌──┐    ┌──┐    ┌──┐
────┘  └────┘  └────┘  └────    ← gate oxide
 ─────────────────────────      ← Si quantum well (Si/SiGe) or SiMOS
   ●         ●        ●         ← single electrons (qubits)
 ─────────────────────────      ← SiGe barrier / substrate
```

**Typical numbers:**
| Parameter | Range |
|---|---|
| Dot size | 30–100 nm |
| Zeeman splitting | 10–30 GHz |
| Charging energy | 1–5 meV |
| Exchange J range | MHz – GHz (voltage-tuned) |
| T1 | seconds (at mK, optimal field) |
| T2* | 1–20 μs (natural Si) |
| T2* (²⁸Si purified) | 100 μs – several ms |
| T2 (echo, ²⁸Si) | up to ~10 ms (electron), longer (nuclear ancilla) |
| 1Q gate time | 50–500 ns |
| 2Q gate time | 50–200 ns |
| 1Q fidelity | 99.9% (best) |
| 2Q fidelity | 99.0–99.5% (best) |
| Operating T | 20 mK – 1.5 K (hot-qubit variants) |

**Why isotope purification matters:**
Natural silicon contains ~4.7% ²⁹Si, which carries nuclear spin (I=1/2). These spins form a fluctuating magnetic bath → dominant dephasing. Isotopically enriched ²⁸Si (<100 ppm ²⁹Si) removes this bath, boosting T2* by 1–2 orders of magnitude.

**Strengths:**
- Tiny footprint: dots are tens of nm — in principle >10⁶ qubits/cm².
- CMOS-compatible fabrication → foundry leverage.
- Long coherence in purified ²⁸Si.
- Cryo-CMOS control can sit close on-chip.
- "Hot qubit" variants operate at 1+ K → less fridge power budget per qubit.

**Weaknesses:**
- Fabrication variability on nm scale → each dot's frequency differs; per-qubit tuning burden is heavy.
- Qubit frequency crowding in 2D arrays.
- Cross-talk between gate voltages (capacitive coupling between gates and neighboring dots).
- Scalable high-fidelity 2Q gates in large arrays still an active engineering problem.
- Charge-noise-induced dephasing through exchange and spin-orbit.
- Wiring bottleneck: one plunger + one barrier gate per dot, multiplexing required for scale.

**Electron vs hole qubits:**
| | Electron | Hole |
|---|---|---|
| g-factor | ~2 (Si), anisotropic | Strongly anisotropic, tunable |
| Spin-orbit | Weak (needs micromagnet) | Strong (intrinsic EDSR, no magnet) |
| Nuclear bath coupling | Hyperfine (²⁹Si) | Smaller (p-orbital at nucleus) |
| T2* (purified Si) | up to ms | μs – ms |

**When to use:**
Long-horizon bets on CMOS-foundry-scalable QPUs, especially where qubit density and classical-co-integration matter. Also a strong match for cryo-CMOS research.

**Rule of thumb:** Silicon spin qubits trade mature-foundry scaling and tiny footprint for per-dot calibration pain; isotope-purified ²⁸Si is non-negotiable if you want T2 to stop being the bottleneck.
