### E91 — Entanglement-Based QKD with Embedded Bell Test

**What it is:**
E91 (Ekert 1991) derives QKD security from **Bell-inequality violation** rather than from no-cloning of prepared states. A source (trusted or untrusted) distributes halves of entangled pairs to Alice and Bob; they measure in randomly chosen settings; correlated outcomes on matching settings form the raw key, while settings chosen to maximize CHSH certify that the shared state is genuinely entangled — and therefore that Eve holds negligible information.

**Setup:**
```
           ┌───────────────┐
Alice ◄─── │  EPR source   │ ───► Bob
           │  |Φ⁺⟩ per pair │
           └───────────────┘
   Alice angles {a₁, a₂, a₃}        Bob angles {b₁, b₂, b₃}
   (e.g. 0°, 45°, 22.5°)            (e.g. 22.5°, 67.5°, 45°)
```
Each party picks one of three measurement settings per pair. After many rounds, they publicly reveal settings (not outcomes) and split rounds into two groups:
- **Matching settings** (e.g. a₃ = b₃): perfectly anti-correlated outcomes form the raw key.
- **Mismatched settings**: used to compute CHSH statistic S.

**CHSH embedded:**
Pick four of the nine setting pairs to form S = E(a₁,b₁) − E(a₁,b₃) + E(a₃,b₁) + E(a₃,b₃). For the singlet:
```
|S| = 2√2 ≈ 2.828     (maximal quantum)
|S| ≤ 2                (any local hidden-variable / Eve classically preparing pairs)
```

**Protocol flow:**
```
1. Source distributes N entangled pairs.
2. Alice, Bob each pick a random setting per pair, measure, record.
3. Public basis reveal.
4. Matching-setting rounds → raw key (anti-correlation; Bob flips bit).
5. CHSH rounds → compute S. Abort if S < S_threshold.
6. Error correction + privacy amplification on raw key.
```

**Security intuition:**
```
S = 2√2   ⇒ state is (up to isometry) a Bell pair ⇒ Eve decoupled
S = 2     ⇒ classical correlations; no key possible
2 < S < 2√2 ⇒ partial entanglement; bound Eve's info via S
```
Monogamy of entanglement: if Alice-Bob violate CHSH, a third party cannot also be highly correlated with them.

**Key-rate bound (device-independent):**
```
R ≥ 1 − H₂(Q) − χ(S)
      Q = bit-error on matching bases
      χ(S) = Eve's max Holevo information given CHSH value S
           = H₂( (1 + √((S/2)² − 1)) / 2 )   for 2 ≤ S ≤ 2√2
```
At S = 2√2, χ = 0 (Eve learns nothing); at S = 2, χ = 1 (no key).

**E91 vs BB84:**
| Feature | BB84 | E91 |
|---|---|---|
| Resource | single photons, trusted source | entangled pairs |
| Security origin | no-cloning | Bell violation |
| Source trust | must trust Alice's device | source can be **untrusted** |
| Natural fit | point-to-point fiber | quantum networks, satellite |
| Device-independence | no | yes (full DIQKD variant) |
| Complexity | low | higher (EPR source, coincidence timing) |

**Device-independent variants:**
E91 is the ancestor of **DIQKD** (Mayers-Yao, Acín et al.) — security proven from the observed CHSH value alone, with **no assumptions on devices' internal workings**. Requires high detector efficiency (> ~82% loophole-free threshold) and is still challenging experimentally.

**Pitfalls:**
- **Detection loophole**: if detectors miss too many rounds, LHV models can fake a CHSH violation via post-selection. Need high-efficiency detectors (SNSPDs) and fair-sampling assumptions — or loophole-free Bell violation for true DI security.
- **Memory attacks**: Eve can hide correlations across rounds; modern proofs use entropy-accumulation theorems to handle sequential rounds.
- **Finite-statistics on S**: confidence intervals on S with N rounds shrink as ~1/√N; aborting too eagerly wastes key, too loosely leaks info.
- **Coincidence-window attacks**: Eve exploits timing-windows to post-select rounds that fake Bell violation.
- **Source placement**: for maximum security, put the source at an untrusted midpoint — don't let either Alice or Bob control it fully.

**Rule of thumb:** E91 replaces BB84's "trust your encoder" assumption with a Bell-test certificate — the CHSH value itself upper-bounds Eve's information; if S drops noticeably below 2√2, so does the extractable key.
