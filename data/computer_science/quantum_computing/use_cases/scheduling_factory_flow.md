### Scheduling — Job-Shop / Flow-Shop as QUBO

**Problem:** Assign `n` jobs to `m` machines respecting precedence, release dates, and non-overlap — minimize makespan, tardiness, or weighted completion time. **Job-shop scheduling (JSS)** is NP-hard; **flow-shop** is a restricted variant where all jobs follow the same machine sequence. Industrial bread-and-butter: semiconductor fabs, airline crew rostering, factory MES.

**Quantum formulation:** Time-indexed binary variable `x_{j,m,t} ∈ {0,1}` = "job `j` starts on machine `m` at time `t`". Objective + penalties → QUBO:
`H = Σ_j C_j · y_j` (completion-time / makespan proxy)
`+ λ_1 Σ_{j,m} (Σ_t x_{j,m,t} − 1)^2` (each operation scheduled once)
`+ λ_2 Σ_{m,t} (Σ_j overlap_{j,m,t} · x_{j,m,t})^2` (no overlap per machine)
`+ λ_3 Σ_{j,j'} precedence_penalty(x)`.
Solve with **QAOA** (possibly constraint-preserving mixers: XY-mixers for one-hot, Dicke mixers for cardinality), VQE on the Ising form, or hybrid annealing.

**Expected speedup:** None proven. Classical MILP (CPLEX, Gurobi) and constraint programming (OR-Tools CP-SAT) solve industrial instances of hundreds of jobs in minutes. The quantum angle: (a) rapid reoptimization under disruptions (sampling neighbors rather than re-solving), (b) constrained-mixer QAOA staying in the feasible subspace, (c) long-term fault-tolerant search with structured speedups.

**Key insight:** Scheduling is a combinatorial problem whose constraint count dominates complexity; the search space is structured by precedence and resource conflicts rather than a smooth objective. QUBO gives a uniform encoding for any constraint mix, at the cost of large penalty-tuned landscapes. The interesting question is not "can QAOA beat CPLEX once" but "can QAOA warm-started from a prior schedule generate good re-plans an order of magnitude faster than re-solving".

**Status 2026 (concept-level):** Verified advantages exist in domain X = small, highly-constrained, frequently-replanned schedules where classical warm-start + QAOA sampling gives diverse near-optimal options faster than re-running MILP from scratch. Long-term promise hinges on fault-tolerant Grover-type speedups for structured combinatorial problems. Annealer demonstrations on realistic semiconductor-fab toy models and flow-shop OR-library instances exist at the hundred-variable scale via hybrid decomposition.

**QUBO formulation snippet (flow-shop makespan):**
```python
from qiskit_optimization import QuadraticProgram
from qiskit_optimization.converters import QuadraticProgramToQubo

processing = [[3, 2], [2, 4], [4, 3]]           # 3 jobs × 2 machines
T = 15                                           # horizon
qp = QuadraticProgram()
for j in range(3):
    for m in range(2):
        for t in range(T):
            qp.binary_var(f"x_{j}_{m}_{t}")

# ... add one-schedule, non-overlap, precedence, makespan terms ...
qubo = QuadraticProgramToQubo().convert(qp)
print("binary vars:", qubo.get_num_binary_vars())
```

**Quantum (QUBO + QAOA) vs. classical MILP:**
| Dimension | MILP / CP-SAT | QAOA / Annealing |
|---|---|---|
| Instance size | 10²–10³ operations routine | ~10¹–10² on hardware |
| Optimality proof | yes (branch-and-bound) | no |
| Warm-start from prior schedule | incremental | seed `γ, β` from solution |
| Disruption / rolling horizon | re-solve | sample neighborhood |
| Constraint expressiveness | native | penalty / custom mixer |
| Multi-criteria (makespan + tardiness + energy) | weighted objective | single QUBO with penalties |

**Domain variants:** job-shop (JSS), flow-shop (FSS), open-shop (OSS), permutation flow-shop, no-wait / no-idle variants, flexible job-shop with alternative routings. QUBO formulations exist for all; difficulty scales with constraint density (flexibility and setup times are the hardest for penalty tuning).

**Hybrid decomposition patterns:** (a) *time-window rolling* — solve QAOA for a short horizon, roll forward, stitch solutions; (b) *machine-cluster decomposition* — partition machines classically, run QAOA per cluster; (c) *branch-and-bound with QAOA as leaf solver* — classical search on the disjunctive graph, QAOA for the remaining binary disjunctions; (d) *Lagrangian relaxation* — dualize coupling constraints, QAOA for the decoupled subproblems. These are where quantum fits inside OR pipelines, not as a replacement.

**Pitfalls:**
- **Time discretization** inflates variable count as `O(n · m · T)` — the horizon `T` is the main knob; choose event-based (precedence-graph) encodings where possible to bypass the time grid.
- **Penalty weights couple**: makespan minimization fights overlap penalties; tune in a classical warm-up phase. Balanced penalty theorems (theoretical bounds for one-hot) give starting points.
- **Constraint preservation:** vanilla `X`-mixer QAOA bleeds probability into infeasible subspace; constraint-preserving mixers (XY, ring, Dicke) cost depth but may be worth it. Quantum Alternating Operator Ansatz is the formal framework.
- **Benchmarks lie** when run against toy classical solvers — always compare to CP-SAT / CPLEX with time budget matched to total wall clock including classical optimizer iterations.
- **Setup times and sequence-dependence** multiply the quadratic term count; test your formulation on OR-library JSS benchmarks, not just synthetic instances.
- **Rolling-horizon replanning** is the sweet spot — warm-start `(γ, β)` from the prior schedule's QAOA parameters for parameter-transfer acceleration.

**Rule of thumb:** Industrial schedulers should treat QAOA as a *neighborhood sampler around a classical incumbent* — good for re-planning under disruption, not for cold-start optimality. Pair with MILP for hard bounds.
