### PLOB Bound — Ultimate Repeaterless Secret-Key Rate

**What it is:**
The Pirandola–Laurenza–Ottaviani–Banchi (PLOB) bound (2017) is the fundamental upper limit on the secret-key rate achievable over a point-to-point lossy bosonic channel without quantum repeaters. Over a channel of transmittance T (fraction of photons that survive), no QKD protocol — known or unknown — can exceed:

```
R_PLOB  ≤  − log₂(1 − T)     secret key bits per channel use
```

In the high-loss limit T ≪ 1 this simplifies to R ≤ T / ln 2 ≈ 1.44 T. Secret-key rate therefore scales **linearly** with channel transmittance, which is exponential in fibre length — identifying a hard wall that only repeaters (or satellites, or twin-field tricks) can break.

**Why it exists:**
Any QKD protocol over a lossy channel can be bounded by the two-way assisted quantum capacity of that channel. For the pure-loss bosonic channel (fibre at the shot-noise level), PLOB solved this capacity exactly using the "teleportation simulation" technique: the channel's action can be absorbed into the resource state, and its relative entropy of entanglement gives the tight upper bound −log₂(1−T).

**Numerical implication for fibre (α = 0.2 dB/km):**
```
Transmittance  T = 10^(−αL/10)
Max rate       R_PLOB ≈ 1.44 · T   (high loss)

 L (km) |   T       |  R_PLOB (bits/use)
 ------+-----------+-------------------
  50    | 0.10       | 1.5 × 10⁻¹
 100    | 10⁻²       | 1.4 × 10⁻²
 200    | 10⁻⁴       | 1.4 × 10⁻⁴
 300    | 10⁻⁶       | 1.4 × 10⁻⁶
 500    | 10⁻¹⁰      | 1.4 × 10⁻¹⁰
 800    | 10⁻¹⁶      | below dark-count floor
```
At a 1 GHz source, 500 km fibre gives ≤ ~0.1 bit/s of secret key — below the bit-error correction overhead in any real system. The practical end of repeaterless QKD over standard single-mode fibre is around **500 km**, set by the PLOB rate falling under detector dark counts (10⁻⁸–10⁻⁶ per gate).

**Where it sits among bounds (tighter → looser):**
```
R_sec (actual protocol)  ≤  R_PLOB (repeaterless upper)  ≤  R_rep-assisted
                     ↑                                            ↑
             BB84 + decoy + finite-size        only achievable with repeaters
```
Above PLOB implies repeaters (or equivalent — e.g. twin-field QKD approaches √T scaling, exceeding PLOB at long distance).

**Twin-field QKD (2018) — what breaks PLOB without a full repeater:**
```
R_TF  ~  √T      (square-root scaling via single-photon interference at a central node)
```
The central node is untrusted (measures), which is why this doesn't contradict PLOB: TF-QKD effectively halves the distance each photon traverses. Records ≈ 500–830 km experimental over fibre.

**PLOB says about MDI-QKD:**
MDI-QKD is still bounded by PLOB for the two end-to-node segments. No violation — the untrusted relay is not a repeater, just a measurement device.

**Repeaterless ceiling — rule-of-thumb boundaries:**
| Link type | Typical loss α | ~500 km PLOB floor | Practical limit |
|---|---|---|---|
| Telecom fibre (1550 nm) | 0.2 dB/km | 10⁻¹⁰ | ~500 km |
| Ultra-low-loss fibre | 0.14 dB/km | 10⁻⁷ | ~700 km |
| Free-space vacuum (LEO down) | geometric + 3 dB atm | 10⁻³–10⁻⁴ at 1000 km | satellite-regime |

**Pitfalls:**
- **Unit confusion**: R_PLOB is bits per channel use, not per second. Multiply by source rate (e.g. 1 GHz) to get bits/s.
- **Assumes ideal source + detectors**: real rates sit 10–100× below PLOB; claiming "we hit PLOB" usually means within a small constant factor.
- **Only the pure-loss channel**: thermal background (daylight free-space, fibre Raman) tightens the bound further.
- **Doesn't apply to repeatered networks**: a chain of PLOB-limited links plus entanglement swapping is *not* PLOB-bounded — that's the whole point of building repeaters.
- **"Beating PLOB"** in headlines almost always means twin-field or measurement-device-independent scaling with an untrusted central node, not a magical new limit.

**Rule of thumb:** Without quantum repeaters, the secret-key rate per channel use can never exceed −log₂(1−T) ≈ 1.44 T, so fibre QKD dies around 500 km at 0.2 dB/km; anything that scales better — satellite, twin-field, full repeaters — changes the *channel*, not the bound.
