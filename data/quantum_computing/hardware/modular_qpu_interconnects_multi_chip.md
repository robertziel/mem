### Modular QPU Interconnects — Multi-Chip and Remote Entanglement

**What it is:** The set of hardware techniques that entangle qubits living on **separate substrates** — multiple SC dies on one carrier, multiple dilution fridges, or ion-trap modules connected by optical fiber. The goal is to scale past the reticle / wiring / fridge limit of a single-chip QPU by giving up a small amount of gate fidelity on the inter-chip edges in exchange for many more qubits.

**Why single-chip hits a wall:**
- **Reticle size:** photolithography reticles are ~ 3 × 3 cm. A heavy-hex chip at 1 mm pitch fits ~ 900 qubits max on a single die.
- **Wiring density:** dilution fridge admits ~400 coax lines (see cryogenic stack).
- **Yield:** defect rate per cm² → yield drops exponentially with die area.
- **Thermal:** single fridge MXC cooling is capped at ~ 20 μW.
Beyond a few thousand qubits, modular architectures are the only route.

**Interconnect categories:**

| Layer | Medium | Latency | Fidelity | Range |
|---|---|---|---|---|
| On-chip coupler | Direct capacitive / tunable coupler | ≤ 100 ns | 99.5–99.9% | mm |
| Chip-to-chip (same package) | Flip-chip bump / bump bond | 100–500 ns | 99–99.8% | ~ cm |
| Inter-module (same fridge) | Coaxial or superconducting waveguide | 0.1–1 μs | 98–99.5% | 10s cm |
| Inter-fridge (warm link) | Microwave-to-optical transducer + fiber | 10s of μs | 80–95% (heralded), much higher after distillation | km |
| Photonic remote | Photon pair + Bell measurement | ~ μs + photon loss | 50–99% (heralded) | km+ |

**Three scaling paths:**

**1. Multi-chip on one package (flip-chip / 3D integration):**
- One die has qubits, the other has routing / resonators / wiring.
- Bump bonds (Indium) at mK provide microwave connection between dies.
- Used in Google Sycamore (3D-integrated wiring), IBM (carrier with multiple small chips).
- Inter-die CZ gates exist; fidelity ~ 0.3% worse than intra-die.
- Limits: alignment (~ 1 μm), bump inductance, thermal expansion mismatch.

**2. Modular within one fridge (short-haul microwave interconnects):**
- Multiple chips in one fridge linked by superconducting coplanar waveguide (CPW) buses or transducers.
- Can implement **quantum state transfer** via pitch-catch protocols (emit photon, absorb photon).
- Photons lose < 0.1 dB/m in high-Q CPW; state transfer fidelity ~ 97% demoed.
- Useful for tens of thousands of qubits (split across many small high-yield dies).

**3. Remote entanglement (photonic links):**
- Used natively by trapped ions (Quantinuum, AWS ion module concepts): ions emit photons, photons travel via fiber to a midpoint Bell-state analyzer, success heralds an ion-ion Bell pair.
- For SC: microwave-to-optical transducer converts a cavity photon to a telecom photon. Conversion efficiency is the main challenge (< 10% today).
- Primary protocol: **Barrett-Kok / DLCZ-style heralded entanglement generation** → entanglement distillation → teleported gates.

**Barrett-Kok heralding (concept):**
```
Module A: |ψ⟩_A → emit photon entangled with atom_A
Module B: |ψ⟩_B → emit photon entangled with atom_B
Both photons → 50/50 beamsplitter + 2 detectors
One-click or two-click pattern heralds Bell pair between A, B
success rate ≈ η_transduce² · η_path · 1/2
```
Iterate until success; then use Bell pair + LOCC to teleport a 2Q gate.

**Gate fidelity budget for remote 2Q gate:**

| Step | Error |
|---|---|
| Bell pair generation | 1–5% |
| Distillation overhead | 2–10× Bell pairs per gate |
| Local 2Q fidelity | 0.1% |
| Classical communication delay | coherence loss ≈ τ_comm / T_2 |

**Trade-offs:**
- **Pro:** Unlocks arbitrary system size; each module can be individually yielded, tested, replaced.
- **Pro:** Matches ion-trap / photonic architectures which are natively modular.
- **Con:** Remote gate fidelity is 10–100× worse than local → limits algorithm to a few remote gates, or heavy distillation.
- **Con:** Latency: a remote gate in a QEC cycle can balloon cycle time → fewer cycles within T_2.
- **Con:** Classical infrastructure (timing, phase locking, sync) is substantial.

**Code-aware modularization:** Pick a QEC code whose graph aligns with module boundaries:
- qLDPC codes with bounded-weight checks → inter-module edges are few.
- Surface code crosses many edges → penalized by high-cost remote links.
- Bivariate-bicycle codes have been proposed specifically for modular layouts.

**When relevant:**
- Any QPU roadmap targeting ≥ 10,000 qubits.
- Ion-trap or neutral-atom systems where photonic interconnects are native.
- Architectures where reticle, yield, or wiring is the hard constraint — not coherence.

**Pitfalls:**
- Quoting "inter-chip fidelity" that ignores the heralding rate and distillation overhead.
- Designing an algorithm assuming uniform fidelity when remote edges are 100× worse.
- Ignoring phase stability across long fiber links → entanglement fidelity drifts over seconds.

**Rule of thumb:** A modular QPU's effective size is `N_modules × qubits_per_module × (1 − ε_remote × f_remote)` where `f_remote` is the fraction of gates crossing modules — keep `f_remote × ε_remote ≪ 1` through code choice, or modularity buys you counts without buying you depth.
