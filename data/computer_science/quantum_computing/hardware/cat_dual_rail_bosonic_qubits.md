### Bosonic Qubits — Cat, GKP, Binomial, and Dual-Rail Encodings

**What they are:** Logical qubits encoded in the infinite Hilbert space of a single bosonic mode (a harmonic oscillator — usually a superconducting 3D cavity or photonic mode) instead of in two levels of a discrete system. The mode's redundancy is used **intrinsically** as a first layer of error correction, so few physical resources can encode one logical qubit.

**Why bother:** Transmon → surface-code encodings need ≈ 1000 physical qubits for one logical qubit at 1e-12 logical error. A bosonic code can reach break-even (logical lifetime > physical lifetime) with **1 cavity + 1 ancilla transmon**. The bottleneck then shifts from qubit count to gate count and measurement speed.

**Encoding families:**

| Code | Logical states | Dominant-error bias | Break-even? |
|---|---|---|---|
| 2-component cat | `\|α⟩ ± \|−α⟩` | Biased: photon loss flips Z, rare X | Yes (Yale, Alice&Bob) |
| 4-component cat | 4 coherent states, even/odd photon parity | Corrects single photon loss | Yes |
| Binomial | Superposition in photon-number basis (e.g. 2-peak) | Corrects photon loss up to order N | Yes |
| GKP (grid state) | Superposition of shifted squeezed states on p/q grid | Corrects small displacements in phase space | Yes (ETH, Yale) |
| Dual-rail | `\|01⟩_{a,b}` vs `\|10⟩_{a,b}` — photon in one of two modes | Photon loss → erasure (heralded) | Protocol-dependent |

**Cat qubit — biased noise:** A 2-component cat `(|α⟩ + |−α⟩) / √2` with `|α|² ≳ 3` has exponentially suppressed X errors (bit-flips need `~|α|²` photons to hop). Z errors from photon loss remain linear. This noise bias (Z:X ≈ 1000:1) lets an outer repetition code in Z alone replace a full 2D surface code — fewer logical resources.

**GKP:** Logical `|0⟩_L = Σ_n |2n √π⟩`, `|1⟩_L = Σ_n |(2n+1)√π⟩` in position basis. Small displacements in phase space (from photon loss, dephasing) are detected and corrected modulo √π. Hard to prepare (requires large squeezing) but composes beautifully with CV Clifford gates.

**Dual-rail:** Encode one logical qubit in two modes with exactly one photon: `|0⟩_L = |10⟩`, `|1⟩_L = |01⟩`. The overwhelmingly likely error (photon loss → `|00⟩`) is **heralded** — you detect it perfectly by measuring total photon number. Dominant error becomes erasure, which has a threshold nearly 10× higher than depolarizing noise (≈ 50% vs 1%).

**Gate set and measurement:**
- Dispersive coupling between bosonic mode and a transmon ancilla is the workhorse. The ancilla implements non-linear ops (the cavity itself is linear).
- Universal gate set via SNAP (Selective Number-dependent Arbitrary Phase) + displacement.
- Measurement via photon-number-resolving readout of the ancilla → cavity Wigner tomography.
- ECD (Echoed Conditional Displacement) gates reach sub-microsecond times with GKP.

**Stabilization (keeping the code subspace):**
- Cat qubits are held in place by two-photon dissipation: an engineered loss channel that pumps any `|α|² ≠ |α_0|²` back to the coherent-state ring. Without this, `|α⟩` decays trivially to vacuum.
- GKP states need continuous small-displacement feedback ("sharpen-trim-sharpen" cycles) to counter accumulated drift from single-photon loss.
- Binomial codes need explicit QEC cycles (ancilla-parity checks + conditional corrections) at a rate faster than 1/T_cavity.

**Physical-to-logical accounting (rule-of-thumb calc):**
```
surface_code_per_logical ≈ (2d−1)²  physical qubits where d = code distance
  → d=7 ⇒ ~170 physical qubits (plus overhead)
bosonic_per_logical ≈ 1 cavity + 1 ancilla transmon + O(1) readout
  → ~3 physical components for a biased-noise logical qubit
savings factor at break-even ≈ 50×
```
The win shrinks as distance grows (concatenated cat + repetition still needs many cavities for very low logical error), but at `d ≈ 5–9` bosonic encodings are often 10–50× more hardware-efficient.

**Trade-offs:**
- **Pro:** ~1 physical mode per logical qubit; biased noise; hardware-efficient QEC "for free."
- **Pro:** Cavity lifetimes 1–10 ms (vs transmon 100 μs) → many more gate operations per coherence time.
- **Con:** Ancilla transmon is the error conduit. Ancilla decay during a gate causes uncorrectable cavity errors unless you use fault-tolerant pumping (e.g. biased ancilla or path-independent gates).
- **Con:** Two-logical-qubit gates are slow (10s of μs) and calibration-heavy.
- **Con:** Scaling past ~10 cavities on one chip is unproven — 3D cavities are bulky.

**When relevant:**
- Early-FT era: demonstrate a logical qubit with < 100 physical components.
- Erasure-dominated architectures (dual-rail) — aim for near-term ≤ 1e-4 per-gate erasure.
- Photonic quantum computing (dual-rail is the native encoding; all modes are photons).

**Pitfalls:**
- Confusing "cat state" (physics demo of `|α⟩ + |−α⟩`) with "cat qubit" (engineered stable dissipation keeping it in the code space).
- Ignoring ancilla back-action — most "break-even" results require careful ancilla design, not just a long-lived cavity.
- Phase-space rotation of `α` during gates acts like calibration drift on every gate — needs continuous tracking.
- Assuming a single cavity can replace a QEC stack: cats/GKP correct **displacement-like** errors, not coherent ancilla faults. The outer layer is still needed for full FT.
- Quoting dual-rail fidelity without the erasure rate: a 99.99% "gate fidelity" with 1% erasures behaves worse than a 99% gate with no erasures **only if** you can't herald and discard — most protocols can.

**Dual-rail vs cat vs GKP, short pick list:**
- **Dual-rail:** best when your dominant error is photon loss and you have low-loss detectors (e.g. SC microwave dual-rail or photonic).
- **Cat:** best when you can engineer two-photon dissipation and need Z-biased noise for a repetition-Z outer code.
- **GKP:** best when you need continuous-variable Clifford gates and have strong squeezing available (hardest to prepare, most versatile once ready).

**Rule of thumb:** Bosonic qubits trade qubit count for gate-design complexity and ancilla-induced errors; pick cats/GKP when you have one great cavity and a few weeks to calibrate, and dual-rail when photon loss is your dominant process and you can herald erasures cheaply.
