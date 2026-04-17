### Quantum Memories — Atomic Ensembles, Rare-Earth Crystals, Trapped Atoms

**What it is:**
A quantum memory stores an incoming photonic qubit as a long-lived atomic coherence and re-emits it on demand with preserved amplitude and phase. It is the synchronisation element of a quantum network: entanglement generation across links is probabilistic, so successful Bell pairs must be buffered while partner links keep trying. Figures of merit are storage time τ, retrieval efficiency η, fidelity F, bandwidth B, multimode capacity M, and the product ητ·B·M.

**Memory platforms:**
| Platform | Typical τ | η peak | Bandwidth | Multimode | Notes |
|---|---|---|---|---|---|
| Rare-earth crystal (Eu:YSO, Pr:YSO) | s–hours (spin) | 40–70% | MHz | 100s (AFC comb) | Cryogenic; telecom mismatch |
| Warm alkali vapour (Rb, Cs) | µs–ms | 20–80% | GHz | few | Room temp; optical pumping |
| Cold atom ensemble (MOT) | ms–s | 80–90% | MHz | tens | DLCZ-native; lab-scale |
| Single trapped ion / atom | s–min | near 100% via cavity | MHz | 1 | Deterministic, slow |
| NV centre (diamond) | ms–s spin | — | MHz | 1 | Room temp; poor optical interface |

**Storage mechanisms:**
- **EIT (electromagnetically induced transparency)**: a control laser opens a transparency window; slowing and stopping the signal maps it onto a dark-state spin coherence.
- **AFC (atomic frequency comb)**: the absorption spectrum is tailored into a comb of spacing Δ; absorption at t = 0 rephases at t = 1/Δ → echo emission. Multimode: number of echoes fits inside the comb teeth.
- **Raman / off-resonant**: broadband store of a photon into a Λ-system ground-state coherence via a strong write/read pulse.
- **Cavity-enhanced single emitter**: a qubit (ion, NV, quantum dot) in a high-cooperativity cavity acts as a deterministic memory.

**AFC echo timing:**
```
  input photon
     │
     ▼
  ┌───────────┐ absorb           rephase at t = 1/Δ
  │ ░░│░░│░░│░░│ ──────────►   ─────── echo out ───────►
  └───────────┘
    comb spacing Δ
```
Spin-wave storage extends τ from 1/Δ (µs) to spin-coherence time (seconds) via an additional transfer pulse to the ground state.

**Trade-offs (the key tension):**
```
τ (storage time) ↑   ─── usually forces ───►   η (retrieval) ↓
                                                F (fidelity) ↓
B (bandwidth)  ↑   ─── usually forces ───►   M (multimode) ↓
```
- Long τ comes from ground-state spin coherences, but transfer and re-readout cost efficiency.
- Broadband memory (GHz) matches single-photon sources but shrinks per-tooth absorption depth → lower η.
- Multimode capacity scales with ΔT·B for AFC but needs cold, well-shielded crystals.

**Required numbers for a repeater:**
For an elementary link of length L₀, the herald round-trip is τ_min = 2L₀/c. For L₀ = 100 km, τ_min = 1 ms. With multiplexing M modes in parallel, required storage is ~ τ_min / (p·M). Fidelity loss during τ must stay below what distillation can compensate.

**Figures of merit — orders of magnitude:**
```
Time-bandwidth product     TB = τ · B   (raw capacity)
Efficiency-time product    ητ           (for networking)
Memory-assisted gain       g = ητ · R_success   vs no memory
```

**Pitfalls:**
- **Telecom mismatch**: most rare-earth absorption is at 580–980 nm; fibre wants 1550 nm. Needs quantum frequency conversion (adds loss and noise).
- **Read noise floor** (spontaneous emission from control beams) masks single-photon retrieval.
- **Inhomogeneous broadening**: long coherence requires narrowing or tailoring the line; crystal growers matter more than network engineers here.
- **Duty cycle**: preparing an AFC comb or optical pumping takes seconds; not all of that is storage time — specify separately.
- **Polarisation preservation** through birefringent crystals needs careful geometry or dual-path schemes.

**Rule of thumb:** A quantum memory buys a network heralded round-trip's worth of patience — for 100 km links that means ~ms storage at ~80% retrieval and fidelity preserved above the distillation threshold; rare-earth crystals dominate for long τ and many modes, cold atoms for high η, trapped single emitters for deterministic on-demand access.
