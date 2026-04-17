### B92 and SARG04 — BB84 Alternatives

**What they are:**
B92 (Bennett 1992) and SARG04 (Scarani-Acín-Ribordy-Gisin 2004) are prepare-and-measure QKD protocols related to BB84. B92 simplifies hardware to just **two non-orthogonal states**; SARG04 uses the same four BB84 states but changes the **sifting and encoding rules** to harden the protocol against photon-number-splitting (PNS) attacks when running with weak coherent pulses.

**B92 — two-state protocol:**
Alice sends one of two non-orthogonal states, e.g. |0⟩ and |+⟩. Bob performs an **unambiguous state discrimination** (USD): his measurement has three outcomes — "definitely |0⟩", "definitely |+⟩", or "inconclusive".
```
Alice bit 0 → |0⟩      Bob: measure in X basis
Alice bit 1 → |+⟩             outcome |−⟩  ⇒ bit was 0 (|0⟩ has ⟨−|0⟩ ≠ 0, |+⟩ does not)
                              outcome |1⟩  ⇒ bit was 1
                              outcome |+⟩ or |0⟩ ⇒ inconclusive, discard
```
Sift = rounds where Bob got a conclusive outcome. Cost: much lower yield than BB84, harder to secure in lossy channels (Eve can mimic loss).

**SARG04 — same states, different sifting:**
Alice sends BB84's four states, encoding bits in the **basis**, not the state within the basis:
```
bit 0 → {|0⟩, |+⟩}       Alice picks one randomly from the pair
bit 1 → {|1⟩, |−⟩}
```
After Bob measures in a random BB84 basis, Alice announces the **pair** (two states, one from each basis) she chose from — not the basis. Bob keeps the round only if his outcome **rules out** one of the two announced candidates, leaving the other as the decoded bit.
```
Alice: bit 0, sent |+⟩
Announce pair: {|0⟩, |+⟩}
Bob measured in Z, outcome |1⟩
    |1⟩ rules out |0⟩ (orthogonal) ⇒ decode as |+⟩ ⇒ bit 0 ✓
Bob measured in Z, outcome |0⟩
    rules out neither ⇒ discard
```
Sift factor ≈ 1/4 (vs BB84's 1/2), but the announcement leaks less to Eve when she tries a PNS attack.

**Comparison:**
| Feature | BB84 | B92 | SARG04 |
|---|---|---|---|
| States | 4 | 2 | 4 (same as BB84) |
| Bases | 2 | 1 (USD) | 2 |
| Sift factor | 1/2 | ≲ 1/4 | 1/4 |
| QBER threshold (asymptotic) | 11.0% | ~6.5% | 9.7% (1-ph) |
| PNS resistance (no decoy) | weak | weak | **moderate** |
| Hardware complexity | baseline | simplest | same as BB84 |
| Loss tolerance | good | poor (Eve fakes loss) | good |
| Needs decoy states? | yes | yes | still helpful, less critical |

**Why SARG04 survives PNS better:**
In a PNS attack on BB84 over a 2-photon pulse, Eve keeps one photon, forwards the other, waits for basis disclosure, then measures deterministically — she learns the bit with certainty. In SARG04, the announcement is a **pair of non-orthogonal states**; even with a stored photon, Eve cannot deterministically distinguish the two. Her residual uncertainty preserves some key even for WCP without decoys — roughly O(η^{3/2}) vs O(η²) for BB84 without decoys.

**Pitfalls:**
- **B92 with loss**: Eve performs USD herself, blocks inconclusive rounds, resends conclusive ones — indistinguishable from channel loss. Requires a **strong reference pulse** or decoy variant to be secure in lossy fiber.
- **SARG04 vs decoy BB84**: with decoy states, BB84 recovers O(η) scaling and beats SARG04; SARG04's advantage is only in the no-decoy regime, which is rarely deployed today.
- **SARG04 sift cost**: 1/4 vs BB84's 1/2 halves raw key rate before error correction.
- **B92 higher QBER threshold**: tighter tolerance to channel noise than BB84.

**When to pick what:**
```
True single-photon source        → BB84 (simplest security proof, highest rate)
WCP source + decoys possible     → BB84 + decoy (standard)
WCP source + decoys impossible   → SARG04 (better PNS scaling)
Minimal hardware, research demo  → B92 (2 states, 1 basis)
Detector-side-channel concern    → neither — use MDI-QKD
```

**Rule of thumb:** B92 trades security for hardware simplicity and is rarely deployed; SARG04 is a historical hedge against PNS that decoy-state BB84 has largely obsoleted — if you can do decoy states, just use BB84.
