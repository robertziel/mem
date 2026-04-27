### Entanglement Distillation — Purification Protocols and Yield

**What it is:**
A family of protocols that take N copies of a noisy, low-fidelity mixed state ρ (approximating a Bell pair) and, using only local operations and classical communication (LOCC), distill K < N copies of higher-fidelity near-Bell pairs. Introduced by Bennett, Brassard, Popescu, Schumacher, Smolin, Wootters (BBPSSW, 1996) and extended by Deutsch et al. Essential middle layer between noisy physical entanglement generation and useful quantum-network protocols (teleportation, QKD, distributed QEC).

**Why it's needed:**
Entanglement generated over fibre, through repeaters, or across a satellite link is never perfect: depolarising noise, dephasing, imperfect Bell measurements, and photon loss all drag fidelity F = ⟨Φ⁺|ρ|Φ⁺⟩ below 1. Swapping noisy pairs compounds the error. Distillation refreshes fidelity before the next swap.

**BBPSSW (recurrence) protocol — two-to-one:**
```
Alice                               Bob
  ρ₁ ──•────M═══════════════════╗   ρ₁ ──•────M═══════════════════╗
       │                        ║        │                        ║
  ρ₂ ──⊕                        ║   ρ₂ ──⊕                        ║
                                ╠═ compare classical ═══════════╣
                                         ║                        ║
                                keep ρ₁ if outcomes agree; else discard
```
Inputs: two copies of ρ (both Werner-like with fidelity F).
Step 1 (both sides): CNOT with ρ₁ as control, ρ₂ as target.
Step 2: measure ρ₂ in Z on each side.
Step 3: compare outcomes over classical channel. If they agree, keep ρ₁ — its fidelity F' > F provided F > ½. Otherwise discard both pairs.

**Fidelity recursion (Werner input):**
```
F' =  (F² + ((1−F)/3)²)
      ─────────────────────────────
      F² + 2 F (1−F)/3 + 5 ((1−F)/3)²
```
- Fixed point at F = 1 (perfect) and F = ¼ (maximally mixed) and unstable fixed point at F = ½.
- Threshold: F > ½ is required. Below that, no LOCC protocol can distill (bound entanglement).
- Success probability per round ≈ F² + 2F(1−F)/3 + 5((1−F)/3)². Each successful round consumes 2 pairs, outputs 1.

**Yield — pairs out / pairs in:**
| Input F | Rounds to F ≥ 0.99 | Yield K/N (rough) |
|---|---|---|
| 0.95 | 1–2 | ~0.35 |
| 0.85 | 3 | ~0.08 |
| 0.70 | 5 | ~0.02 |
| 0.55 | 8+ | <0.003 |
Each round halves the count and keeps only successes: K/N ≈ Π p_success, r / 2^r.

**Families:**
| Protocol | Input | Classical | Notes |
|---|---|---|---|
| BBPSSW (recurrence) | Werner | Parity compare | Simple; asymmetric fidelity growth |
| Deutsch et al. | General | With Bx/By rotations | Twirls off-diagonal terms, faster convergence |
| DEJMPS | Werner | Same as BBPSSW + local rotations | Higher yield in practice |
| Hashing / breeding | Block of N | Syndrome of stabiliser code | Asymptotic rate → distillable entanglement E_D(ρ) |

**Asymptotic limit — distillable entanglement:**
For ρ with fidelity F to |Φ⁺⟩ above ½, the optimal asymptotic yield is bounded by the distillable entanglement E_D(ρ), lower-bounded by the coherent information I_c(ρ). For Werner states E_D ≥ 1 − h(F) − (1−F) log₂ 3 (hashing bound), where h is binary entropy.

**Pitfalls:**
- **Operations must be near-perfect** — noisy CNOTs limit the achievable fidelity floor (below 1).
- **Classical communication** adds latency; memories must live through at least one round-trip.
- **Probabilistic** — large input buffers needed to guarantee K outputs by a deadline.
- **Bound entangled states** (F ≤ ½, PPT) cannot be distilled at all, yet may still be correlated — a trap if you conflate entanglement with distillability.
- **Noise model matters**: protocols optimised for depolarising noise under-perform on coherent errors; twirl first or pick a protocol matched to the channel.

**Rule of thumb:** Distillation trades many noisy Bell pairs for fewer clean ones using only local gates, measurements, and classical chatter; it works only above F = ½, yield drops exponentially as input fidelity worsens, and its real role in a quantum network is refreshing entanglement before each swap in a repeater chain.
