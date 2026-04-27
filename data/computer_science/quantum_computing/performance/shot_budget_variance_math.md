### Shot Budget — Variance Math for Pauli-Weighted Sums

**What it is:**
For any Hamiltonian or observable decomposed into a weighted sum of Pauli strings `H = Σᵢ cᵢ Pᵢ`, the variance of the empirical estimator is a **linear combination of per-term variances**. Optimizing shot allocation across terms minimizes the total shots needed for a target precision. This is the core math behind efficient VQE, QAOA, and observable-estimation runs.

**Setup — the target:**
Given
```
H = Σᵢ cᵢ Pᵢ,      Pᵢ ∈ {Pauli strings, eigenvalues ±1}
```
estimate `⟨H⟩` with `N_i` shots per term. The unbiased estimator:
```
Ĥ = Σᵢ cᵢ · P̂ᵢ,   P̂ᵢ = (1/N_i) Σ_k s_{i,k},  s_{i,k} ∈ {±1}
```

**Variance decomposition (independent measurements):**
```
Var(Ĥ) = Σᵢ cᵢ² · Var(P̂ᵢ) = Σᵢ cᵢ² · (1 − ⟨Pᵢ⟩²) / N_i
```
Worst case: `Var(P̂ᵢ) ≤ 1 / N_i`, so:
```
Var(Ĥ) ≤ Σᵢ cᵢ² / N_i
```
Standard error: `σ(Ĥ) = sqrt(Var(Ĥ))`. To achieve precision `ε`:
```
σ(Ĥ) ≤ ε   ⇔   Σᵢ cᵢ² / N_i ≤ ε²
```

**Optimal (Lagrangian) allocation:**
Minimize `Σᵢ cᵢ² / N_i` under `Σᵢ N_i = N_total`. Lagrangian → `N_i ∝ |cᵢ|`. This gives:
```
N_i^* = N_total · |cᵢ| / Σⱼ |cⱼ|
Var_optimal = (Σᵢ |cᵢ|)² / N_total
N_total* = (Σᵢ |cᵢ|)² / ε²                ← shot budget for precision ε
```
Compare to uniform allocation `N_i = N_total / M`:
```
Var_uniform = M · Σᵢ cᵢ² / N_total
N_total = M · Σᵢ cᵢ² / ε²
```
Ratio (wasted shots from uniform):
```
N_uniform / N_optimal = M · Σ cᵢ² / (Σ|cᵢ|)² ≥ 1  (by Cauchy–Schwarz)
```

**Comparison table — allocation strategies:**
| Strategy | Total shots for precision `ε` | When good |
|---|---|---|
| Uniform | `M · Σcᵢ² / ε²` | Roughly equal `|cᵢ|` |
| **Optimal (weighted)** | `(Σ|cᵢ|)² / ε²` | Asymmetric `cᵢ` |
| QWC grouping | ↓ by #groups ratio | Pauli-commuting measurement |
| Classical shadows | `O(log M / ε²)` per observable | Many observables, low rank |
| Amplitude estimation | `O(1 / ε)` (Heisenberg-limited) | Coherent, fault-tolerant |

**Worked example — H₂ molecule (STO-3G, 4 qubits, ~15 Pauli terms):**
Assume:
```
|cᵢ|: {0.81, 0.17, 0.17, 0.12, 0.17, 0.17, 0.04, 0.04, 0.04, 0.04, 0.12, 0.12, 0.17, 0.17, 0.12}  (Hartrees, illustrative)
Σ |cᵢ| ≈ 2.47
Σ cᵢ²  ≈ 0.86
Target chemical accuracy ε = 1.6 × 10⁻³ Ha.
```
Optimal: `N_total = (2.47)² / (1.6e-3)² ≈ 2.4 × 10⁶ shots`.
Uniform: `N_total = 15 · 0.86 / (1.6e-3)² ≈ 5.0 × 10⁶ shots` (2× worse).
With QWC grouping into ~5 commuting sets: shots further drop ~3×.

**Python — compute budget and allocate:**
```python
import numpy as np

coeffs = np.array([0.81, 0.17, 0.17, 0.12, 0.17, 0.17, 0.04, 0.04,
                   0.04, 0.04, 0.12, 0.12, 0.17, 0.17, 0.12])
eps = 1.6e-3        # chemical accuracy

N_total_optimal = (np.sum(np.abs(coeffs)) / eps) ** 2
N_total_uniform = len(coeffs) * np.sum(coeffs**2) / eps**2

N_i_opt  = N_total_optimal * np.abs(coeffs) / np.abs(coeffs).sum()
print(f"Optimal total shots: {N_total_optimal:.2e}")
print(f"Uniform total shots: {N_total_uniform:.2e}")
print(f"Per-term shots (optimal): {N_i_opt.astype(int)}")
```

**Gradients double the cost:**
Parameter-shift for one parameter: 2 evaluations of `⟨H⟩`. For `P` parameters:
```
N_grad_total ≈ 2 · P · N_total
```
A VQE with 100 parameters and chemical-accuracy target ≈ 5 × 10⁸ shots per optimizer step — cost dominates runtime.

**Pitfalls:**
- `Var(P̂ᵢ) = (1 − ⟨Pᵢ⟩²) / N_i` depends on the unknown `⟨Pᵢ⟩`; iterative/adaptive schemes (Rosalin, shot-frugal) improve on `|cᵢ|`-weighted.
- Correlations between terms (shared measurement bases) break independence — use grouping covariances.
- Precision `ε` refers to the **expectation value**, not the **optimized parameters**; optimizer convergence to `ε` in `⟨H⟩` can still be noisy.
- Readout / coherent errors add bias not captured by variance — mitigation needed alongside shot budgeting.

**Rule of thumb:** Budget `N_total ≈ (Σ|cᵢ|)² / ε²` shots per expectation-value evaluation, allocate `∝ |cᵢ|` across terms, and always group commuting Paulis first — halving `ε` quadruples shots, so tighten precision only as far as the science demands.
