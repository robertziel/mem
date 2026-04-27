### Variational Loop — Classical Optimizer ↔ Quantum Evaluator

**Pattern:** The canonical NISQ-era architecture: a parameterized quantum circuit `U(θ)` is evaluated on a QPU to produce a scalar cost `C(θ)` (typically `⟨ψ(θ)|H|ψ(θ)⟩` or a sampled objective), and a *classical* optimizer updates `θ` in a tight feedback loop. The QPU only prepares and measures states; all `θ`-arithmetic runs on the CPU.

**When to use:**
- Hardware is too shallow / too noisy for unitary-coherent algorithms (Shor, QPE, HHL).
- Objective is expressible as an expectation value of a local Hamiltonian or a sampled bitstring cost.
- You can tolerate heuristic convergence (no provable speedup).

**Loop diagram:**
```
  θ_k ──┐                              ┌── ⟨H⟩_k
        ▼                              ▼
   ┌─────────┐   U(θ_k)|0⟩^n    ┌─────────────┐
   │ CLASSIC │ ───────────────▶ │  QPU eval   │
   │ OPTIM.  │ ◀─────────────── │ (shots, EV) │
   └─────────┘   C(θ_k) + ∇     └─────────────┘
        │
        └─▶ θ_{k+1} = θ_k − η · g_k
```

**Pseudocode:**
```python
theta = init_params()
for k in range(max_iters):
    exp_vals = estimator.run([(ansatz, H, theta)]).result()[0].data.evs
    cost     = float(exp_vals)
    grad     = parameter_shift(ansatz, H, theta)       # or SPSA / finite-diff
    theta    = optimizer.step(theta, cost, grad)       # COBYLA / Adam / L-BFGS-B
    if converged(cost, grad, k): break
```

**Trade-offs:**
| Axis | Variational loop | Coherent-only (QPE, Shor) |
|---|---|---|
| Circuit depth | shallow, repeated | deep, one-shot |
| Classical cost | significant (optim., post-proc) | negligible |
| Noise tolerance | high (heuristic re-runs) | low (must stay coherent) |
| Provable speedup | no | yes (for their problems) |
| Shots per step | `O(M/ε²)` Pauli terms | one |

**Stopping criteria (pick ≥2):**
- Cost delta `|C_k − C_{k−1}| < ε_C` over a window.
- Gradient norm `‖g_k‖ < ε_g` (with finite-shot variance floor).
- Parameter change `‖θ_k − θ_{k−1}‖ < ε_θ`.
- Max wallclock or shot budget exhausted.
- Chemical accuracy hit (e.g. `|E − E_FCI| < 1.6 mHa` for VQE).

**Example — QAOA on a small MaxCut:**
```python
from qiskit.circuit.library import QAOAAnsatz
from scipy.optimize import minimize
ansatz = QAOAAnsatz(cost_hamiltonian=Hc, reps=p)
def obj(x): return estimator.run([(ansatz, Hc, x)]).result()[0].data.evs
res = minimize(obj, x0=[0.1]*(2*p), method="COBYLA", options={"maxiter": 150})
```

**Pitfalls:**
- **Barren plateaus:** randomly initialized deep ansätze have exponentially vanishing gradients — use warm starts or layer-wise training.
- **Noise-biased minima:** hardware drift moves the loss surface between iterations; re-calibrate or use Runtime Sessions to amortize.
- **Shot noise mistaken for signal:** check that cost decrease exceeds `1/√shots` std error before declaring convergence.
- **Optimizer mismatch:** gradient-free (COBYLA, SPSA) for noisy; gradient-based (L-BFGS-B, Adam) for simulator or shadow-estimated gradients.

**Rule of thumb:** Treat the loop as a *stochastic* optimization problem, not a classical one — budget shots per step, pick a noise-aware optimizer (SPSA, COBYLA), and always log `(cost, std_err, grad_norm)` each iteration so you can distinguish real progress from sampling variance.
