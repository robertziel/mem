### MDI-QKD and Twin-Field QKD — Closing Detector Side-Channels and Beating the Linear Bound

**What they are:**
Measurement-Device-Independent QKD (MDI-QKD; Lo-Curty-Qi 2012) removes **all** detector side-channels by outsourcing measurements to an **untrusted** relay — Eve can operate the detectors herself and learn nothing about the key. Twin-Field QKD (TF-QKD; Lucamarini et al. 2018) extends this idea with single-photon interference so the key rate scales as **O(√η)** instead of O(η), breaking the repeaterless PLOB/TGW bound.

**Why detectors matter:** Real detectors have exploitable flaws — blinding attacks, time-shift, efficiency mismatch, after-gating, dead-time correlations. Standard BB84 security proofs assume ideal detectors; a clever Eve at Bob's receiver can extract the key without touching the QBER.

**MDI-QKD protocol:**
```
Alice ──► [WCP: |αⱼ⟩ in BB84 state]                           ┌──────┐
                                          ──►  untrusted  ──► │ BSM  │  ──► publish result
Bob   ──► [WCP: |βⱼ⟩ in BB84 state]               relay       │Charlie│       (success / pattern)
                                          ──►  (Charlie)  ──► └──────┘
```
Alice and Bob both prepare decoy-state BB84 pulses and send them to a central relay **Charlie** who performs a **Bell-state measurement (BSM)** on incoming pulses and publishes which Bell state he detected (or failure). Successful BSM projects Alice's and Bob's encoded bits into a correlated pair; matching bases → raw key.

**Key property:** Charlie's output is **public**. Even if Eve IS Charlie, she cannot learn the key — the BSM outcome alone reveals at most parity info that basis-announcement already accounts for. All detector attacks become moot.

**Twin-Field QKD — single-photon interference:**
```
Alice ──► phase-randomized pulse ─┐
                                   ├─► BS at midpoint ─► D0, D1 single-photon detectors
Bob   ──► phase-randomized pulse ─┘
```
Alice and Bob encode a bit in the **phase** of a weak coherent pulse; the two pulses interfere at a balanced beamsplitter at the midpoint. A detector click reveals the **relative phase** (0 or π). Only one photon need survive to the midpoint — the key rate scales with single-photon transmittance √η per arm, not the end-to-end η².

**Key-rate scaling:**
| Protocol | Scaling | Max practical distance (fiber) |
|---|---|---|
| BB84 (decoy) | O(η) | ~300–400 km |
| MDI-QKD (decoy) | O(η) | ~400 km (cleaner side-channels) |
| **PLOB bound** (repeaterless) | ≤ −log₂(1−η) ≈ η/ln 2 | — |
| TF-QKD | **O(√η)** | 600–1000 km |

TF-QKD is the only QKD protocol demonstrated to **beat the PLOB bound** without a full quantum repeater.

**Asymptotic key rate (MDI-QKD, Z basis, decoy):**
```
R_MDI ≥ P^{11}_Z · Y^{11}_Z · [1 − H₂(e^{11}_X)] − Q^{rect}_Z · f · H₂(E_Z)
        Y^{11}   = yield when both Alice and Bob emit exactly 1 photon
        e^{11}_X = single-pair phase-error rate, bounded via decoy statistics
```
The two-photon yield Y^{11} (and error e^{11}) are bounded with a **four-intensity decoy** scheme on Alice's and Bob's independent sources.

**Comparison:**
| Aspect | BB84 | MDI-QKD | TF-QKD |
|---|---|---|---|
| Trust in detector | required | **none** | **none** |
| Trust in source | yes | yes | yes |
| Rate scaling | O(η) | O(η) | O(√η) |
| Central node | N/A | untrusted BSM | untrusted interferometer |
| Synchronization difficulty | low | medium | **high** (optical phase stability over long fiber) |
| Deployment complexity | baseline | medium | high |
| Breaks PLOB? | no | no | **yes** |

**Pitfalls:**
- **MDI-QKD needs two-photon interference** at Charlie → Alice and Bob must match arrival time (~ps), frequency, polarization, and pulse shape. Any mismatch drops the HOM visibility and the key rate.
- **Decoy states still required** for both MDI-QKD and TF-QKD since sources are still WCPs.
- **TF-QKD phase stability**: differential phase between Alice and Bob's arms must be stable to ≪ λ over the full fiber length; requires active phase tracking and strong reference pulses.
- **TF-QKD needs more delicate security proofs** — early variants (PM-QKD, SNS-TF-QKD, NPP-TF-QKD) differ in how they handle phase randomization and decoy intensities.
- **MDI-QKD does NOT make the source device-independent** — Alice's and Bob's encoders are still trusted.

**Rule of thumb:** Use MDI-QKD when detector side-channels are the threat you care about; use TF-QKD when distance is — it's the only protocol that beats the repeaterless linear-key bound, at the cost of much tighter optical-phase engineering.
