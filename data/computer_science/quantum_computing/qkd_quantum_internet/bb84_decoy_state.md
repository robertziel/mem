### BB84 with Decoy States — The Workhorse QKD Protocol

**What it is:**
BB84 (Bennett-Brassard, 1984) is the first and most widely deployed QKD protocol. Alice encodes random bits in randomly chosen non-orthogonal bases; Bob measures in random bases; they publicly sift mismatched rounds and bound Eve's information from the residual bit-error rate. The **decoy-state** extension (Hwang 2003; Lo-Ma-Chen, Wang 2005) rescues BB84 when Alice uses weak coherent pulses instead of true single photons — it defeats the photon-number-splitting (PNS) attack.

**Encoding (4 states, 2 bases):**
```
Z-basis (rectilinear):  |0⟩      |1⟩
X-basis (diagonal):     |+⟩      |−⟩
```
Any two states from different bases are mutually unbiased: |⟨0|+⟩|² = 1/2.

**Protocol flow:**
```
Alice                               Bob
─────                               ───
pick bit b, basis β  ──► |ψ⟩ ──►    measure in random basis β'
                                    record outcome b'
        ◄──── public basis announcement ────►
                     sift: keep rounds with β = β'
        ◄──── reveal random subset for QBER ──►
                error correction (reconciliation)
                privacy amplification
                         ↓
                    final secret key
```

**Security intuition:** By no-cloning, Eve cannot copy a non-orthogonal state. Any intercept-resend attack disturbs half the sifted bits with 25% probability — producing a QBER she cannot hide.

**Key-rate (asymptotic, infinite-key limit):**
```
R ≥ q · [ 1 − H₂(e_ph) − f · H₂(e_b) ]
  q   = sift factor (≈ 1/2 for BB84)
  e_b = bit-error rate in Z-basis
  e_ph = phase-error rate (bounded from X-basis statistics)
  f   ≥ 1 = reconciliation inefficiency
  H₂  = binary entropy
```

**Why decoy states?** Real sources emit weak coherent pulses (WCP) with Poissonian photon number. Multi-photon pulses leak copies to Eve: she **splits off one photon, stores it, and measures after basis disclosure** — the PNS attack. Without countermeasures, Eve learns all multi-photon bits undetected, forcing Alice to assume the worst and lowering the key rate to O(η²) where η is channel transmittance.

**Decoy-state trick:** Alice randomly switches pulse intensity μ ∈ {signal μ_s, decoy μ_d, vacuum μ_0} per pulse. After transmission, she announces which pulses were which. Yield Y_n and error e_n for n-photon pulses must be **identical across intensities** (Eve can't tell them apart at the photon level). Solving the linear system of observed gains Q_μ = Σ (μⁿ e⁻μ / n!) Y_n across multiple μ yields tight lower bounds on the single-photon yield Y_1 and error e_1.

**Effect on key rate:**
| Source assumption | Scaling in transmittance η |
|---|---|
| True single photon | O(η) |
| WCP, no decoy (GLLP worst-case) | O(η²) |
| WCP + decoy states | O(η) — matches single-photon |

**Pitfalls:**
- **Phase randomization** of each pulse is mandatory — otherwise Eve can exploit coherence between pulses.
- **Finite-key effects**: with N sifted bits, bounds on e_1, Y_1 have statistical corrections ~ O(1/√N). Real deployments use Chernoff/Hoeffding tail bounds.
- **Detector side-channels** (blinding, time-shift, efficiency mismatch) are NOT addressed by decoy states — see MDI-QKD.
- **Intensity fluctuations** in Alice's source leak distinguishability; modern security proofs account for bounded intensity noise.
- **Basis-choice bias**: if Pr[Z] ≠ 1/2, Eve can bias her attack; most modern proofs allow asymmetric bases but require calibration.

**Typical parameters:**
```
μ_s ≈ 0.5 photons/pulse   (signal)
μ_d ≈ 0.1                 (decoy)
μ_0 = 0                   (vacuum)
QBER threshold ≈ 11%      (above this, no key possible in BB84)
```

**Rule of thumb:** BB84 plus three-intensity decoy states is the default QKD protocol; decoys turn a leaky Poissonian source into an effectively single-photon one, restoring the linear O(η) key-rate scaling and closing the PNS loophole without changing hardware.
