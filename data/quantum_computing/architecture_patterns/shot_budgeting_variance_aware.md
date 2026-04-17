### Shot Budgeting — Variance-Aware Allocation Across Hamiltonian Terms

**Pattern:** For a Hamiltonian `H = sum_i c_i P_i`, do **not** allocate the same number of shots to every term. Allocate shots **proportional to `|c_i|`** (or more precisely `|c_i| * sqrt(Var(P_i))`). This minimizes the variance of the estimated `<H>` for a fixed total shot budget — often cuts required shots by 3–10x versus uniform allocation.

**The math:**
Given independent estimators `E_i` of `<P_i>` with per-shot variance `v_i <= 1` and `s_i` shots,
```
Var(<H>_est) = sum_i c_i^2 * v_i / s_i
```
Minimizing under `sum_i s_i = S_total` gives
```
s_i ∝ |c_i| * sqrt(v_i)     (Lagrangian optimum, "Rosalin" / "VMSA" allocation)
```
Since `v_i <= 1` is unknown ahead of time, the cheap proxy `s_i ∝ |c_i|` (**LS — largest shot**) already captures most of the benefit.

**When to use:**
- VQE / QAOA — any algorithm whose inner loop evaluates a weighted sum of Pauli expectation values.
- Chemistry in molecular orbital basis — coefficient magnitudes span 5+ decades; uniform allocation is wildly wasteful.
- Shot-limited runs (cloud budgets, session-minute quotas).

**Concrete allocation example:**
`H = 1.0 * Z_0 + 0.1 * Z_1 + 0.01 * X_0 X_1` with total budget `S = 11000`:

| Scheme | s_0 | s_1 | s_2 | Var(<H>) (arb.) |
|--------|-----|-----|-----|------------------|
| Uniform | 3667 | 3667 | 3666 | 1.0x |
| `∝ |c_i|` (LS) | 9910 | 991 | 99 | ~0.15x |
| `∝ |c_i| * sqrt(v_i)` (after warmup) | ~9950 | ~970 | ~80 | ~0.10x |

**Algorithm (variance-aware scheduler, "Rosalin"-style):**
```python
def shot_allocation(coeffs, variances, S_total):
    weights = [abs(c) * math.sqrt(v) for c, v in zip(coeffs, variances)]
    Z = sum(weights)
    return [max(1, round(S_total * w / Z)) for w in weights]

# Iteration loop
variances = [1.0] * len(terms)                # init: assume max variance
for step in range(max_iter):
    shots = shot_allocation(coeffs, variances, S_total)
    results = [sampler.run([(c, )], shots=s).result() for c, s in zip(terms, shots)]
    variances = [r.variance for r in results] # update estimate
    energy = sum(c * r.mean for c, r in zip(coeffs, results))
```

**Grouping first:**
Before allocating shots across **terms**, group commuting Paulis into measurement bases (e.g. QWC — qubit-wise commuting — or general-commuting cliques). Shots are spent **per group**, not per term. After grouping, apply variance-aware allocation across the O(N) groups.

**Trade-offs:**
- **Pro:** Near-optimal for free; no QPU-side support required.
- **Con:** Small-coefficient terms get very few shots, so their individual estimates are noisy. This is fine for the weighted sum but misleading if you report per-term values.
- **Con:** `v_i` estimation needs warmup shots per term (typically 100–200). On very small budgets, fall back to `∝ |c_i|`.

**Pitfalls:**
- Allocating proportional to `c_i^2` — wrong: that minimizes **squared** variance, not variance. The correct exponent is 1.
- Rounding all shots to 0 for tiny-coefficient terms — they still contribute bias. Enforce `s_i >= s_min` (e.g. 100).
- Forgetting to re-allocate shots when the ansatz parameters change — mid-VQE, `v_i` drifts.
- Using variance-aware allocation without grouping — you are pre-optimizing the wrong axis. Group first, then allocate.

**Comparison — allocation schemes:**

| Scheme | Info needed | Shot savings (typical chemistry) |
|--------|-------------|----------------------------------|
| Uniform | None | 1x baseline |
| `∝ |c_i|` (LS) | Coefficients | 3–5x |
| `∝ |c_i|*sqrt(v_i)` (Rosalin) | Coefficients + per-term variances | 5–10x |
| Adaptive / bandit (WVS, iQCC) | Online variance + convergence | 8–20x on deep VQE |

**Example:** H2 in STO-3G has 15 Pauli terms with coefficients from 0.01 to 0.7. Uniform allocation at `S=10000` gives `sigma(E) ~ 3e-2 Ha`; LS allocation gives `sigma(E) ~ 8e-3 Ha` — same budget, ~4x tighter energy. Enough to cross chemical accuracy one iteration sooner.

**Rule of thumb:** Never allocate shots uniformly across Hamiltonian terms — `∝ |c_i|` costs zero to implement and saves a factor of 3–10; only add variance-tracking if you are in an inner loop that justifies the warmup cost.
