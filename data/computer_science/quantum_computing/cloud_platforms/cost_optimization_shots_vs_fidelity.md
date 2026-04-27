### Cost Optimization — Shots vs Fidelity Trade-off

**What it is:** Given a fixed accuracy target on an expectation value, you can pay for it two ways: **more raw shots** on a noisy QPU, or **fewer shots + error mitigation** (ZNE, PEC, readout mitigation) on the same machine. Which is cheaper depends on the per-shot rate, the overhead factor of the mitigation, and the *variance* introduced by the mitigation itself. Cost without variance context is meaningless.

**Formula — variance-adjusted cost:**
- `shots_needed(ε) = Var[X] / ε²` (CLT / Chebyshev bound)
- `shots_mitig = γ² × Var[X] / ε²` — mitigation multiplies variance by an overhead factor but reduces bias
- `cost = task_fee + shots × per_shot_rate`

For ZNE at 3 noise factors, γ² ≈ 10–30. For PEC on deep circuits, γ² can hit 10³–10⁶ — *drastically* more shots for the same statistical error.

**Example — estimator budget for 10-qubit Hamiltonian, ε=1e-3:**
```python
target_eps  = 1e-3
variance    = 1.0

# Path A: raw shots, bias b ≈ 2e-3 dominates — can't reach 1e-3 at all.
# The ideal shot count is computable but the run is bias-limited.
shots_raw_ideal = variance / target_eps**2       # 1e6 — useless here

# Path B: ZNE, γ² = 12, bias ≈ 1e-4 (well below target)
shots_zne = 12 * variance / target_eps**2        # 1.2e7 shots
cost_zne_ionq = 0.30 + 1.2e7 * 0.03              # ≈ $360 000
cost_zne_rig  = 0.30 + 1.2e7 * 0.00035           # ≈ $4 200
cost_zne_ibm  = 1.2e7 * 6e-6 * 1.60              # ≈ $115

# Path C: readout-only mitigation, γ² ≈ 1.5
shots_ro  = 1.5 * variance / target_eps**2       # 1.5e6 shots
cost_ro_ibm = 1.5e6 * 6e-6 * 1.60                # ≈ $14.40
```
Mitigation trades shots for bias. On trapped-ion at $0.03/shot, ZNE costs ~$100k+. On IBM Runtime, same job is ~$100. Pick the hardware first, then the mitigation.

**Decision tree:**
```
Does raw accuracy reach target ε?
├── Yes (shallow circuit, ε ≫ bias) → raw shots. Don't pay mitigation tax.
└── No (bias > ε target)
     ├── Readout-correctable?         → M-matrix inversion (γ² ≈ 1–2). Cheap. Yes.
     ├── Coherent errors dominate?    → ZNE (γ² ≈ 5–30). Shallow-to-medium OK.
     └── Incoherent errors on depth?  → PEC, check γ². Uneconomic past depth ~50.
```

**Shots required vs circuit depth:**

| Circuit | Raw shots for ε=1e-3 | ZNE (γ²=12) | PEC (γ²=1 000) |
|---|---|---|---|
| Shallow (depth ~10) | 1e6 (often reachable) | 1.2e7 | 1e9 (prohibitive) |
| Medium (depth ~50) | bias-limited | 1.2e7 (OK) | 1e9 |
| Deep (depth ~200) | bias-limited | bias-limited | 1e9 (only hope) |

**When fewer-shots-with-mitigation actually wins:**
- Per-shot rate is *very high* (trapped-ion $0.02–$0.03) AND mitigation γ² is low (≤5). Halving raw shots via readout + Richardson pays for itself.
- You're bias-limited. No raw shot count reaches ε; mitigation is "mitigate or give up."
- Chemical accuracy (~1.6 mHa) on deep ansatz circuits — raw is physically impossible.

**When more-raw-shots wins:**
- Superconducting, shallow circuits, per-shot ≤ $0.001. Double your shot budget for free accuracy; skip mitigation code.
- Time-to-first-result matters more than bias. Submit raw, iterate, mitigate only the final production run.
- Prototyping: mitigation software bugs are common and debugging costs real money.

**Picking a mitigation ceiling for a fixed budget:**
Given budget B and per-shot rate r, `shots_cap = (B − task_fee) / r`. If `γ² × Var / ε² > shots_cap`, loosen ε or change hardware — don't spend $10k chasing a mirage.

**Pitfalls:**
- Quoting ZNE / PEC "variance overhead" from papers assuming different noise models — always measure γ² on your hardware with a calibration circuit.
- Forgetting mitigation *multiplies* shot requirements. Naively enabling ZNE on a budgeted run often overshoots 10×.
- Treating bias as zero after mitigation. Residual bias is typically 1–5 × ε; include it in your error bar.
- Running mitigation sweeps without a raw baseline — you can't tell if mitigation helped or hurt.
- Using the same γ² across circuits. Mitigation overhead depends on depth, noise, and observable.

**Rule of thumb:** First compute the raw-shot cost to hit your ε ignoring bias. If that's under budget *and* bias is small, ship raw. Otherwise budget `γ² × raw_shots × per_shot_rate` for mitigation — and if γ² > 50, change hardware or loosen the target. Don't pay a 50× tax you can avoid with better hardware selection.
