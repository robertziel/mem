### Quantum LDPC Codes and IBM's Lower-Overhead Approach

**What it is:** Quantum low-density parity-check (qLDPC) codes are stabilizer codes whose check operators all have bounded weight (like classical LDPC codes). Modern constructions — bicycle, hypergraph product, lifted product, balanced product, Tanner — achieve constant encoding rate (k/n = Θ(1)) and growing distance (d = Θ(√n) or better), dramatically lowering overhead vs surface code. The catch: non-planar connectivity.

**Why surface codes are expensive:**

For surface code, k = 1 and d ∝ √n, so n/k ∝ d² — polynomial qubits per logical. To reach p_L ~ 10^−12 for Shor-2048, estimates run to ~10^7 physical qubits per meaningful algorithm.

**qLDPC codes change the scaling:**

| Family | n, k, d | k/n (rate) | Connectivity |
|---|---|---|---|
| Surface code | [[d², 1, d]] | ~0 | planar, degree 4 |
| Bicycle (Kitaev 2002) | [[n, n/2 − O(1), O(√n)]] | 1/2 | bounded, non-planar |
| Hypergraph product | [[n, k, √n]] | Θ(1) | bounded degree |
| Lifted product (Panteleev–Kalachev 2022) | [[n, Θ(n), Θ(n)]] | Θ(1) | bounded, good codes! |
| Balanced product | good qLDPC | Θ(1) | long-range |
| IBM Gross code (BB code, 2024) | [[144, 12, 12]] | 1/12 | 6-regular, non-planar |

"Good" = rate and relative distance both Θ(n). Panteleev–Kalachev 2022 proved good quantum LDPC codes exist — a major theoretical milestone.

**IBM's Gross code (Bravyi, Cross, Gambetta, Maslov, Rall, Yoder, *Nature* 2024):**

- Called "bivariate bicycle (BB) code."
- [[144, 12, 12]] — 144 physical qubits encode 12 logical, distance 12.
- Weight-6 stabilizer checks (vs weight 4 for surface code — small trade).
- Equivalent code power to a surface code with 12·(12²) = 1728 physical qubits. **~12x reduction.**
- Requires connections beyond nearest-neighbor: each qubit connects to 6 others, some non-local.

Variants published: [[72, 12, 6]], [[108, 8, 10]], [[144, 12, 12]], [[288, 12, 18]].

**Algebraic structure (bivariate bicycle):**

Defined by two polynomials A(x, y), B(x, y) over F_2[x,y]/(x^ℓ − 1, y^m − 1). Stabilizers are:

H_X = [A | B], H_Z = [Bᵀ | Aᵀ]

CSS code from this recipe — simple to construct, hard to decode due to non-planar layout.

**Decoding challenges:**

- MWPM doesn't apply (no planar graph structure).
- Belief Propagation + Ordered Statistics Decoding (BP+OSD) is standard.
- Neural-network decoders (AlphaQubit-style) show promise.
- More compute per syndrome than surface code, but fewer syndromes per logical.

**Connectivity requirement:**

qLDPC codes need long-range connections. Three hardware paths:
1. **Reconfigurable (neutral atoms, QuEra/Atom Computing):** move qubits with optical tweezers → connect any pair. Natural fit for qLDPC.
2. **Photonic interconnects (IBM's 2024+ roadmap):** m-coupler + quantum communication between chips.
3. **Trapped-ion shuttling (Quantinuum):** ion chains reconfigure via transport.
4. **Fixed coupling with ancilla routing:** slower, surface-code-like overhead re-emerges.

**Logical gates on qLDPC:**

Active research area. Techniques:
- Generalized lattice surgery (Cohen, Kim, Bartlett, Brown 2022).
- Automorphism gates: some code automorphisms implement logical Cliffords.
- Code deformation and merges.
- Morphing circuits (IBM 2024).

Still: T gates need distillation, same as surface code.

**Overhead comparison at p_L = 10^−12 target:**

| Code | Physical per logical | Rounds per logical op |
|---|---|---|
| Surface (d≈27) | ~1500 | 1 round + surgery |
| Gross BB [[144,12,12]] | ~12 per logical (+ ancillas) | more complex syntax |

Total for Shor-2048: estimated ~250k–500k physical qubits with qLDPC vs ~10⁷ with surface (Bravyi et al. 2024).

**Experimental status (2026):**
- No qLDPC has yet been experimentally encoded at distance > 4 and compared head-to-head with surface.
- IBM has announced target to demonstrate Gross code on Loon/Condor-class devices with couplers.
- QuEra and Atom Computing preparing qLDPC demos on reconfigurable atom arrays.

**Rule of thumb:** qLDPC codes are the main hope for overhead reduction — expect ~10–100x fewer physical qubits than surface for the same protection, but only if your hardware has either long-range connectivity or reconfigurable qubits; without either, surface code still wins.
