### Decoy-State Parameter Estimation — Bounding Y_1 and e_1

**What it is:**
The decoy-state method turns a leaky Poissonian source (weak coherent pulses, WCP) into an effectively single-photon source for security analysis. By **randomly varying the intensity μ** pulse-by-pulse and comparing observed gains and error rates across intensities, Alice and Bob compute tight bounds on the **single-photon yield Y_1** and **single-photon error rate e_1** — the only numbers the key-rate formula actually needs.

**The PNS problem:**
A WCP with mean μ photons emits n-photon pulses with probability
```
P(n | μ) = μⁿ e⁻μ / n!
```
Multi-photon (n ≥ 2) pulses let Eve **split off a photon** and store it. Without decoys, Alice must attribute **all** detections to multi-photon pulses (GLLP worst case) → key rate scales as O(η²) rather than O(η).

**Decoy-state observables:**
Let Y_n = probability a detection occurs at Bob conditioned on n photons emitted (channel yield; independent of μ by Eve-assumption that she can't see μ directly). Let e_n = bit-error rate for n-photon pulses. Then the observed gain Q_μ and error rate E_μ satisfy:
```
Q_μ     = Σ_{n=0}^∞  (μⁿ e⁻μ / n!) · Y_n
Q_μ E_μ = Σ_{n=0}^∞  (μⁿ e⁻μ / n!) · Y_n · e_n
```
Alice runs three intensities — signal μ, decoy ν, vacuum 0 — and solves the resulting **linear system** for Y_0, Y_1, e_1.

**Protocol flow:**
```
per pulse:  pick intensity μ ∈ {μ_s, μ_d, 0} with prob {p_s, p_d, p_0}
            emit |√μ e^{iφ}⟩ with random phase φ
            encode BB84 bit + basis
            ─── channel ───►
            Bob measures, records
after session:
  announce intensities, sift, compute Q_{μ_s}, E_{μ_s}, Q_{μ_d}, E_{μ_d}, Q_0, E_0
  solve decoy bounds → Y_1^L, e_1^U
  compute key rate using single-photon statistics only
```

**Three-intensity bounds (asymptotic):**
```
Y_0 ≥ max(0, Q_0)                             from vacuum pulses
Y_1 ≥ (μ_s / (μ_s ν - ν²)) · [ Q_ν e^ν − Q_{μ_s} e^{μ_s} (ν²/μ_s²) − (μ_s² − ν²)/μ_s²  · Y_0 ]
e_1 ≤ (E_ν Q_ν e^ν − e_0 Y_0) / (Y_1 ν)        upper bound on 1-photon error
```
(exact forms vary by proof — Lo-Ma-Chen 2005, Wang 2005, Ma et al. 2005)

**Key rate using decoy bounds (GLLP formula):**
```
R ≥ q · { −Q_μ f(E_μ) H₂(E_μ) + Q_1 · [1 − H₂(e_1)] }
    Q_1 = μ e⁻μ · Y_1          single-photon gain
    f(E_μ) ≥ 1                 reconciliation inefficiency
    q ≈ 1/2 (BB84 sift)
```

**Asymptotic vs finite-key:**
| Regime | Assumptions | Bound tightness |
|---|---|---|
| Asymptotic (N → ∞) | law of large numbers | Q_μ, E_μ treated as true expectations |
| Finite-key (N < ∞) | Chernoff/Hoeffding concentration | replace Q_μ with Q_μ ± δ(N, ε) |

Finite-key correction shrinks usable key by O(√(log(1/ε)/N)). For ε_sec = 10⁻¹⁰ security, need N ≳ 10⁷ sifted bits to see meaningful rate.

**Typical finite-key key-rate formula:**
```
ℓ ≤ s_Z,0 + s_Z,1 [1 − h(φ_Z^U)] − leak_EC − 6 log₂(19/ε_sec) − log₂(2/ε_cor)
    s_Z,n      = lower bound on n-photon events in Z basis
    φ_Z^U      = upper bound on phase-error rate
    leak_EC    = bits leaked during reconciliation
```

**Pitfalls:**
- **Phase randomization is mandatory** between pulses. Without it, Eve can distinguish intensities by optical coherence and the decoy argument fails.
- **Finite number of intensities**: two-intensity decoy gives weaker bounds than three; practical systems use 3 (vacuum + weak + signal) and rarely more.
- **Intensity fluctuations** at Alice: if real intensity differs from announced, Eve exploits the mismatch. Modern proofs bound Y_1 with interval-valued intensities.
- **Statistical fluctuation** on Q_0 (vacuum) is often dominant because p_0 is small — increase p_0 or pool with decoy estimates.
- **Optimizing (μ_s, μ_d, p_s, p_d)** per channel length is essential; wrong choice can drop rate by 10×.

**Rule of thumb:** Decoy states are a statistical trick, not a hardware change — by randomizing intensities and solving a small linear system on observed gains, you extract tight bounds on single-photon statistics and recover linear-in-η key scaling without ever needing a real single-photon source.
