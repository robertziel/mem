### Portfolio Optimization — Markowitz Mean-Variance as QUBO

**Problem:** Pick `k` assets out of `N` candidates (or set weights `w_i`) to minimize expected risk for a target return — **Markowitz mean-variance**:
`min_w  w^T Σ w − q · μ^T w   s.t.  Σ w_i = B, w_i ∈ {0, 1}` (binary selection; continuous weights → use mixed-integer relaxations).

**Quantum formulation:** The binary form is natively a **QUBO**:
`H(x) = q · x^T Σ x − μ^T x + λ · (Σ x_i − B)^2`,
with `Σ` the covariance matrix, `μ` the expected-returns vector, `λ` a Lagrange penalty enforcing the budget. Map to Ising (`x_i = (1 − Z_i)/2`) and solve with **QAOA**, **VQE**, or quantum annealing. Risk-parity variants add a concentration penalty; CVaR-tail-risk objectives replace `w^T Σ w` with a shortfall quantile.

**Expected speedup:** No proven speedup over classical solvers — Markowitz with integer constraints is a quadratic integer program that MILP / branch-and-bound handles well in practice. The realistic angle: *sampling diversity* for near-optimal portfolios, and tail-risk variants where the objective is non-smooth and non-convex.

**Key insight:** Markowitz is not "hard" in the NP-hard sense at production scale — classical solvers close it fast. The quantum narrative works when the formulation goes beyond textbook mean-variance: CVaR / drawdown objectives, cardinality and turnover constraints, multi-period rebalancing with regime switching. Each layer pushes the problem further from convex QP and closer to a genuine combinatorial search, which is the QUBO-native regime.

**Status 2026 (concept-level):** Finance labs at major banks run QAOA on small universes (`N ≤ 100`) as R&D; verified advantages exist in domain X = *structured* QUBOs where parameter transfer and warm-start from classical solutions reduce circuit depth. For production portfolios (`N ~ 10^3–10^4`), classical MILP and interior-point LP dominate. Annealer-based hybrid decomposition (D-Wave Constrained Quadratic Model, Hybrid Solver Service) reaches the thousand-variable range but competes directly with commercial LP/MILP, not against them.

**Time-horizon framing:** near term (NISQ) — QAOA as a tail-risk sampler, transfer-learned from classical warm starts; medium term — constrained-mixer QAOA with shallow fault tolerance for multi-period rebalancing; long term — Grover-type speedups for rare-event sampling (left-tail shock simulation) once logical qubits exist.

**Qiskit-Finance snippet (mean-variance QUBO → QAOA):**
```python
from qiskit_finance.applications.optimization import PortfolioOptimization
from qiskit_optimization.algorithms import MinimumEigenOptimizer
from qiskit_algorithms import QAOA
from qiskit_algorithms.optimizers import COBYLA
from qiskit.primitives import StatevectorSampler
import numpy as np

N, budget = 6, 3
mu = np.random.rand(N) * 0.02                 # expected returns
Sigma = np.cov(np.random.randn(N, 200))       # sample covariance

portfolio = PortfolioOptimization(expected_returns=mu, covariances=Sigma,
                                  risk_factor=0.5, budget=budget)
qp = portfolio.to_quadratic_program()          # QUBO with budget penalty
qaoa = QAOA(sampler=StatevectorSampler(), optimizer=COBYLA(), reps=2)
result = MinimumEigenOptimizer(qaoa).solve(qp)
print("selected:", result.x, "value:", result.fval)
```

**Quantum vs. classical trade-off:**
| Dimension | Classical (MILP / QP) | Quantum (QAOA / VQAs) |
|---|---|---|
| Scalability (N) | 10^3–10^4 routine | 10–100 on hardware today |
| Solution guarantee | optimality gap from solver | heuristic, no bound |
| Tail-risk / non-smooth | exact with reformulation | natural QUBO penalty |
| Multi-portfolio sampling | hard — needs enumeration | shots → diverse samples |
| Warm-start from prior solution | incremental branch-and-bound | parameter concentration, transfer |

**Practical variants:** (i) risk parity — equalize marginal risk contributions, naturally non-linear in weights; (ii) CVaR minimization — replace variance with expected shortfall beyond a quantile; (iii) hierarchical risk parity — cluster assets, solve within clusters; (iv) black-litterman views — Bayesian shrinkage of expected returns. Each is a small perturbation of the QUBO skeleton, and each is a concrete candidate workload for a finance quantum pilot.

**Where QAOA wins its shot:** (a) *multi-period* rebalancing with transaction costs, where the time axis blows up classical MILP state; (b) *combinatorial constraints* (sector caps, liquidity floors, cardinality) stacked on a quadratic objective; (c) *sampling* near-optimal alternative portfolios — useful for robust decision-making under regime uncertainty rather than one-shot optimality. Pure mean-variance with no side constraints is the *wrong* battle to pick.

**Pitfalls:**
- **Covariance estimation** dominates reality: garbage-in from noisy `Σ̂` swamps any solver advantage. Ledoit-Wolf shrinkage, factor models, and rolling-window estimators decide the result more than the solver.
- **Penalty weight `λ`:** too small → budget violated; too large → landscape ill-conditioned. Tune with classical warm-start; penalty-ladder methods (solve for increasing `λ`) help convergence.
- **Discretization of continuous weights** inflates the qubit count: `log_2` encoding per asset for weights, `O(N)` qubits for binary selection, `O(N · b)` for `b`-bit weight precision. This alone caps realistic universe size.
- **Benchmarking trap:** comparing a tiny QAOA run against a full commercial MILP solver tells you about the MILP solver, not the quantum algorithm. Match time budget and warm-start both sides.
- **Transaction costs / turnover penalties** change the QUBO structure — test that your formulation handles them (quadratic in weight changes) before claiming realism.
- **Cardinality constraints** (exactly `k` assets) map to one-hot penalties or Dicke-state mixers; choice drives depth and feasibility.

**Rule of thumb:** Treat portfolio QAOA as an R&D track for *sampling diverse near-optimal portfolios* and tail-risk variants, not a drop-in replacement for MILP — and always benchmark against a warm-started classical solver on the same instance.
