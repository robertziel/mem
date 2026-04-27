### Logical Qubit Error Budget — Picking Distance `d`

**What it is:** The quick calculation every FT-hardware roadmap lives or dies by. Given a target logical error `P_L` per cycle (or per whole algorithm) and a measured physical error rate `p`, pick the smallest code distance `d` that keeps you below target. Same formula used by Google, IBM, QuEra, AWS in their published roadmaps.

**Math — surface code below threshold:**

`P_L(d) ≈ A · (p / p_th)^((d+1)/2)`

- `p`: per-gate physical error rate.
- `p_th`: code threshold (~0.01 for surface code under circuit-level depolarizing noise).
- `A`: constant ~0.03–0.1 depending on decoder and noise model.
- `d`: code distance (must be odd for surface code).

The `(d+1)/2` exponent reflects that it takes `⌈d/2⌉` correlated physical errors to cause a logical error. Below threshold (`p < p_th`), every `+2` in distance multiplies suppression by `p/p_th`.

**Worked example: p = 10⁻³, target P_L = 10⁻¹⁰**

Using `A = 0.1`, `p_th = 10⁻²`:

```python
import math
A, p, p_th, target = 0.1, 1e-3, 1e-2, 1e-10
for d in range(3, 40, 2):
    P_L = A * (p / p_th) ** ((d + 1) / 2)
    print(f"d={d:2d}  P_L={P_L:.2e}")
    if P_L <= target:
        print(f"-> pick d = {d}")
        break
```

Output:
```
d= 3  P_L=1.00e-03
d= 5  P_L=1.00e-04
d= 7  P_L=1.00e-05
d= 9  P_L=1.00e-06
d=11  P_L=1.00e-07
d=13  P_L=1.00e-08
d=15  P_L=1.00e-09
d=17  P_L=1.00e-10   <- first to meet target
```

**So d = 17 for P_L = 10⁻¹⁰ at p = 10⁻³.**

Physical-qubit cost (rotated surface code, `~2d²` qubits): `2 × 17² ≈ 578 physical qubits per logical qubit`.

**Quick-reference table (`p_th = 10⁻²`, `A = 0.1`):**

| p | Target `P_L` | Required `d` | Physical qubits / logical |
|---|---|---|---|
| 10⁻³ | 10⁻⁶ | 9 | ~162 |
| 10⁻³ | 10⁻⁹ | 15 | ~450 |
| 10⁻³ | 10⁻¹⁰ | 17 | ~578 |
| 10⁻³ | 10⁻¹² | 21 | ~882 |
| 10⁻³ | 10⁻¹⁵ | 27 | ~1458 |
| 10⁻⁴ | 10⁻¹⁰ | 9 | ~162 |
| 10⁻⁴ | 10⁻¹⁵ | 13 | ~338 |
| 3×10⁻³ | 10⁻¹⁰ | 35 | ~2450 |

**Algorithm budget (not per-cycle):**

If your algorithm has `N_gate` logical gates and runs for `N_cycle` cycles, you need

`P_L · N_gate · N_cycle < ε_total`

For Shor on RSA-2048 (~10⁹ T gates, ~10⁸ cycles per gate), `P_L` per cycle ≈ `10⁻¹⁸` is typical. This pushes `d` well into the 20s–30s at `p = 10⁻³`, giving the quoted `~10⁷` physical-qubit estimates.

**Caveats / hidden costs:**
- The formula is an **approximation**; exact values of `A` and `p_th` vary by decoder, biased-noise assumptions, and circuit-level (not phenomenological) noise. Use Stim + PyMatching simulations to get the real constants for your system.
- T-gate factories add a separate overhead: each T gate costs ~10⁻¹⁰ via magic-state distillation at d=15 or higher → budget them into `P_L · N_T`.
- Overhead grows **non-linearly** near threshold: halving `p` from `10⁻³` → `5×10⁻⁴` cuts required `d` nearly in half, saving ~4× physical qubits. Physical fidelity is worth more than distance.

**Pitfalls:**
- Using `p_th = 1%` when your decoder is union-find (effective `p_th ≈ 0.5%`) underestimates required `d` by several units.
- Ignoring leakage / non-Markovian noise — the exponential formula assumes Markovian independent errors. Real hardware has floors.
- Extrapolating from small-`d` experiments: the `A` constant shrinks at larger `d` as sub-threshold behavior becomes cleaner. Don't linearly extrapolate a d=3→d=5 measurement to d=25.

**Rule of thumb:** Overhead grows quickly near threshold. If your physical `p` is within 3× of `p_th`, you need prohibitively large `d` — invest in better qubits first. Below `p < p_th / 10`, each distance step gives a clean order-of-magnitude in `P_L`, and the budget calculation becomes routine.
