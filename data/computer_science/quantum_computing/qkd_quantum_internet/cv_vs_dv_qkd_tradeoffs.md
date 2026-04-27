### CV-QKD vs DV-QKD — Continuous-Variable vs Discrete-Variable Trade-offs

**What it is:**
Discrete-variable QKD (DV-QKD) encodes bits in discrete properties of single photons — polarization, time-bin, phase — and measures with single-photon detectors. Continuous-variable QKD (CV-QKD) encodes in the **quadratures (X, P)** of a coherent or squeezed light field and measures with **homodyne/heterodyne detection**, using only off-the-shelf telecom components.

**DV encoding:**
```
bit 0, Z-basis: |H⟩ polarization (single photon)
bit 1, Z-basis: |V⟩
bit 0, X-basis: |D⟩ = (|H⟩+|V⟩)/√2
bit 1, X-basis: |A⟩
Detector: SPD (SNSPD, APD) — click / no-click
```

**CV encoding (Gaussian-modulated coherent states, GG02):**
```
draw (x, p) ~ N(0, V_mod·I₂)
send coherent state |α⟩ with α = (x + ip)/2
Bob: homodyne (measure X or P, random choice) or heterodyne (both)
```
Alice's data and Bob's measurement are **real numbers**; the shared "key" is their correlated Gaussian variables, quantized later.

**Hardware comparison:**
| Component | DV-QKD | CV-QKD |
|---|---|---|
| Source | attenuated laser / heralded SPDC | standard CW telecom laser |
| Modulation | polarization / phase / time-bin | IQ modulator (amplitude + phase) |
| Detector | SNSPD (cryogenic, ~$$$) / APD | shot-noise-limited homodyne (room temp) |
| LO (local oscillator) | not needed | **required** — phase-locked at Bob |
| Wavelength | any (often 1550 nm) | telecom C-band native |
| Integrability with classical DWDM | poor (filters, noise) | **good** |
| Cost of receiver | high | low (off-the-shelf PIN diodes) |

**Distance and rate:**
| Regime | DV (BB84 + decoy) | CV (GG02 / discrete-modulation) |
|---|---|---|
| Short (< 50 km fiber) | good rate | **higher rate** (MHz raw) |
| Medium (50–200 km) | good | rate drops steeply |
| Long (> 200 km) | best | typically impractical |
| Rate scaling with η | O(η) | O(η) but larger constants |
| Excess-noise tolerance | 11% QBER | **~1% of shot noise** (very strict) |
| Free-space / satellite | good (low background at IR) | hard (turbulence → phase noise) |

**Security proofs:**
- **DV**: mature. BB84 and decoy-state BB84 have composable finite-key proofs against general coherent attacks.
- **CV**: easier in the Gaussian/collective-attack regime (use Gaussian-optimality theorem). General attacks handled via de Finetti or entropic uncertainty. **Discrete-modulation CV-QKD** (QPSK, 8PSK) is closer to practical hardware; proofs improved substantially 2018–2023.

**CV key-rate (asymptotic, reverse reconciliation, collective attacks):**
```
K_CV = β · I(A:B) − χ(B:E)
     β            = reconciliation efficiency (0.9–0.98 typical)
     I(A:B)       = (1/2) log₂(1 + SNR)      mutual info Alice–Bob
     χ(B:E)       = Holevo bound on Eve given Bob's output
```

**Pitfalls:**
- **CV local oscillator** was historically transmitted with signal — **side-channel target** (LO-calibration attacks). Modern CV-QKD uses a **local local oscillator** (LLO), generated at Bob and phase-locked to Alice via pilot tones.
- **CV excess noise budget is brutal**: any 1% of extra noise can kill the key. Thermal drift, Raman scattering in co-propagating classical channels, imperfect phase locking all eat into the budget.
- **DV detector dark counts** dominate at long distance; SNSPDs are near-ideal but require cryogenics (~2 K).
- **CV reconciliation at low SNR** (long distances) requires very efficient codes (multi-edge LDPC) to reach β > 0.95.
- **CV-QKD in finite-key regime** needs huge block sizes (10⁹+ samples) to beat statistical penalties.

**When to pick what:**
```
Metro (< 80 km), cohabiting with DWDM classical traffic  → CV-QKD (telecom-native, cheap receiver)
Backbone (80–400 km)                                      → DV-QKD (BB84 + decoy)
Satellite / free-space / trans-continental                → DV-QKD (photon counting)
Detector-side-channel paranoia                            → MDI-QKD (DV)
Research demos, highest rate at 10 km                     → either, CV wins on cost
```

**Rule of thumb:** DV-QKD is the proven long-distance workhorse with simple quantum states and ugly (cryogenic, expensive) detectors; CV-QKD flips this — cheap room-temperature telecom hardware but an unforgiving noise budget that collapses past a few hundred km.
