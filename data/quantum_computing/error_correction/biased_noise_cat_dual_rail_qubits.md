### Biased-Noise Qubits — Cat States and Dual-Rail Encodings

**What it is:** A family of physical-qubit designs where one type of error (typically bit-flip `X`) is exponentially suppressed by construction, leaving only the other (`Z` or leakage) to correct. Result: simpler, smaller QEC codes on top, because you're protecting a *biased* noise channel, not a symmetric one. Variants: cat qubits (Alice & Bob, Amazon), dual-rail qubits (QCI, AWS Ocelot), biased-noise Kerr-cat oscillators.

**Why it matters:** Standard surface codes assume symmetric depolarizing noise and pay for it. If the underlying hardware has, say, `10^{-6}` bit-flip rate but `10^{-3}` phase-flip rate, you can use an asymmetric / tailored code (XZZX or repetition code) with **drastically reduced overhead**. Threshold for asymmetric surface codes against phase-biased noise rises to ~5%.

**Cat qubits (bosonic):**
- Logical states: `|0_L⟩ = |α⟩ + |-α⟩` and `|1_L⟩ = |α⟩ - |-α⟩` — two-photon-pumped coherent-state superpositions in a microwave cavity.
- Bit-flip rate (`X`): exponentially suppressed in `|α|²` (photon number); measured `<10^{-7}` at `|α|² ≈ 10`.
- Phase-flip rate (`Z`): linear in `|α|²` × single-photon loss — the dominant error.
- → Use a **repetition code** (only Z-type checks needed) for logical FT.

**Bloch-like representation (ASCII):**
```
        |0_L⟩ = |α⟩ + |-α⟩
               •  <-- Z axis (phase flips, main error)
              /|
             / |
            /  |      X errors:
           /   |      exponentially suppressed
          /    |      in |α|² (need 2n photon events)
         /     |
        •──────•── Y
       / \    /
      /   \  /
     •     \•     |1_L⟩ = |α⟩ - |-α⟩
     -X      X
```

**Dual-rail qubits:**
- Logical qubit encoded across **two** physical modes (two transmons, or two cavity modes): `|0_L⟩ = |01⟩`, `|1_L⟩ = |10⟩`.
- Photon loss → state becomes `|00⟩` ("erasure") — **detectable** at any time, converting an uncorrelated amplitude-damping error into an *erasure* error with known location.
- Erasure codes have **dramatically higher thresholds** (~25% for surface code under erasure vs ~1% under depolarizing).

**Physical error vs protected error:**

| Platform | Raw physical error | Protected (logical gate) error |
|---|---|---|
| Transmon (symmetric depolarizing) | `p ~ 10⁻³` | needs `d=20+` surface code |
| Cat qubit (biased) | `p_X ~ 10⁻⁷, p_Z ~ 10⁻³` | repetition code `d~15` sufficient |
| Dual-rail (erasure) | `p_erase ~ 10⁻³`, `p_Pauli ~ 10⁻⁴` | surface code `d~9` sufficient |

Fewer physical qubits → fewer logical.

**Why fewer physical → logical:**
- Cat: only need 1D repetition code (O(d) qubits) instead of 2D surface code (O(d²) qubits).
- Dual-rail: erasure threshold 20–25% → ~2× smaller d at same `P_L` → ~4× fewer physical qubits.

**Experimental landmarks (2023–2026):**

| System | Year | Key result |
|---|---|---|
| Alice & Bob cat qubit | 2024 | Bit-flip time ~10s with `|α|²=6` |
| AWS Ocelot (dual-rail) | 2024 | Erasure detection demonstrated on superconducting circuits |
| QCI dual-rail | 2023 | Logical qubit with erasure conversion |
| Yale cat + repetition | 2023 | Logical below-threshold under biased noise |

**Pitfalls:**
- Two-qubit gates between biased qubits must *preserve* the bias — naïve CNOTs can reintroduce symmetric noise, eliminating the advantage. ZZ-biased gates and bias-preserving CX protocols are active research.
- Leakage (photon-number escape, non-computational states in dual-rail) is a distinct error channel — dual-rail qubits actually *convert* it to benign erasure, but cat qubits need leakage-reduction units.
- Biased-noise codes rely on the bias **staying biased** through the whole computation; small gate-induced X-flip floors set an ultimate limit on circuit depth.

**Rule of thumb:** Biased-noise encodings change the economics of fault tolerance — if your hardware offers `10^3` bias or better, 1D repetition codes beat 2D surface codes in both qubit count and threshold. Dual-rail's erasure bonus is a free ~2× distance reduction with zero engineering cost beyond encoding choice.
