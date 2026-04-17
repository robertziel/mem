### Cross-Vendor Budget Math — Unified $/Successful-Result

**What it is:** A single rule-of-thumb metric for comparing cost across Braket, IBM Qiskit Runtime, and Azure Quantum. Raw per-shot prices lie because the three bill differently (per-shot vs per-second vs HQCs), noise levels differ by an order of magnitude, and error mitigation multiplies effective shots. The honest metric is **dollars per successful result** — cost per circuit-run that actually satisfies your target fidelity or accuracy.

**Formula:**
- `$ / successful_result = (shots × per_shot_rate + overhead) / p_success`
- `overhead = task_fee (Braket) or idle_seconds × rate (IBM) + session_startup + calibration_prorate`
- `p_success = probability that a single run meets the target accuracy post-mitigation`

`p_success` is the most overlooked term. A vendor 3× cheaper per shot that succeeds 1/10 as often is 3.3× *more* expensive per result.

**Example — 10-qubit VQE expectation value, ε=1e-3, Var=1:**
```python
target_eps = 1e-3
variance   = 1.0
shots      = variance / target_eps**2       # 1e6 baseline shots

# Braket Rigetti (superconducting, shallow)
cost_A = 0.30 + shots * 0.00035              # $350.30
p_A    = 0.7                                  # shallow, low mitigation
dpr_A  = cost_A / p_A                         # ≈ $500 / success

# Braket IonQ Aria (trapped-ion, no mitigation)
cost_B = 0.30 + shots * 0.03                  # $30 000.30
p_B    = 0.95                                  # high fidelity
dpr_B  = cost_B / p_B                         # ≈ $31 579

# IBM Torino Session (per-second, 5µs/shot)
cost_C = shots * 5e-6 * 1.60                  # $8.00
p_C    = 0.6                                   # needs mitigation for deep
dpr_C  = cost_C / p_C                         # ≈ $13.33  ← winner here
```
For this workload IBM wins by 40× on $/success. Raw per-shot sticker would make Rigetti look 100× cheaper than Aria — misleading until you divide by `p_success`.

**Cross-vendor comparison (illustrative, 1M shots @ ε=1e-3 VQE):**

| Provider | Raw cost | p_success | $/successful result | Best for |
|---|---|---|---|---|
| Braket — Rigetti (SC) | ~$350 | 0.7 | ~$500 | Shallow, many shots |
| Braket — IonQ Aria | ~$30 000 | 0.95 | ~$31 579 | Deep, few shots |
| Braket — Quantinuum H | ~$60 000 | 0.98 | ~$61 224 | Fault-tolerant-class |
| IBM Torino Runtime | ~$8 | 0.6 | ~$13 | Iterative hybrid |
| IBM Torino + ZNE (γ²=12) | ~$100 | 0.92 | ~$109 | Bias-limited |
| Azure IonQ Forte | ~$20 000 | 0.95 | ~$21 053 | Portfolio diversify |
| Azure Quantinuum H2 | ~$80 000 | 0.99 | ~$80 808 | Logical-qubit demos |

All rates illustrative; recompute quarterly.

**Why not compare per-shot rates directly:** the naïve ratio `0.03 / 0.00035 = 85×` says IonQ costs 85× more per shot than Rigetti. But for a depth-50 circuit, Rigetti `p_success` ≈ 0.2 while IonQ ≈ 0.9 — the true cost ratio is `(0.03/0.9) / (0.00035/0.2) ≈ 19×`, a 4× correction. At deeper circuits, `p_success` collapses faster than per-shot price rises, and trapped-ion can become *cheaper* in $/result.

**Session and task overhead — often dominant:** for 200-iter VQE on Braket, `tasks_per_result = 200` → $60 in task fees *per single expectation value*. For IBM session-based runs, add startup (~1–2 s at $1.60/s) + 10–15% calibration prorate. On small budgets, overhead can dwarf shot cost — always include it in `dpr`.

**Decision rule:**
- Compute `dpr` for each candidate provider *at your actual circuit depth and target ε*.
- Pick the provider with the lowest `dpr` *within 2× of the cheapest* — factor in queue risk, SDK familiarity, and data-residency.
- Revisit when circuit depth or ε target changes by >2×. Winners flip.

**Pitfalls:**
- Using `p_success` from a single run — variance on it is huge with <20 samples. Average over ≥50 calibration runs.
- Forgetting `p_success` depends on your accuracy threshold. A "success" at ε=1e-2 isn't one at ε=1e-3.
- Ignoring mitigation overhead in `shots`. With ZNE, multiply shots by γ² before applying the formula.
- Treating Azure abstract units as comparable across providers. Convert everything to USD first.
- Comparing across regions — same hardware can have different per-shot rates in `us-east` vs `eu-west`.

**Rule of thumb:** Never pick a provider on raw per-shot cost alone. Compute `(shots × rate + overhead) / p_success` for each candidate at *your actual circuit depth*; if two are within 2× on this metric, switch based on SDK ergonomics, queue reliability, and data-residency — not the sticker price.
