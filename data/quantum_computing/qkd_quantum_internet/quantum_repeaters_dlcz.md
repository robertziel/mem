### Quantum Repeaters — DLCZ and First-Generation Chains

**What it is:**
Classical optical repeaters amplify a signal. Quantum repeaters cannot — no-cloning forbids copy-and-amplify. Instead they distribute entanglement across short elementary links, purify it, and stitch links together by entanglement swapping. The DLCZ scheme (Duan–Lukin–Cirac–Zoller, 2001) is the canonical first-generation blueprint: probabilistic entanglement generation between atomic-ensemble memories via single-photon heralding, chained by Bell measurements at intermediate nodes.

**Why repeaters at all:**
Fibre loss is exponential: transmittance T = 10^(−αL/10), with α ≈ 0.2 dB/km at 1550 nm. Direct transmission of a single photon over 1000 km implies T ≈ 10^(−20); no detector reaches such rates. Amplifiers would clone the quantum state. Repeaters break the distance L into n links of length L₀ = L/n so each link's loss is manageable, then entanglement-swap to connect endpoints.

**DLCZ elementary link (one segment):**
```
  Node A                                       Node B
  (ensemble)                                   (ensemble)
     │                                             │
     │  weak write pulse               weak write │
     │─────────► Stokes photon | Stokes photon ◄──│
                       ╲             ╱
                        ╲           ╱
                         ╲ 50/50 BS╱
                          ╲       ╱
                           ╲     ╱
                          ┌─┴───┴─┐
                          │  D₁  D₂│   ← which-path erasure
                          └───────┘
                               │
                        one click → heralds |Ψ±⟩ between A,B
```
Each ensemble emits a single Stokes photon with small probability p. A beam splitter erases which-path information. A single detector click heralds one collective excitation shared between A and B — an entangled spin-wave Bell state. Success per attempt ≈ p·η (η = link transmittance).

**Chain of n links → end-to-end entanglement:**
```
A ═══ R₁ ═══ R₂ ═══ ... ═══ R_{n-1} ═══ B
 L₀    L₀    L₀    ...    L₀     L₀

Step 1: Generate elementary entanglement on each segment (probabilistic).
Step 2: At R_k, Bell-measure the two local qubits → swaps entanglement outward.
Step 3: After n−1 swaps, A and B share one Bell pair over distance L = n·L₀.
```

**Rate scaling (first-generation, no multiplexing):**
```
R_DLCZ  ~  (p η)^? · (1/τ_classical) · ½^(n−1)
```
Heuristic: waiting for all n links to succeed simultaneously scales polynomially in L rather than exponentially — the core win over direct fibre — but the ½^(n−1) from probabilistic swaps and the classical heralding round-trip τ ≈ 2L₀/c sharply limit throughput. Memories must hold coherence for at least τ, preferably much longer so that successful links can "wait" for unsuccessful ones.

**Repeater generations:**
| Gen | Entanglement gen | Error handling | Memory need |
|---|---|---|---|
| 1 (DLCZ-like) | Heralded, probabilistic | Purification (distillation) | Long coherence, high |
| 2 | Heralded + near-deterministic | Quantum error correction on encoded qubits | Moderate |
| 3 | One-way, encoded photon trains | Full QEC per hop | Minimal; speed-of-light limited |

**Pitfalls:**
- **Memory decoherence** during the round-trip heralding kills rates; need T₂ ≫ 2L₀/c.
- **Multi-photon events** from DLCZ's probabilistic emission degrade fidelity; keep p small (trade rate for fidelity).
- **Detector dark counts** fake a herald → vacuum contamination in the spin wave.
- **Swap success probability** is 50% for linear-optics Bell measurement — another factor per stitch.
- **Real hardware** still needs distillation between swaps (generation 1.5).
- **Phase stability** of the interferometric write path must be maintained over kilometres — DLCZ's single-photon interference is finicky; two-photon (Barrett-Kok) variants trade rate for robustness.

**Rule of thumb:** A first-generation DLCZ repeater turns exponential fibre loss into polynomial scaling by breaking the channel into heralded elementary links and gluing them with entanglement swapping; the price is probabilistic operation, long-lived memories, and classical round-trips that cap throughput at kHz-scale over continental distances.
