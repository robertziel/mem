### Concatenated Codes — Encode the Encoding

**What it is:** A fault-tolerance construction predating topological codes: take a small `[[n, 1, d]]` base code, then *re-encode each physical qubit of the encoding* with the same code, recursively. After `L` levels of concatenation, you have a `[[n^L, 1, d^L]]` code. This is how Shor, Aharonov–Ben-Or, Knill–Laflamme–Zurek, and Kitaev originally proved the **threshold theorem**.

**Math:** If the base `[[n, 1, d]]` code corrects `t = ⌊(d-1)/2⌋` errors, and each physical gate fails with probability `p`, the logical error probability after one level of concatenation is

`p_L^{(1)} ≈ C · p^(t+1)`

where `C` counts failure patterns. After `L` levels:

`p_L^{(L)} ≈ (C p)^{(t+1)^L} / C`

Below the threshold `p_th = 1/C`, `L` levels of concatenation suppress errors **doubly exponentially** in `L`. This is the threshold theorem: any accuracy achievable with polylog overhead in `1/ε`.

**Canonical base codes used:**

| Code | Parameters | Notes |
|---|---|---|
| Steane `[[7,1,3]]` | Corrects 1 error | Self-dual CSS; transversal Cliffords |
| Shor `[[9,1,3]]` | Corrects 1 error | First QEC code ever (1995) |
| Bacon–Shor `[[9,1,3]]` | Subsystem code | Simpler gauges |
| Golay `[[23,1,7]]` | Corrects 3 errors | Higher distance per level but complex |

**Overhead explosion:**

| Level `L` | Physical qubits (Steane base) | Effective distance |
|---|---|---|
| 1 | 7 | 3 |
| 2 | 49 | 9 |
| 3 | 343 | 27 |
| 4 | 2401 | 81 |
| 5 | 16807 | 243 |

Compare to a distance-25 rotated surface code: ~1250 physical per logical qubit — about 13× more efficient than `L=4` Steane (2401) at comparable effective distance.

**Stim code (Steane memory):**
```python
import stim

# Stim does not natively generate concatenated codes; build by hand
c = stim.Circuit()
# 7 data qubits + 6 ancillas for Steane stabilizers
# Stabilizers: IIIXXXX, IXXIIXX, XIXIXIX and Z duals
for stab in steane_stabilizers():
    c.append("MPP", stab)                       # measure product-Pauli
# For L=2: replace each of 7 "data qubits" with an entire Steane block
# and implement gates transversally between the two layers
```

**When to use:**
- Theoretical proofs (threshold theorem) — the recursive structure is clean.
- Hardware with all-to-all connectivity and high fidelity where code locality doesn't matter (trapped ions, photonics).
- Small magic-state distillation factories (the 15-to-1 Reed–Muller distillation is concatenation-flavored).

**Comparison to topological codes:**

| Aspect | Concatenated | Surface / topological |
|---|---|---|
| Overhead for `d_eff = 25` | ~2400+ qubits | ~1250 qubits |
| Threshold | ~10⁻⁴ (Steane) | ~10⁻² (surface) |
| Locality | Non-local across levels | Strictly 2D nearest-neighbor |
| Transversal gates | Yes (Cliffords for Steane) | No |
| Decoding | Recursive, per-block | Global (MWPM / UF) |

**Pitfalls:**
- Overhead grows *multiplicatively* per level; hits `10⁴` qubits per logical very quickly.
- Non-local gates between distant sub-blocks require long-range connectivity.
- Thresholds are typically an order of magnitude lower than surface codes (~10⁻⁴ vs ~10⁻²) because base codes have weight-6+ stabilizers with complex fault pathways.

**Rule of thumb:** Concatenated codes are how the threshold theorem was proved, but **surface codes won the engineering war** for 2D hardware. Expect concatenation to reappear only in specialized settings (distillation, photonic FT, trapped-ion all-to-all).
